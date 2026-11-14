export const CATEGORIES = Object.freeze(['hackathon', 'business', 'startup', 'research']);
export const LIMITS = Object.freeze({
  messageLength: 500,
  bodyBytes: 8192,
  recommendations: 3,
  requestsPerMinute: 10,
  modelRequestsPerMinute: 20,
  concurrentModels: 2,
  modelTimeoutMs: 10000,
  bodyTimeoutMs: 5000,
  sourceMaxAgeDays: 14,
});

export class ApiError extends Error {
  constructor(status, code, message, headers = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function invalid(message) {
  throw new ApiError(400, 'INVALID_REQUEST', message);
}

function onlyKeys(value, allowed) {
  if (Object.keys(value).some(key => !allowed.includes(key))) invalid('The request contains unsupported fields.');
}

export function validateAdvisorRequest(value) {
  if (!object(value)) invalid('The request must be a JSON object.');
  onlyKeys(value, ['message', 'context']);
  if (typeof value.message !== 'string' || !value.message.trim() || value.message.length > LIMITS.messageLength) {
    invalid('message must contain 1 to 500 UTF-16 code units and must not be blank.');
  }
  const context = value.context === undefined ? {} : value.context;
  if (!object(context)) invalid('context must be an object when provided.');
  onlyKeys(context, ['studentYear', 'hoursPerWeek', 'preferredCategories', 'teamSize', 'age', 'isStudent']);
  const ranges = {
    studentYear: [1, 6, true],
    hoursPerWeek: [0, 168, false],
    teamSize: [1, 100, true],
    age: [0, 120, true],
  };
  for (const [field, [min, max, integer]] of Object.entries(ranges)) {
    const n = context[field];
    if (n === undefined || n === null) continue;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      invalid(`context.${field} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}, or null.`);
    }
  }
  if (context.isStudent !== undefined && context.isStudent !== null && typeof context.isStudent !== 'boolean') {
    invalid('context.isStudent must be a boolean or null.');
  }
  const categories = context.preferredCategories;
  if (categories !== undefined && categories !== null && (
    !Array.isArray(categories) || categories.length > 4 ||
    categories.some(category => !CATEGORIES.includes(category)) || new Set(categories).size !== categories.length
  )) invalid('context.preferredCategories must contain up to four distinct supported categories, or null.');
  // These are explicit user statements, never facts inferred from the message.
  return {message: value.message.trim(), context: structuredClone(context)};
}

export function parseListQuery(searchParams) {
  if ([...searchParams.keys()].some(key => key !== 'category') || searchParams.getAll('category').length > 1) {
    throw new ApiError(400, 'INVALID_QUERY', 'Only one optional category parameter is supported.');
  }
  const category = searchParams.get('category');
  if (category !== null && category !== 'all' && !CATEGORIES.includes(category)) {
    throw new ApiError(400, 'INVALID_QUERY', 'category must be all, hackathon, business, startup or research.');
  }
  return category === 'all' ? null : category;
}

export function validateSelection(value, candidateIds) {
  const invalidOutput = () => {
    throw new ApiError(503, 'ADVISOR_INVALID_RESPONSE', 'The advisor returned an invalid selection. Please try again later.');
  };
  if (!object(value) || Object.keys(value).length !== 1 || !Array.isArray(value.opportunityIds)) invalidOutput();
  const ids = value.opportunityIds;
  if (ids.length > LIMITS.recommendations || new Set(ids).size !== ids.length ||
      ids.some(id => typeof id !== 'string' || !candidateIds.has(id))) invalidOutput();
  return [...ids];
}
