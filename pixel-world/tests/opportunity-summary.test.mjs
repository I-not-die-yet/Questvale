import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptOpportunities} from '../opportunity-data.mjs';
import {filterOpportunities} from '../opportunity-preview.mjs';
import {summarizeOpportunities} from '../opportunity-summary.mjs';
const items=adaptOpportunities(JSON.parse(readFileSync(new URL('../data/opportunities.json',import.meta.url),'utf8')));
test('map totals include collected records across four categories and all statuses',()=>{
 const s=summarizeOpportunities(items);assert.equal(s.total,24);assert.deepEqual(s.categories,{hackathon:5,business:6,startup:6,research:7});
 assert.deepEqual(s.statuses,{open:10,closing_soon:4,upcoming:6,closed_historical:3,unknown:1});
});
test('board summary follows the category and search subset without changing data',()=>{
 const before=JSON.stringify(items),subset=filterOpportunities(items,'research','Hong Kong'),s=summarizeOpportunities(subset);
 assert.equal(s.total,subset.length);assert.equal(s.categories.research,subset.length);assert.equal(s.categories.hackathon,0);assert.equal(Object.values(s.statuses).reduce((a,b)=>a+b,0),subset.length);assert.equal(JSON.stringify(items),before);
});
test('empty data stays empty and an unrecognized status never counts as open',()=>{
 assert.equal(summarizeOpportunities([]).total,0);const s=summarizeOpportunities([{category:'hackathon',statusKey:'unverified'}]);assert.equal(s.statuses.unknown,1);assert.equal(s.statuses.open,0);
});
