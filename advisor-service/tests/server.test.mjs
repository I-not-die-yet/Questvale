import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {rows, NOW, HULT, TECHATHON, request, start, mockSelection} from './helpers.mjs';

function rawRequest(base, {body, headers = {}, finish = true, path = '/api/advisor'} = {}) {
  let req;
  const response = new Promise((resolve, reject) => {
    req = httpRequest(base, {method: 'POST', path, headers}, res => {
      let text = ''; res.setEncoding('utf8'); res.on('data', data => { text += data; });
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: JSON.parse(text)}));
    });
    req.on('error', reject);
    if (body) req.write(body);
    if (finish) req.end();
  });
  return {response, get req() { return req; }};
}

test('GET preserves all 24 source rows, nested fees and notes; category filtering is optional', async t => {
  const {base} = await start(t);
  const result = await fetch(base + '/api/opportunities');
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), {opportunities: rows});
  assert.equal(result.headers.get('cache-control'), 'no-store');
  for (const category of ['all', 'hackathon', 'business', 'startup', 'research']) {
    const response = await fetch(base + '/api/opportunities?category=' + category);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.opportunities.length, category === 'all' ? 24 : rows.filter(row => row.category === category).length);
  }
});

test('route/method/query errors use the same safe envelope', async t => {
  const {base} = await start(t);
  for (const [path, init, status] of [
    ['/api/opportunities?category=bad', {}, 400], ['/api/opportunities?studentYear=1', {}, 400],
    ['/api/opportunities?category=all&category=research', {}, 400],
    ['/api/opportunities', {method: 'POST'}, 405], ['/api/advisor', {}, 405], ['/nope', {}, 404],
    ['/api/advisor?extra=1', {method: 'POST'}, 400],
  ]) {
    const response = await fetch(base + path, init), data = await response.json();
    assert.equal(response.status, status);
    assert.deepEqual(Object.keys(data), ['error']);
    assert.deepEqual(Object.keys(data.error), ['code', 'message']);
  }
});

test('malformed absolute request targets are client errors, not internal errors', async t => {
  const {base} = await start(t);
  const response = await rawRequest(base, {path: 'http://[invalid', headers: {'Content-Type': 'application/json'}, body: '{}'}).response;
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_REQUEST');
});

test('unconfigured CLI-equivalent service returns 503 without any model response', async t => {
  const {post} = await start(t);
  const result = await post();
  assert.equal(result.status, 503);
  const body = await result.json();
  assert.equal(body.error.code, 'ADVISOR_UNAVAILABLE');
  assert.ok(!('recommendations' in body));
});

test('test-only model selection succeeds, while metadata and eligibility come from server policy', async t => {
  const model = mockSelection();
  const {post} = await start(t, {model});
  const result = await post(), data = await result.json();
  assert.equal(result.status, 200);
  assert.equal(model.calls.length, 1);
  assert.equal(data.recommendations[0].opportunityId, HULT);
  assert.equal(data.recommendations[0].eligibility.status, 'needs_confirmation');
  assert.deepEqual(data.missingFields, []);
  assert.deepEqual(data.followUpQuestions, []);
  assert.equal(data.recommendations[0].availability.status, 'needs_confirmation');
  assert.ok(model.calls[0].candidates.every(item => rows.some(row => row.id === item.opportunityId && ['open', 'closing_soon'].includes(row.status))));
});

test('missing context is not inferred from free text; request and response remain stable', async t => {
  const model = mockSelection(); const {post} = await start(t, {model});
  const response = await post({message: 'I am 20, Year 1, with 6 hours and a team of three.', context: {preferredCategories: ['startup']}});
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(model.calls[0].context, {preferredCategories: ['startup']});
  assert.deepEqual(data.missingFields, ['teamSize', 'age', 'isStudent']);
  assert.equal(data.recommendations[0].eligibility.status, 'needs_confirmation');
});

