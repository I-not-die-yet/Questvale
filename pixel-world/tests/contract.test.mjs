import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, REGIONS, regionState, selectionSummary, validateProps } from '../contract.mjs';

const props = (overrides = {}) => ({ activeRegion: null, highlightedRegions: [], onRegionSelect() {}, ...overrides });

test('the contract has exactly the four agreed categories', () => {
  assert.deepEqual(CATEGORIES, ['hackathon', 'business', 'startup', 'research']);
  assert.equal(new Set(REGIONS.map((region) => region.category)).size, 4);
  assert.ok(Object.isFrozen(CATEGORIES));
});
test('every category and null are valid controlled selections', () => {
  for (const category of [...CATEGORIES, null]) assert.doesNotThrow(() => validateProps(props({ activeRegion: category })));
});
test('empty, single, multiple and all recommendations are valid', () => {
  for (const list of [[], ['startup'], ['hackathon', 'research'], [...CATEGORIES]]) {
    assert.doesNotThrow(() => validateProps(props({ highlightedRegions: list })));
  }
});
test('selection and recommendations are independent', () => {
  const state = props({ activeRegion: 'hackathon', highlightedRegions: ['hackathon', 'research'] });
  assert.deepEqual(regionState(state, 'hackathon'), { selected: true, recommended: true });
  assert.deepEqual(regionState(state, 'research'), { selected: false, recommended: true });
  assert.deepEqual(regionState(state, 'business'), { selected: false, recommended: false });
});
test('clearing selection preserves recommendations', () => {
  assert.deepEqual(regionState(props({ highlightedRegions: ['research'] }), 'research'), { selected: false, recommended: true });
});
test('duplicate recommendations do not produce duplicate summary labels', () => {
  assert.equal(selectionSummary(props({ highlightedRegions: ['startup', 'startup'] })), 'Selected: All categories. Recommended: Startup.');
});
test('invalid category is rejected instead of silently changing the contract', () => {
  for (const category of ['scholarship', '', undefined, 3]) assert.throws(() => validateProps(props({ activeRegion: category })), TypeError);
});
test('invalid recommendation input and missing callbacks are rejected', () => {
  for (const list of [null, undefined, 'hackathon', ['unknown']]) assert.throws(() => validateProps(props({ highlightedRegions: list })), TypeError);
  assert.throws(() => validateProps(props({ onRegionSelect: null })), TypeError);
});
test('reading state never mutates or writes to the supplied object', () => {
  const state = Object.freeze(props({ highlightedRegions: Object.freeze(['research']) }));
  validateProps(state); regionState(state, 'research'); selectionSummary(state);
  assert.equal(state.activeRegion, null);
  assert.deepEqual(state.highlightedRegions, ['research']);
});
test('summary reports an empty state and selected/recommended overlap explicitly', () => {
  assert.equal(selectionSummary(props()), 'Selected: All categories. Recommended: None.');
  assert.equal(selectionSummary(props({ activeRegion: 'research', highlightedRegions: ['research'] })), 'Selected: Research. Recommended: Research.');
});
