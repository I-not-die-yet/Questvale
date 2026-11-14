import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ApiError, parseListQuery, validateAdvisorRequest, validateSelection} from '../src/contract.mjs';
import {isDateOnly, isInstant, validateDataset} from '../src/dataset.mjs';
import {rows, HULT, request} from './helpers.mjs';

const rejects = fn => assert.throws(fn, error => error instanceof ApiError && error.status === 400);

test('request accepts explicit camelCase context, optional fields and nulls without inference', () => {
  assert.deepEqual(validateAdvisorRequest({message: '  Year 1 with six hours  '}), {message: 'Year 1 with six hours', context: {}});
  const value = {message: 'Help', context: {studentYear: null, hoursPerWeek: 0, age: null, teamSize: null, isStudent: null, preferredCategories: []}};
  assert.deepEqual(validateAdvisorRequest(value), value);
  assert.deepEqual(validateAdvisorRequest(request), request);
});

test('request rejects missing/blank/long text, coercion, arrays, unknown fields and invalid ranges', () => {
  for (const value of [null, [], {}, {message: ''}, {message: '   '}, {message: 1}, {message: 'a'.repeat(501)},
    {message: 'Hi', context: null}, {message: 'Hi', history: []}, {message: 'Hi', context: {student_year: 1}}]) {
    rejects(() => validateAdvisorRequest(value));
  }
  for (const [field, values] of Object.entries({studentYear: [0, 7, 1.5, '1'], hoursPerWeek: [-1, 169, '6', Infinity],
    age: [-1, 121, 20.5], teamSize: [0, 101, 1.5], isStudent: ['true', 1],
    preferredCategories: ['startup', ['all'], ['startup', 'startup'], [null]]})) {
    for (const value of values) rejects(() => validateAdvisorRequest({message: 'Hi', context: {[field]: value}}));
  }
});

test('UTF-16 input limit matches textarea maxlength semantics', () => {
  assert.equal(validateAdvisorRequest({message: '😀'.repeat(250)}).message.length, 500);
  rejects(() => validateAdvisorRequest({message: '😀'.repeat(251)}));
});

test('list query supports omitted/all/category, rejecting duplicate and deferred filters', () => {
  assert.equal(parseListQuery(new URLSearchParams()), null);
  assert.equal(parseListQuery(new URLSearchParams('category=all')), null);
  assert.equal(parseListQuery(new URLSearchParams('category=research')), 'research');
  for (const query of ['category=', 'category=nope', 'category=all&category=startup', 'teamSize=4']) {
    rejects(() => parseListQuery(new URLSearchParams(query)));
  }
});

test('model selection cannot add IDs, duplicate IDs, extra fields, long lists or fabricated prose', () => {
  const ids = new Set([HULT, 'b', 'c', 'd']);
  assert.deepEqual(validateSelection({opportunityIds: [HULT]}, ids), [HULT]);
  assert.deepEqual(validateSelection({opportunityIds: []}, ids), []);
  for (const value of [null, {}, {opportunityIds: [HULT, HULT]}, {opportunityIds: ['unknown']},
    {opportunityIds: [HULT, 'b', 'c', 'd']}, {opportunityIds: [HULT], message: 'It is free'}, {opportunityIds: [1]}]) {
    assert.throws(() => validateSelection(value, ids), error => error.code === 'ADVISOR_INVALID_RESPONSE');
  }
});

test('imported dataset validates without mutation and retains nested evidence', () => {
  const before = JSON.stringify(rows), copy = validateDataset(rows);
  assert.equal(copy.length, 24);
  assert.equal(JSON.stringify(copy), before);
  assert.ok(Object.isFrozen(copy[0].dates));
  assert.throws(() => { copy[0].name = 'Changed'; }, TypeError);
  assert.equal(JSON.stringify(rows), before);
});

test('invalid dates, types, source links, flags and duplicate IDs fail closed', () => {
  assert.equal(isDateOnly('2026-02-30'), false);
  assert.equal(isDateOnly('2028-02-29'), true);
  assert.equal(isInstant('2026-02-30T12:00:00Z'), false);
  assert.equal(isInstant('2026-11-14T25:00:00Z'), false);
  assert.equal(isInstant('2026-11-14T00:00:00'), false);
  assert.throws(() => validateDataset([rows[0], rows[0]]), TypeError);
  for (const change of [row => { row.fee.amount = 0; }, row => { row.category = 'all'; },
    row => { row.sourceUrl = 'javascript:alert(1)'; }, row => { row.officialUrl = 'https://user:secret@example.com'; },
    row => { row.dates.deadline = '2026-02-30'; }, row => { row.dates.deadlineTimezone = 'Fake/Zone'; },
    row => { row.uncertainty.fee = null; }, row => { row.lastVerifiedAt = 'not a date'; }]) {
    const row = structuredClone(rows[0]); change(row);
    assert.throws(() => validateDataset([row]), TypeError);
  }
});
