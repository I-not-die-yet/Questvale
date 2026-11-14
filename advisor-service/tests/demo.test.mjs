import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNvidiaAdapter} from '../src/nvidia-adapter.mjs';
import {parseCli, cliRuntimeConfig} from '../src/server.mjs';
import {modelControlError} from '../src/model-controls.mjs';
import {HULT} from './helpers.mjs';

const FAKE_KEY = 'nvapi-TEST_ONLY_NOT_A_REAL_KEY_0000';
const candidate = {opportunityId: HULT, name: 'Hult Prize', category: 'startup', tags: ['SDG']};
const input = {message: 'Show startup opportunities.', context: {}, candidates: [candidate]};
const completion = () => new Response(JSON.stringify({
  choices: [{message: {role: 'assistant', content: JSON.stringify({opportunityIds: [HULT]})}, finish_reason: 'stop'}],
  usage: {prompt_tokens: 10, completion_tokens: 5, total_tokens: 15},
}));

const adapter = (fetchImpl, extra = {}) => createNvidiaAdapter({apiKey: FAKE_KEY, freeEndpointConfirmed: true, fetchImpl, ...extra});

// Demo mode does not cap at five; it uses the explicit finite budget.
test('demo mode sixth request succeeds when budget allows', async () => {
  const model = adapter(completion, {mode: 'demo', maxCalls: 6});
  const results = await Promise.all(Array.from({length: 6}, () => model.select(input)));
  assert.deepEqual(results, Array(6).fill({opportunityIds: [HULT]}));
  assert.equal(model.attempts, 6);
  assert.equal(model.remaining, 0);
});

test('demo mode exhausts at configured finite budget', async () => {
  const model = adapter(completion, {mode: 'demo', maxCalls: 3});
  await model.select(input); await model.select(input); await model.select(input);
  await assert.rejects(model.select(input), {code: 'DEMO_BUDGET_EXHAUSTED', status: 503});
  await assert.rejects(model.select(input), {code: 'DEMO_BUDGET_EXHAUSTED', status: 503});
  assert.equal(model.attempts, 3);
});

test('demo mode rejects zero, negative and unbounded budgets', () => {
  for (const budget of [0, -1, undefined]) {
    assert.throws(() => adapter(completion, {mode: 'demo', maxCalls: budget}));
  }
});

test('evaluation mode remains capped at five even if caller passes a larger budget', () => {
  assert.throws(() => adapter(completion, {mode: 'evaluation', maxCalls: 6}),
    /Invalid total model call budget/);
});

test('provider 429 with Retry-After sets safe control error and local cooldown', async () => {
  let calls = 0;
  const clock = () => new Date('2026-11-14T12:00:00Z');
  const model = adapter(async () => {
    calls++;
    if (calls === 1) return new Response('provider rate limited', {status: 429, headers: {'Retry-After': '5'}});
    return completion();
  }, {clock});
  await assert.rejects(model.select(input), {code: 'PROVIDER_RATE_LIMITED', status: 429});
  assert.equal(model.lastAttempt.httpStatus, 429);
  // Cooldown block is client-specific local protection; next call is still refused.
  await assert.rejects(model.select(input), {code: 'PROVIDER_RATE_LIMITED', status: 429});
  assert.equal(calls, 1);
});

test('provider 429 without Retry-After uses local 60-second cooldown', async () => {
  let calls = 0;
  const clock = () => new Date('2026-11-14T12:00:00Z');
  const model = adapter(async () => {
    calls++; return new Response('provider rate limited', {status: 429});
  }, {clock, mode: 'demo', maxCalls: 10});
  await assert.rejects(model.select(input), {code: 'PROVIDER_RATE_LIMITED', status: 429});
  assert.equal(model.lastAttempt.httpStatus, 429);
  assert.equal(calls, 1);
});

test('aggregate model rate limit rejects sixth request per minute per adapter', async () => {
  let calls = 0;
  const clock = () => new Date('2026-11-14T12:00:00Z');
  const model = adapter(async () => { calls++; return completion(); }, {mode: 'demo', clock, requestsPerMinute: 5, maxCalls: 10});
  await model.select(input); await model.select(input); await model.select(input);
  await model.select(input); await model.select(input);
  await assert.rejects(model.select(input), {code: 'MODEL_RATE_LIMITED', status: 429});
  assert.equal(calls, 5);
});

test('local aggregate rate limit does not consume inference budget', async () => {
  let calls = 0;
  const clock = () => new Date('2026-11-14T12:00:00Z');
  const model = adapter(async () => { calls++; return completion(); }, {clock, requestsPerMinute: 2});
  await model.select(input); await model.select(input);
  await assert.rejects(model.select(input), {code: 'MODEL_RATE_LIMITED', status: 429});
  await assert.rejects(model.select(input), {code: 'MODEL_RATE_LIMITED', status: 429});
  assert.equal(calls, 2);
});

test('CLI evaluation mode requires explicit bounded budget', () => {
  const flags = ['--data', 'sample.json', '--provider', 'nvidia', '--mode', 'evaluation', '--max-model-calls', '5', '--confirm-free-endpoint', 'yes'];
  assert.equal(parseCli(flags).mode, 'evaluation');
  assert.equal(parseCli(flags).maxCalls, 5);
});

test('CLI demo mode requires explicit finite budget', () => {
  const flags = ['--data', 'sample.json', '--provider', 'nvidia', '--mode', 'demo', '--max-model-calls', '10', '--confirm-free-endpoint', 'yes'];
  assert.equal(parseCli(flags).mode, 'demo');
  assert.equal(parseCli(flags).maxCalls, 10);
  for (const args of [
    ['--data', 'x', '--provider', 'nvidia', '--mode', 'demo', '--confirm-free-endpoint', 'yes'],
    ['--data', 'x', '--provider', 'nvidia', '--mode', 'demo', '--max-model-calls', '0', '--confirm-free-endpoint', 'yes'],
    ['--data', 'x', '--provider', 'nvidia', '--mode', 'evaluation', '--max-model-calls', '6', '--confirm-free-endpoint', 'yes'],
  ]) assert.throws(() => parseCli(args));
});

test('cliRuntimeConfig exposes adapter and server controls without credentials', () => {
  const config = cliRuntimeConfig({mode: 'demo', maxCalls: 10, requestsPerMinute: 20, modelRequestsPerMinute: 30, maxConcurrentModels: 2, modelTimeoutMs: 10000});
  assert.deepEqual(config.model, {mode: 'demo', maxCalls: 10, requestsPerMinute: 30, timeoutMs: 10000});
  assert.deepEqual(config.server, {requestsPerMinute: 20, maxConcurrentModels: 2, modelTimeoutMs: 10000});
});

test('control errors survive server error sanitization', () => {
  const error = modelControlError('DEMO_BUDGET_EXHAUSTED');
  assert.equal(error.status, 503);
  assert.equal(error.code, 'DEMO_BUDGET_EXHAUSTED');
  assert.equal(error.message, 'The configured demonstration call budget is exhausted. An operator must authorize a new budget.');
});
