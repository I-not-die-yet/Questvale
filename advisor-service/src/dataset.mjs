import {readFile, stat} from 'node:fs/promises';
import {CATEGORIES, object} from './contract.mjs';

const STATUSES = ['open', 'closing_soon', 'upcoming', 'closed_historical', 'unknown'];
const SOURCES = ['official', 'agent_search', 'community'];
const MAX_BYTES = 2 * 1024 * 1024;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export function isDateOnly(value) {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function isInstant(value) {
  return typeof value === 'string' && INSTANT.test(value) && isDateOnly(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value)) && Number(value.slice(11, 13)) < 24 &&
    Number(value.slice(14, 16)) < 60 && Number(value.slice(17, 19)) < 60;
}

export function validTimeZone(zone) {
  if (typeof zone !== 'string' || zone.length > 100) return false;
  try { new Intl.DateTimeFormat('en', {timeZone: zone}); return true; } catch { return false; }
}

export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export function validateDataset(rows) {
  const fail = () => { throw new TypeError('Invalid opportunity dataset'); };
  if (!Array.isArray(rows) || rows.length > 1000) fail();
  const ids = new Set();
  const text = (value, nullable = false) => (nullable && (value === null || value === undefined)) ||
    (typeof value === 'string' && value.length <= 20000);
  for (const row of rows) {
    if (!object(row) || typeof row.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(row.id) || ids.has(row.id)) fail();
    ids.add(row.id);
    if (!CATEGORIES.includes(row.category) || !STATUSES.includes(row.status) || !SOURCES.includes(row.dataSource)) fail();
    for (const field of ['name', 'organizer', 'shortDescription', 'description', 'eligibilityRawText']) {
      if (!text(row[field]) || !row[field].trim()) fail();
    }
    if (!text(row.notes, true) || !isInstant(row.lastVerifiedAt) || !safeSourceUrl(row.officialUrl) || !safeSourceUrl(row.sourceUrl)) fail();
    if (!object(row.location) || !['online', 'offline', 'hybrid'].includes(row.location.type) ||
        !text(row.location.place) || !text(row.location.region, true)) fail();
    if (!object(row.dates)) fail();
    for (const field of ['deadline', 'eventStart', 'eventEnd']) {
      const value = row.dates[field];
      if (value !== undefined && value !== null && !isDateOnly(value) && !isInstant(value)) fail();
    }
    if (row.dates.deadlineTimezone != null && !validTimeZone(row.dates.deadlineTimezone)) fail();
    if (!object(row.fee) || !text(row.fee.currency, true) || !text(row.fee.note, true) ||
        (row.fee.amount != null && (typeof row.fee.amount !== 'string' || !/^\d+(?:\.\d+)?$/.test(row.fee.amount)))) fail();
    if (!object(row.uncertainty) || ['deadline', 'eligibility', 'fee', 'availability'].some(key => typeof row.uncertainty[key] !== 'boolean')) fail();
    if (!object(row.eligibilityConditions)) fail();
    for (const field of ['yearOrGrade', 'teamSize', 'institution', 'age', 'other', 'notes']) {
      if (!text(row.eligibilityConditions[field], true)) fail();
    }
    if (row.eligibilityConditions.student != null && typeof row.eligibilityConditions.student !== 'boolean') fail();
    if (row.tags !== undefined && (!Array.isArray(row.tags) || row.tags.length > 100 || row.tags.some(tag => !text(tag)))) fail();
  }
  // Freeze a clone, never mutate the user's data or a caller's fixture.
  return freeze(structuredClone(rows));
}

export async function loadDataset(file) {
  if ((await stat(file)).size > MAX_BYTES) throw new TypeError('Dataset exceeds local size limit');
  const bytes = await readFile(file);
  if (bytes.length > MAX_BYTES) throw new TypeError('Dataset exceeds local size limit');
  return validateDataset(JSON.parse(bytes.toString('utf8')));
}
