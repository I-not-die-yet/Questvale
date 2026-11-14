import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptOpportunities,safeSourceUrl} from '../opportunity-data.mjs';
import {filterOpportunities} from '../opportunity-preview.mjs';
const rows=JSON.parse(readFileSync(new URL('../data/opportunities.json',import.meta.url),'utf8'));
test('24 records adapt without mutation and populate all four category filters',()=>{
  const before=JSON.stringify(rows),items=adaptOpportunities(rows);
  assert.equal(items.length,24);assert.equal(JSON.stringify(rows),before);
  for(const category of ['hackathon','business','startup','research'])assert.ok(filterOpportunities(items,category).length>0);
  assert.equal(items[0].title,rows[0].name);assert.match(items[0].location,/Hybrid/);
});
test('historical, upcoming and unknown availability are not labelled open',()=>{
  const items=adaptOpportunities(rows);
  for(const status of ['closed_historical','upcoming','unknown']){
    const index=rows.findIndex(r=>r.status===status);assert.ok(index>=0);assert.doesNotMatch(items[index].availability,/Listed as open/);
  }
  assert.equal(items.filter(i=>i.availability.startsWith('Closed')).length,2);
});
test('unknown fee and eligibility remain unknown',()=>{
  const item=adaptOpportunities([{...rows[0],fee:{amount:null},eligibilityRawText:null,uncertainty:{fee:true,eligibility:true}}])[0];
  assert.match(item.fee,/Amount not confirmed/);assert.match(item.eligibility,/Not confirmed/);assert.match(item.fee,/Needs confirmation/);assert.doesNotMatch(item.fee,/Free|HKD 0/);
});
test('additional fees and source verification caveats survive conversion',()=>{
  const items=adaptOpportunities(rows),index=rows.findIndex(r=>r.fee.amount==='17700');
  assert.match(items[index].fee,/17700/);assert.match(items[index].fee,/200/);assert.match(items[0].notes,/403/);assert.match(items[0].evidence,/not been independently rechecked/);
});
test('source links reject executable schemes and embedded credentials',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,hello','https://name:secret@example.com','invalid'])assert.equal(safeSourceUrl(url),null);
  assert.equal(safeSourceUrl('https://example.com/info'),'https://example.com/info');
});
test('invalid or duplicate records reject the dataset',()=>{
  assert.throws(()=>adaptOpportunities({}),TypeError);assert.throws(()=>adaptOpportunities([rows[0],rows[0]]),TypeError);assert.throws(()=>adaptOpportunities([{...rows[0],category:'invalid'}]),TypeError);
});
