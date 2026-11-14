import {ApiError} from './contract.mjs';

// Only explicitly constructed local control errors cross the model boundary.
// Provider text or arbitrary adapter-thrown ApiError instances remain sanitized.
const controls = new WeakSet();
const DEFINITIONS = {
  MODEL_RATE_LIMITED: [429, 'The local model request rate limit was reached. Please wait before trying again.'],
  PROVIDER_RATE_LIMITED: [429, 'The model provider is rate limiting requests. Please wait before trying again.'],
  EVALUATION_BUDGET_EXHAUSTED: [503, 'The local evaluation call budget is exhausted. An operator must authorize a new budget.'],
  DEMO_BUDGET_EXHAUSTED: [503, 'The configured demonstration call budget is exhausted. An operator must authorize a new budget.'],
};

export function modelControlError(code, retryAfter) {
  if (typeof code !== 'string' || !Object.hasOwn(DEFINITIONS, code)) throw new TypeError('Unknown model control error');
  const definition = DEFINITIONS[code];
  const headers = {};
  if (definition[0] === 429) {
    if (!Number.isSafeInteger(retryAfter) || retryAfter < 1) throw new TypeError('A positive retry delay is required');
    headers['Retry-After'] = String(retryAfter);
  }
  const error = new ApiError(definition[0], code, definition[1], headers);
  controls.add(error);
  return error;
}

export function isModelControlError(error) {
  return controls.has(error);
}
