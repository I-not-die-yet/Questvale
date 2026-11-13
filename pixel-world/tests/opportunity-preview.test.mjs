import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_ITEMS,filterOpportunities} from '../opportunity-preview.mjs';
test('category filters and search combine without changing the supplied data',()=>{
  const before=JSON.stringify(DEMO_ITEMS);
  assert.equal(filterOpportunities(DEMO_ITEMS).length,4);
  assert.deepEqual(filterOpportunities(DEMO_ITEMS,'research').map(i=>i.id),['demo-research']);
  assert.equal(filterOpportunities(DEMO_ITEMS,'research','campus').length,0);
  assert.equal(filterOpportunities(DEMO_ITEMS,'hackathon','CAMPUS').length,1);
  assert.equal(JSON.stringify(DEMO_ITEMS),before);
});
test('search ignores outer whitespace and searches title, category, location and description',()=>{
  assert.equal(filterOpportunities(DEMO_ITEMS,'all','  prototype  ').length,2);
  assert.equal(filterOpportunities(DEMO_ITEMS,'all','business').length,1);
  assert.equal(filterOpportunities(DEMO_ITEMS,'all','online').length,1);
  assert.equal(filterOpportunities(DEMO_ITEMS,'all','hong   research').length,1);
  assert.equal(filterOpportunities(DEMO_ITEMS,'all','   ').length,4);
});
test('no results, empty dataset and unknown categories stay empty',()=>{
  assert.deepEqual(filterOpportunities(DEMO_ITEMS,'all','no-such-opportunity'),[]);
  assert.deepEqual(filterOpportunities([]),[]);
  assert.deepEqual(filterOpportunities(DEMO_ITEMS,'unknown'),[]);
});