test('no model selection and no candidates both return honest empty results', async t => {
  const model = mockSelection([]); const {post} = await start(t, {model});
  const response = await post(), data = await response.json();
  assert.equal(response.status, 200); assert.deepEqual(data.recommendations, []);
  const staleModel = mockSelection();
  const stale = await start(t, {model: staleModel, clock: () => new Date('2030-01-01T00:00:00Z')});
  const staleResponse = await stale.post();
  assert.equal(staleResponse.status, 200);
  assert.deepEqual((await staleResponse.json()).recommendations, []);
  assert.equal(staleModel.calls.length, 0);
});

test('model cannot recommend unknown, historical, filtered or rule-ineligible records', async t => {
  for (const [id, context] of [
    ['invented-id', request.context], ['qv-hack-mlh-ghw-builders-week-2026', {}],
    [TECHATHON, request.context], [HULT, {...request.context, age: 16}],
  ]) {
    const model = mockSelection([id]); const {post} = await start(t, {model});
    const response = await post({message: 'Help', context});
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'ADVISOR_INVALID_RESPONSE');
  }
});

test('model output cannot override fees, reasons or qualification', async t => {
  const model = {async select() { return {opportunityIds: [HULT], eligibility: 'eligible', reasons: ['Free and beginner friendly']}; }};
  const {post} = await start(t, {model});
  const result = await post(); assert.equal(result.status, 503);
  assert.equal((await result.json()).error.code, 'ADVISOR_INVALID_RESPONSE');
});

test('candidate eligibility is rechecked after midnight while the model was running', async t => {
  let now = NOW;
  const model = {async select() { now = new Date('2026-11-17T08:00:00+08:00'); return {opportunityIds: ['qv-biz-cbs-global-case-competition-2026']}; }};
  const {post} = await start(t, {model, clock: () => now});
  const response = await post({message: 'Show business opportunities.', context: {preferredCategories: ['business']}});
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).recommendations, []);
});

test('malformed JSON, blank text, invalid context, wrong media and compression are rejected', async t => {
  const model = mockSelection(); const {post} = await start(t, {model});
  for (const [body, init, status, code] of [
    [null, {body: '{'}, 400, 'INVALID_JSON'],
    [{message: ' '}, {}, 400, 'INVALID_REQUEST'],
    [{message: 'Hi', context: {teamSize: '3'}}, {}, 400, 'INVALID_REQUEST'],
    [request, {headers: {'Content-Type': 'text/plain'}}, 415, 'UNSUPPORTED_MEDIA_TYPE'],
    [request, {headers: {'Content-Type': 'application/json', 'Content-Encoding': 'gzip'}}, 415, 'UNSUPPORTED_ENCODING'],
  ]) {
    const response = await post(body, init);
    assert.equal(response.status, status); assert.equal((await response.json()).error.code, code);
  }
  assert.equal(model.calls.length, 0);
});

test('body limit applies to declared and chunked data; invalid UTF-8 is rejected', async t => {
  const {post, base} = await start(t);
  const oversized = await post(request, {body: JSON.stringify({message: 'x'.repeat(9000)})});
  assert.equal(oversized.status, 413);
  const chunked = await rawRequest(base, {body: Buffer.alloc(9000, 120), headers: {'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked'}}).response;
  assert.equal(chunked.status, 413);
  const invalid = await rawRequest(base, {body: Buffer.from([0xc3, 0x28]), headers: {'Content-Type': 'application/json'}}).response;
  assert.equal(invalid.status, 400); assert.equal(invalid.body.error.code, 'INVALID_JSON');
});

test('slow request body is bounded and returns a safe timeout', async t => {
  const {base} = await start(t, {bodyTimeoutMs: 25});
  const call = rawRequest(base, {body: '{', finish: false, headers: {'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked'}});
  const response = await call.response;
  assert.equal(response.status, 408); assert.equal(response.body.error.code, 'REQUEST_TIMEOUT');
  call.req.destroy();
});

