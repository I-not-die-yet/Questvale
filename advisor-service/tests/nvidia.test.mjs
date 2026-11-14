import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNvidiaAdapter, NVIDIA_ENDPOINT, NVIDIA_MODEL} from '../src/nvidia-adapter.mjs';
import {extractNvidiaKey, loadNvidiaKey} from '../src/nvidia-credentials.mjs';
import {parseCli} from '../src/server.mjs';
import {HULT, request, start} from './helpers.mjs';

const FAKE_KEY = 'nvapi-TEST_ONLY_NOT_A_REAL_KEY_0000';
const candidate = {opportunityId: HULT, name: 'Hult Prize', category: 'startup', tags: ['SDG']};
const input = {message: 'Show startup opportunities.', context: {}, candidates: [candidate]};
const completion = (selection = {opportunityIds: [HULT]}, changes = {}) => ({
  choices: [{message: {role: 'assistant', content: JSON.stringify(selection)}, finish_reason: 'stop', ...changes}],
  usage: {prompt_tokens: 10, completion_tokens: 5, total_tokens: 15},
});
const adapter = (fetchImpl, extra = {}) => createNvidiaAdapter({apiKey: FAKE_KEY, freeEndpointConfirmed: true, fetchImpl, ...extra});

// Every adapter in this test file uses a local function instead of real fetch.
test('credential parser reads only NVIDIA_API_KEY and never evaluates/imports media variables', () => {
  for (const line of [`NVIDIA_API_KEY=${FAKE_KEY}`, `export NVIDIA_API_KEY="${FAKE_KEY}" # comment`, ` NVIDIA_API_KEY='${FAKE_KEY}'`]) {
    assert.equal(extractNvidiaKey(`OTHER_MEDIA_KEY=ignored\n${line}\nSIDE_EFFECT=$(echo unsafe)`), FAKE_KEY);
  }
  for (const text of ['', 'OTHER_MEDIA_KEY=ignored', 'NVIDIA_API_KEY=', 'NVIDIA_API_KEY=$(echo unsafe)',
    `NVIDIA_API_KEY=${FAKE_KEY}\nNVIDIA_API_KEY=${FAKE_KEY}`, 'NVIDIA_API_KEY="multi\nline"', 'x'.repeat(65537)]) {
    assert.throws(() => extractNvidiaKey(text), error => !error.message.includes(FAKE_KEY) && /could not be loaded/.test(error.message));
  }
});

test('credential environment lookup is exact and errors never echo values or file paths', async () => {
  const env = {NVIDIA_API_KEY: FAKE_KEY, OTHER_MEDIA_KEY: 'do-not-load'};
  assert.equal(await loadNvidiaKey({env}), FAKE_KEY);
  assert.deepEqual(env, {NVIDIA_API_KEY: FAKE_KEY, OTHER_MEDIA_KEY: 'do-not-load'});
  await assert.rejects(loadNvidiaKey({env: {NVIDIA_API_KEY: 'invalid-secret'}}), error => !error.message.includes('invalid-secret'));
  await assert.rejects(loadNvidiaKey({file: '/nonexistent-private-location-for-test'}), error => !error.message.includes('/nonexistent'));
});

test('NVIDIA setup requires free-endpoint consent, valid key and cap of one to five', () => {
  assert.throws(() => createNvidiaAdapter({apiKey: FAKE_KEY}), /confirmation/);
  for (const maxCalls of [0, 6, 1.5, '5']) assert.throws(() => adapter(async () => {}, {maxCalls}));
  assert.throws(() => adapter(async () => {}, {apiKey: 'not-a-valid-credential'}));
});

