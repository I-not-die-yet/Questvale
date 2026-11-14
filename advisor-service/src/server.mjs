import {candidateEvidence} from './decision-evidence.mjs';
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {ApiError, LIMITS, parseListQuery, validateAdvisorRequest, validateSelection} from './contract.mjs';
import {loadDataset, validateDataset} from './dataset.mjs';
import {buildAdvisorResponse, collectCandidates} from './policy.mjs';
import {createModelRunner} from './model-runner.mjs';
import {loadNvidiaKey} from './nvidia-credentials.mjs';
import {createNvidiaAdapter} from './nvidia-adapter.mjs';
import {positiveInteger} from './rate-limit.mjs';

function json(res, status, payload, headers = {}) {
  if (res.destroyed || res.writableEnded) return;
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function readJson(req, {bodyBytes, bodyTimeoutMs}) {
  const type = req.headers['content-type']?.split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.');
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    throw new ApiError(415, 'UNSUPPORTED_ENCODING', 'Compressed request bodies are not supported.');
  }
  const length = req.headers['content-length'];
  if (length && (!/^\d+$/.test(length) || Number(length) > bodyBytes)) {
    throw new ApiError(413, 'REQUEST_TOO_LARGE', 'The request body exceeds the 8192-byte limit.');
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    const cleanup = () => {
      clearTimeout(timer);
      req.removeListener('data', data);
      req.removeListener('end', end);
      req.removeListener('aborted', aborted);
      req.removeListener('error', aborted);
    };
    const fail = error => { cleanup(); chunks.length = 0; req.resume(); reject(error); };
    const data = chunk => {
      size += chunk.length;
      if (size > bodyBytes) return fail(new ApiError(413, 'REQUEST_TOO_LARGE', 'The request body exceeds the 8192-byte limit.'));
      chunks.push(chunk);
    };
    const end = () => {
      cleanup();
      try {
        const raw = new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks));
        resolve(JSON.parse(raw));
      } catch { reject(new ApiError(400, 'INVALID_JSON', 'The request must contain valid UTF-8 JSON.')); }
    };
    const aborted = () => fail(new ApiError(400, 'REQUEST_ABORTED', 'The request body was interrupted.'));
    const timer = setTimeout(() => fail(new ApiError(408, 'REQUEST_TIMEOUT', 'The request body took too long to arrive.')), bodyTimeoutMs);
    req.on('data', data);
    req.once('end', end);
    req.once('aborted', aborted);
    req.once('error', aborted);
  });
}

function createLimiter(max, clock) {
  positiveInteger(max, 'API requests per minute', 10000);
  const buckets = new Map();
  return client => {
    const time = clock().getTime();
    for (const [key, bucket] of buckets) if (time >= bucket.resetAt) buckets.delete(key);
    let bucket = buckets.get(client);
    if (!bucket) {
      bucket = {count: 0, resetAt: time + 60000};
      buckets.set(client, bucket);
    }
    if (bucket.count >= max) {
      const seconds = Math.max(1, Math.ceil((bucket.resetAt - time) / 1000));
      throw new ApiError(429, 'RATE_LIMITED', 'Too many advisor requests. Please wait before trying again.', {'Retry-After': String(seconds)});
    }
    bucket.count++;
  };
}

