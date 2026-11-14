import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {createModelRunner} from '../src/model-runner.mjs';
import {ApiError} from '../src/contract.mjs';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };

test('no adapter means unavailable, never a canned AI success', async () => {
  const runner = createModelRunner(null);
  assert.equal(runner.configured, false);
  await assert.rejects(runner.run({}), error => error.code === 'ADVISOR_UNAVAILABLE');
});

test('provider errors are sanitized and never automatically retried', async () => {
  let calls = 0;
  const runner = createModelRunner({async select() { calls++; throw new Error('secret-provider-detail'); }});
  await assert.rejects(runner.run({}), error => error.code === 'ADVISOR_UNAVAILABLE' && !error.message.includes('secret'));
  assert.equal(calls, 1);
  assert.equal(runner.activeCount, 0);
});

test('adapter-thrown ApiError and non-Error values cannot bypass error sanitization', async () => {
  for (const value of [new ApiError(400, 'PROVIDER_SECRET', 'secret-provider-detail'), undefined, 'secret']) {
    const runner = createModelRunner({async select() { throw value; }});
    await assert.rejects(runner.run({}), error => error.status === 503 && error.code === 'ADVISOR_UNAVAILABLE' && !error.message.includes('secret'));
  }
});

test('timeout aborts the adapter and preserves its slot if cancellation is ignored', async () => {
  const pending = deferred(); let signal, calls = 0;
  const runner = createModelRunner({select(payload) { calls++; signal = payload.signal; return pending.promise; }}, {timeoutMs: 20, maxConcurrent: 1});
  await assert.rejects(runner.run({}), error => error.code === 'ADVISOR_TIMEOUT');
  assert.equal(signal.aborted, true);
  assert.equal(runner.activeCount, 1);
  await assert.rejects(runner.run({}), error => error.code === 'ADVISOR_BUSY' && error.headers['Retry-After'] === '1');
  assert.equal(calls, 1);
  pending.resolve({opportunityIds: []});
  await pending.promise;
  // The runner adopts this promise before its settlement handler releases the slot.
  await nextTurn();
  assert.equal(runner.activeCount, 0);
});

test('client cancellation aborts a running adapter without starting another request', async () => {
  const pending = deferred(), entered = deferred(), client = new AbortController(); let adapterSignal;
  const runner = createModelRunner({select({signal}) { adapterSignal = signal; entered.resolve(); return pending.promise; }});
  const call = runner.run({}, client.signal);
  await entered.promise;
  client.abort();
  await assert.rejects(call, error => error.code === 'REQUEST_CANCELLED');
  assert.equal(adapterSignal.aborted, true);
  pending.resolve({opportunityIds: []}); await pending.promise;
  await nextTurn();
  assert.equal(runner.activeCount, 0);
});

test('already cancelled clients never enter the adapter', async () => {
  let calls = 0; const client = new AbortController(); client.abort();
  const runner = createModelRunner({select() { calls++; }});
  await assert.rejects(runner.run({}, client.signal), error => error.code === 'REQUEST_CANCELLED');
  assert.equal(calls, 0);
});