test('fixed official endpoint/model, no redirects/tools/search/fallback, short non-thinking output', async () => {
  let calls = 0;
  const model = adapter(async (url, options) => {
    calls++; assert.equal(url, NVIDIA_ENDPOINT); assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${FAKE_KEY}`); assert.ok(options.signal instanceof AbortSignal);
    const body = JSON.parse(options.body);
    assert.equal(body.model, NVIDIA_MODEL); assert.equal(body.max_tokens, 256); assert.equal(body.stream, false);
    assert.deepEqual(body.chat_template_kwargs, {enable_thinking: false});
    for (const key of ['tools', 'plugins', 'models', 'response_format']) assert.ok(!(key in body));
    assert.equal(body.messages[0].role, 'system'); assert.match(body.messages[0].content, /untrusted data/);
    assert.deepEqual(JSON.parse(body.messages[1].content), input);
    return new Response(JSON.stringify(completion()));
  });
  assert.deepEqual(await model.select(input), {opportunityIds: [HULT]});
  assert.equal(calls, 1); assert.equal(model.remaining, 4);
  assert.equal(model.lastAttempt.httpStatus, 200); assert.equal(model.lastAttempt.totalTokens, 15);
  assert.doesNotMatch(JSON.stringify(model.lastAttempt), /nvapi|Bearer|Show startup/);
});

test('five-attempt budget is enforced even for simultaneous calls', async () => {
  let calls = 0;
  const model = adapter(async () => { calls++; return new Response(JSON.stringify(completion())); });
  const results = await Promise.allSettled(Array.from({length: 6}, () => model.select(input)));
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 5);
  assert.equal(results.filter(item => item.status === 'rejected').length, 1);
  assert.equal(calls, 5); assert.equal(model.attempts, 5); assert.equal(model.remaining, 0);
});

test('transport/provider failures count as attempts and are never retried or exposed', async () => {
  let calls = 0;
  const model = adapter(async () => { calls++; throw new Error('Authorization secret-provider-detail'); }, {maxCalls: 1});
  await assert.rejects(model.select(input), error => !error.message.includes('secret-provider-detail'));
  await assert.rejects(model.select(input), /budget is exhausted/);
  assert.equal(calls, 1); assert.equal(model.attempts, 1); assert.equal(model.lastAttempt.result, 'failed');
});

test('401/402/429/202/redirect statuses fail without retry, polling or reading error bodies', async () => {
  for (const status of [401, 402, 429, 202, 302]) {
    let calls = 0;
    const model = adapter(async () => { calls++; return new Response('private-provider-error', {status}); });
    await assert.rejects(model.select(input), error => !error.message.includes('private-provider-error'));
    assert.equal(calls, 1); assert.equal(model.lastAttempt.httpStatus, status);
  }
});

test('strict selection rejects prose, extra fields, unknown IDs, duplicates, truncation and tool calls', async () => {
  const bad = [
    completion({opportunityIds: ['invented']}), completion({opportunityIds: [HULT, HULT]}),
    completion({opportunityIds: [HULT], reasons: ['Free']}),
    completion({}, {message: {role: 'assistant', content: '```json\n{}\n```'}}),
    completion({opportunityIds: [HULT]}, {finish_reason: 'length'}),
    completion({}, {message: {role: 'assistant', content: '{}', tool_calls: [{function: {name: 'search'}}]}}),
  ];
  for (const body of bad) {
    const model = adapter(async () => new Response(JSON.stringify(body)));
    await assert.rejects(model.select(input)); assert.equal(model.lastAttempt.result, 'failed');
  }
});

test('input byte cap rejects before a call; response cap and invalid JSON fail safely', async () => {
  let calls = 0;
  const model = adapter(async () => { calls++; return new Response(JSON.stringify(completion())); });
  await assert.rejects(model.select({...input, message: 'x'.repeat(33000)}), /too large/);
  assert.equal(calls, 0); assert.equal(model.attempts, 0);
  for (const body of ['{invalid', JSON.stringify({content: 'x'.repeat(17000)})]) {
    const large = adapter(async () => new Response(body));
    await assert.rejects(large.select(input)); assert.equal(large.attempts, 1);
  }
});

test('cancelled requests do not start calls; active cancellation reaches fetch', async () => {
  const cancelled = new AbortController(); cancelled.abort(); let calls = 0;
  const idle = adapter(async () => { calls++; });
  await assert.rejects(idle.select({...input, signal: cancelled.signal})); assert.equal(calls, 0); assert.equal(idle.attempts, 0);
  const controller = new AbortController(); let enter;
  const entered = new Promise(resolve => { enter = resolve; });
  const active = adapter(async (_, {signal}) => { enter(); return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')), {once: true})); });
  const result = active.select({...input, signal: controller.signal});
  const rejected = assert.rejects(result); await entered; controller.abort(); await rejected;
  assert.equal(active.attempts, 1);
});

test('CLI defaults to disconnected and requires explicit bounded NVIDIA opt-in', () => {
  assert.equal(parseCli(['--data', 'sample.json']).provider, 'none');
  const flags = ['--data', 'sample.json', '--provider', 'nvidia', '--max-model-calls', '5', '--confirm-free-endpoint', 'yes'];
  assert.equal(parseCli(flags).maxCalls, 5);
  for (const args of [
    ['--data', 'x', '--provider', 'nvidia'],
    ['--data', 'x', '--provider', 'openrouter'],
    [...flags, '--provider', 'nvidia'],
    ['--data', 'x', '--nvidia-env', 'x'],
    ['--data', 'x', '--provider', 'nvidia', '--max-model-calls', '6', '--confirm-free-endpoint', 'yes'],
  ]) assert.throws(() => parseCli(args));
});

test('HTTP handler with NVIDIA mock preserves backend qualification and rejects a sixth request', async t => {
  let calls = 0;
  const model = adapter(async () => { calls++; return new Response(JSON.stringify(completion())); });
  const {post} = await start(t, {model});
  for (let index = 0; index < 5; index++) {
    const response = await post(request); assert.equal(response.status, 200);
    assert.equal((await response.json()).recommendations[0].eligibility.status, 'needs_confirmation');
  }
  const exhausted = await post(request); assert.equal(exhausted.status, 503);
  assert.equal(calls, 5);
});