test('rate limit counts direct peers, ignores spoofed forwarding and resets after a minute', async t => {
  let now = NOW; const {post} = await start(t, {requestsPerMinute: 2, clock: () => now});
  assert.equal((await post()).status, 503); assert.equal((await post()).status, 503);
  const response = await post(request, {headers: {'Content-Type': 'application/json', 'X-Forwarded-For': '1.2.3.4'}});
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '60');
  assert.equal((await response.json()).error.code, 'RATE_LIMITED');
  now = new Date(NOW.getTime() + 60000);
  assert.equal((await post()).status, 503);
});

test('Host/Origin checks reject DNS rebinding and other origins without permissive CORS', async t => {
  const {post, base} = await start(t);
  for (const headers of [
    {'Content-Type': 'application/json', Host: 'attacker.example'},
    {'Content-Type': 'application/json', Origin: 'https://attacker.example'},
    {'Content-Type': 'application/json', Origin: 'http://127.0.0.1:4174'},
  ]) {
    // Use raw HTTP: fetch may normalize/replace the Host header itself.
    const response = await rawRequest(base, {body: JSON.stringify(request), headers}).response;
    assert.equal(response.status, 403); assert.equal(response.headers['access-control-allow-origin'], undefined);
  }
  assert.equal((await post(request, {headers: {'Content-Type': 'application/json', Origin: base}})).status, 503);
});

test('HTTP concurrency limit returns 429 without starting another adapter call', async t => {
  let enter, finish, calls = 0;
  const entered = new Promise(resolve => { enter = resolve; });
  const pending = new Promise(resolve => { finish = resolve; });
  const {post} = await start(t, {maxConcurrentModels: 1, model: {select() { calls++; enter(); return pending; }}});
  const first = post(); await entered;
  const busy = await post(); assert.equal(busy.status, 429);
  assert.equal(busy.headers.get('retry-after'), '1'); assert.equal(calls, 1);
  finish({opportunityIds: [HULT]}); assert.equal((await first).status, 200);
});

test('disconnecting the HTTP client aborts the adapter', async t => {
  let enter, markAborted;
  const entered = new Promise(resolve => { enter = resolve; });
  const aborted = new Promise(resolve => { markAborted = resolve; });
  const {post} = await start(t, {model: {select({signal}) {
    enter(); return new Promise(resolve => signal.addEventListener('abort', () => {
      markAborted(); resolve({opportunityIds: []});
    }, {once: true}));
  }}});
  const controller = new AbortController();
  const response = post(request, {signal: controller.signal});
  const rejected = assert.rejects(response, error => error.name === 'AbortError');
  await entered; controller.abort(); await rejected; await aborted;
});

test('interrupted bodies do not crash the service or reach the adapter', async t => {
  const model = mockSelection(); const {base, server} = await start(t, {model});
  const received = new Promise(resolve => server.once('request', resolve));
  const call = rawRequest(base, {body: '{', finish: false, headers: {'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked'}});
  const disconnected = assert.rejects(call.response);
  await received; // Ensure this actually interrupts a server-side body reader.
  call.req.destroy(); await disconnected;
  const alive = await fetch(base + '/api/opportunities');
  assert.equal(alive.status, 200); assert.equal(model.calls.length, 0);
});

test('safe provider errors and model timeouts do not leak internal messages or trigger retry', async t => {
  let calls = 0;
  const failed = await start(t, {model: {async select() { calls++; throw new Error('secret-provider-detail'); }}});
  const response = await failed.post(); assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret-provider-detail|stack|\/Users\//);
  assert.equal(calls, 1);
  const timed = await start(t, {modelTimeoutMs: 20, model: {select: () => new Promise(() => {})}});
  const timeout = await timed.post(); assert.equal(timeout.status, 503);
  assert.equal((await timeout.json()).error.code, 'ADVISOR_TIMEOUT');
});