export function createAdvisorServer({rows, model = null, clock = () => new Date(),
  requestsPerMinute = LIMITS.requestsPerMinute, modelTimeoutMs = LIMITS.modelTimeoutMs,
  maxConcurrentModels = LIMITS.concurrentModels, bodyTimeoutMs = LIMITS.bodyTimeoutMs} = {}) {
  const dataset = validateDataset(rows);
  const runner = createModelRunner(model, {timeoutMs: modelTimeoutMs, maxConcurrent: maxConcurrentModels});
  const limit = createLimiter(requestsPerMinute, clock);
  const server = createServer(async (req, res) => {
    try {
      const port = server.address().port;
      const host = req.headers.host;
      // Loopback binding plus Host/Origin validation prevents browser DNS rebinding
      // and cross-origin POSTs. This is a local boundary, not production auth.
      if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) {
        throw new ApiError(403, 'HOST_NOT_ALLOWED', 'This local service does not accept that host.');
      }
      const origin = `http://${host}`;
      if (req.headers.origin !== undefined && req.headers.origin !== origin) {
        throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Cross-origin requests are not enabled.');
      }
      let url;
      try { url = new URL(req.url, origin); }
      catch { throw new ApiError(400, 'INVALID_REQUEST', 'The request target is invalid.'); }
      if (url.origin !== origin) throw new ApiError(400, 'INVALID_REQUEST', 'The request target is invalid.');
      if (url.pathname === '/api/opportunities') {
        if (req.method !== 'GET') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use GET for this endpoint.', {Allow: 'GET'});
        const category = parseListQuery(url.searchParams);
        json(res, 200, {opportunities: category ? dataset.filter(row => row.category === category) : dataset});
        return;
      }
      if (url.pathname !== '/api/advisor') throw new ApiError(404, 'NOT_FOUND', 'The requested endpoint does not exist.');
      if (req.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.', {Allow: 'POST'});
      if (url.search) throw new ApiError(400, 'INVALID_QUERY', 'The advisor endpoint does not accept query parameters.');
      // Trust only the direct socket peer, never client-supplied forwarded headers.
      limit(req.socket.remoteAddress);
      const request = validateAdvisorRequest(await readJson(req, {bodyBytes: LIMITS.bodyBytes, bodyTimeoutMs}));
      if (!runner.configured) throw new ApiError(503, 'ADVISOR_UNAVAILABLE', 'The AI advisor is not connected. Please try again after it is configured.');
      const now = clock();
      const candidates = collectCandidates(dataset, request.context, now);
      if (!candidates.length) { json(res, 200, buildAdvisorResponse([], request.context)); return; }
      const cancellation = new AbortController();
      const abort = () => cancellation.abort();
      req.once('aborted', abort);
      res.once('close', abort);
      try {
        const output = await runner.run({
          message: request.message,
          context: structuredClone(request.context),
          candidates: candidates.map(candidateEvidence),
        }, cancellation.signal);
        const ids = validateSelection(output, new Set(candidates.map(({row}) => row.id)));
        // Recheck time-dependent policy after the model returns (e.g. midnight).
        const current = new Map(collectCandidates(dataset, request.context, clock()).map(candidate => [candidate.row.id, candidate]));
        const selected = ids.flatMap(id => current.has(id) ? [current.get(id)] : []);
        json(res, 200, buildAdvisorResponse(selected, request.context));
      } finally {
        req.removeListener('aborted', abort);
        res.removeListener('close', abort);
      }
    } catch (error) {
      const safe = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'The request could not be completed.');
      // Close errors early without buffering/draining an unbounded request body.
      res.setHeader('Connection', 'close');
      json(res, safe.status, {error: {code: safe.code, message: safe.message}}, safe.headers);
      req.resume();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 1000;
  server.maxRequestsPerSocket = 100;
  // Never log request text, profile fields, provider errors or credentials.
  return server;
}

export function parseCli(args) {
  const options = {port: 4185};
  const supported = ['--data', '--port', '--provider', '--nvidia-env', '--max-model-calls', '--confirm-free-endpoint',
    '--mode', '--api-requests-per-minute', '--model-requests-per-minute', '--max-concurrent-models', '--model-timeout-ms'];
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index], value = args[index + 1];
    if (!supported.includes(key) || value === undefined || options[key] !== undefined) throw new Error('Invalid arguments');
    options[key] = value;
  }
  if (!options['--data']) throw new Error('Missing --data');
  if (options['--port'] !== undefined) {
    if (!/^\d+$/.test(options['--port'])) throw new Error('Invalid --port');
    options.port = Number(options['--port']);
  }
  if (options.port < 1 || options.port > 65535) throw new Error('Invalid --port');
  const numberOption = (flag, fallback, max) => {
    const raw = options[flag];
    if (raw === undefined) return fallback;
    if (!/^\d+$/.test(raw)) throw new TypeError(`Invalid ${flag}`);
    return positiveInteger(Number(raw), flag, max);
  };
  options.requestsPerMinute = numberOption('--api-requests-per-minute', LIMITS.requestsPerMinute, 10000);
  options.modelRequestsPerMinute = numberOption('--model-requests-per-minute', LIMITS.modelRequestsPerMinute, 10000);
  options.maxConcurrentModels = numberOption('--max-concurrent-models', LIMITS.concurrentModels, 1000);
  options.modelTimeoutMs = numberOption('--model-timeout-ms', LIMITS.modelTimeoutMs, 30000);
  options.provider = options['--provider'] ?? 'none';
  options.mode = options['--mode'] ?? 'evaluation';
  if (!['none', 'nvidia'].includes(options.provider)) throw new Error('Unsupported provider');
  if (!['evaluation', 'demo'].includes(options.mode)) throw new TypeError('Unsupported model mode');
  if (options.provider === 'nvidia') {
    if (options['--confirm-free-endpoint'] !== 'yes' || options['--max-model-calls'] === undefined) {
      throw new Error('NVIDIA mode requires free-endpoint confirmation and an explicit local call budget.');
    }
    options.maxCalls = numberOption('--max-model-calls', undefined, options.mode === 'evaluation' ? 5 : Number.MAX_SAFE_INTEGER);
  } else if (['--nvidia-env', '--max-model-calls', '--confirm-free-endpoint', '--mode', '--model-requests-per-minute'].some(key => options[key] !== undefined)) {
    throw new Error('NVIDIA options require the nvidia provider.');
  }
  return options;
}

// Pure mapping: test CLI wiring without loading credentials or making requests.
export function cliRuntimeConfig(options) {
  return {
    model: {mode: options.mode, maxCalls: options.maxCalls, requestsPerMinute: options.modelRequestsPerMinute,
      timeoutMs: options.modelTimeoutMs},
    server: {requestsPerMinute: options.requestsPerMinute, maxConcurrentModels: options.maxConcurrentModels,
      modelTimeoutMs: options.modelTimeoutMs},
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseCli(process.argv.slice(2));
    const rows = await loadDataset(options['--data']);
    const config = cliRuntimeConfig(options);
    const model = options.provider === 'nvidia' ? createNvidiaAdapter({
      ...config.model,
      apiKey: await loadNvidiaKey({file: options['--nvidia-env']}),
      freeEndpointConfirmed: true,
    }) : null;
    const server = createAdvisorServer({rows, model, ...config.server});
    server.on('error', () => { console.error('The local Advisor server could not bind to its port.'); process.exitCode = 1; });
    server.listen(options.port, '127.0.0.1', () => {
      const mode = model ? `NVIDIA evaluation: at most ${options.maxCalls} attempts; no search or fallback` : 'AI not connected; no provider calls';
      console.log(`Questvale local API: http://127.0.0.1:${options.port} (${mode})`);
    });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
      server.close();
      server.closeAllConnections();
    });
  } catch {
    console.error('Could not start. Check --data, --port and provider options. NVIDIA mode requires --confirm-free-endpoint yes, --max-model-calls 1-5 and a valid server-side credential.');
    process.exitCode = 1;
  }
}
