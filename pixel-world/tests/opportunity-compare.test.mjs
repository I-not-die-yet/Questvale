import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createOpportunityComparison,comparisonFacts,comparisonSources} from '../opportunity-compare.mjs';
import {adaptOpportunities} from '../opportunity-data.mjs';
import {filterOpportunities} from '../opportunity-preview.mjs';
test('two-item cap, removal, replacement and clear do not mutate records',()=>{
 const state=createOpportunityComparison(),a=Object.freeze({id:'a'}),b={id:'b'},c={id:'c'};
 assert.equal(state.toggle(a),true);state.toggle(b);assert.equal(state.toggle(c),false);assert.deepEqual(state.items(),[a,b]);
 state.toggle(a);assert.equal(state.toggle(c),true);assert.deepEqual(state.items(),[b,c]);state.clear();assert.deepEqual(state.items(),[]);
});
test('cross-category comparison survives filtering and sessions are independent',async()=>{
 const rows=adaptOpportunities(JSON.parse(await readFile(new URL('../data/opportunities.json',import.meta.url),'utf8'))),before=JSON.stringify(rows),state=createOpportunityComparison();
 state.toggle(rows[0]);state.toggle(rows.find(r=>r.category!==rows[0].category));filterOpportunities(rows,'research','no match');
 assert.equal(state.items().length,2);assert.notEqual(state.items()[0].category,state.items()[1].category);assert.equal(JSON.stringify(rows),before);assert.deepEqual(createOpportunityComparison().items(),[]);
});
test('unknown fees, eligibility, historical status and source caveats remain explicit',()=>{
 const item=adaptOpportunities([{id:'uncertain',name:'Uncertain',category:'hackathon',status:'closed_historical',uncertainty:{fee:true,eligibility:true},fee:{amount:null},notes:'Secondary source only',lastVerifiedAt:'2026-11-14T00:00:00+08:00'}])[0];
 const facts=Object.fromEntries(comparisonFacts(item));assert.match(facts['Fee and charges'],/not confirmed.*Needs confirmation/i);assert.match(facts['Eligibility (public source)'],/Not confirmed/);assert.match(facts.Availability,/historical/);assert.equal(facts['Source notes'],'Secondary source only');assert.match(facts['Source limitations'],/not been independently rechecked/);assert.equal(facts['Deadline / time zone'],'Not confirmed');
});
test('comparison links reject unsafe or missing sources',()=>{
 assert.deepEqual(comparisonSources({officialUrl:'javascript:alert(1)',sourceUrl:'https://user:pass@example.com'}),[]);
 assert.deepEqual(comparisonSources({}),[]);assert.deepEqual(comparisonSources({sourceUrl:'https://example.com/info'}),[['View recorded source','https://example.com/info']]);
});
