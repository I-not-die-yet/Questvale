import {ApiError} from './contract.mjs';

export function positiveInteger(value, name, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new TypeError(`Invalid ${name}`);
  return value;
}

// Sliding 60-second windows, no timers and no automatic retries. Scope is the
// shared instance, not the provider account or other processes using its key.
export function createRateLimiter({max, clock = () => new Date(), makeError = seconds =>
  new ApiError(429, 'RATE_LIMITED', 'Too many advisor requests. Please wait before trying again.', {'Retry-After': String(seconds)})}) {
  positiveInteger(max, 'requests per minute', 10000);
  const buckets = new Map();
  return (key = 'all') => {
    const now = clock().getTime();
    for (const [id, times] of buckets) {
      while (times.length && times[0] <= now - 60000) times.shift();
      if (!times.length) buckets.delete(id);
    }
    const times = buckets.get(key) || [];
    if (times.length >= max) throw makeError(Math.max(1, Math.ceil((times[0] + 60000 - now) / 1000)));
    times.push(now);
    buckets.set(key, times);
  };
}

export function retryAfterSeconds(value, now) {
  let seconds;
  if (typeof value === 'string' && /^\d+$/.test(value)) seconds = Math.min(86400, Number(value));
  else if (typeof value === 'string' && /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) {
    const time = Date.parse(value);
    if (Number.isFinite(time)) seconds = Math.ceil((time - now.getTime()) / 1000);
  }
  // A missing/malformed value uses a local 60-second cooldown. Extremely large
  // provider hints are bounded to one day; this is not a provider quota claim.
  return Number.isFinite(seconds) ? Math.max(1, Math.min(86400, Math.ceil(seconds))) : 60;
}
