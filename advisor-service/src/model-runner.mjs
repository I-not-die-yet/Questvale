import {ApiError, LIMITS} from './contract.mjs';
import {isModelControlError} from './model-controls.mjs';
import {positiveInteger} from './rate-limit.mjs';

export function createModelRunner(model, {
  timeoutMs = LIMITS.modelTimeoutMs,
  maxConcurrent = LIMITS.concurrentModels,
} = {}) {
  positiveInteger(timeoutMs, 'model timeout', 30000);
  positiveInteger(maxConcurrent, 'concurrent models', 1000);
  const active = new Set();
  return {
    get configured() { return typeof model?.select === 'function'; },
    get activeCount() { return active.size; },
    async run(payload, clientSignal) {
      if (typeof model?.select !== 'function') {
        throw new ApiError(503, 'ADVISOR_UNAVAILABLE', 'The AI advisor is not connected. Please try again after it is configured.');
      }
      if (active.size >= maxConcurrent) {
        throw new ApiError(429, 'ADVISOR_BUSY', 'The advisor is busy. Please wait before trying again.', {'Retry-After': '1'});
      }
      if (clientSignal?.aborted) throw new ApiError(499, 'REQUEST_CANCELLED', 'The request was cancelled.');
      const controller = new AbortController();
      let timer, onAbort, interruption;
      const interrupted = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          interruption = new ApiError(503, 'ADVISOR_TIMEOUT', 'The advisor timed out. Please try again later.');
          reject(interruption);
        }, timeoutMs);
        onAbort = () => {
          controller.abort();
          interruption = new ApiError(499, 'REQUEST_CANCELLED', 'The request was cancelled.');
          reject(interruption);
        };
        clientSignal?.addEventListener('abort', onAbort, {once: true});
      });
      // Only an explicitly configured adapter can call a real provider.
      const task = Promise.resolve().then(() => model.select({...payload, signal: controller.signal}));
      active.add(task);
      // An uncooperative timed-out adapter retains its slot until it settles.
      // Releasing it on timeout would permit unlimited abandoned provider calls.
      task.then(() => active.delete(task), () => active.delete(task));
      try {
        return await Promise.race([task, interrupted]);
      } catch (error) {
        if (interruption && error === interruption) throw error;
        if (isModelControlError(error)) throw error;
        throw new ApiError(503, 'ADVISOR_UNAVAILABLE', 'The AI advisor is temporarily unavailable.');
      } finally {
        clearTimeout(timer);
        clientSignal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
