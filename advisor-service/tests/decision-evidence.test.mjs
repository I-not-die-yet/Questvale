import {test} from 'node:test';
import assert from 'node:assert/strict';
import {candidateEvidence,decisionReasons} from '../src/decision-evidence.mjs';
import {collectCandidates,buildAdvisorResponse} from '../src/policy.mjs';
import {createNvidiaAdapter} from '../src/nvidia-adapter.mjs';
import {rows,NOW,TECHATHON,start} from './helpers.mjs';
test('server gives selector structured evidence, not just names/tags; all displayed reasons are server-owned',async t=>{
 let received;const model={select:async p=>{received=p;return {opportunityIds:[TECHATHON]};}};
 const {post}=await start(t,{model});const response=await post({message:'Can I join Techathon alone for free? Confirm eligibility.',context:{preferredCategories:['hackathon']}});
 assert.equal(response.status,200);const body=await response.json(),candidate=received.candidates.find(c=>c.opportunityId===TECHATHON),raw=rows.find(r=>r.id===TECHATHON);
 assert.deepEqual(candidate.fee,raw.fee);assert.deepEqual(candidate.dates,raw.dates);assert.equal(candidate.sourceNotes,raw.notes);assert.equal(candidate.uncertainty.eligibility,true);
 const rec=body.recommendations[0];assert.equal(rec.eligibility.status,'needs_confirmation');assert.ok(rec.reasons.some(s=>s.includes('amount not confirmed')));assert.ok(rec.reasons.includes('Source notes: '+raw.notes));assert.ok(body.uncertainties.some(s=>s.includes('Skills and live team recruitment are not assessed')));
});
test('deadline ordering uses confirmed comparable dates only, never guesses across calendar zones',()=>{
 const raw=structuredClone(rows.find(r=>r.id===TECHATHON));raw.uncertainty.deadline=false;raw.dates.deadline='2026-12-01';raw.dates.deadlineTimezone='Asia/Hong_Kong';
 const other=structuredClone(raw);other.id='other';other.dates.deadline='2026-12-15';
 const compare=()=>decisionReasons(raw,[{row:raw},{row:other}]).filter(s=>s.startsWith('Deadline comparison:'));
 assert.match(compare()[0],/earliest/);other.dates.deadlineTimezone='America/New_York';assert.deepEqual(compare(),[]);
 other.dates.deadlineTimezone='Asia/Hong_Kong';other.uncertainty.deadline=true;assert.deepEqual(compare(),[]);
});
test('three tricky requests cannot bypass source uncertainty or historical filtering',()=>{
 const candidates=collectCandidates(rows,{},NOW),ids=new Set(candidates.map(c=>c.row.id));
 for(const row of rows.filter(r=>['unknown','closed_historical'].includes(r.status)))assert.equal(ids.has(row.id),false);
 const tech=candidates.find(c=>c.row.id===TECHATHON),body=buildAdvisorResponse([tech],{hoursPerWeek:4});
 assert.equal(body.recommendations[0].eligibility.status,'needs_confirmation');assert.ok(body.uncertainties.some(s=>s.includes('Weekly time commitment is not checked')));
 assert.ok(!body.recommendations[0].reasons.some(s=>/eligible|best choice|recommended because of your skills/i.test(s)));
});
test('entire current structured candidate payload fits fixed adapter bound and uses fake transport only',async()=>{
 const candidates=collectCandidates(rows,{},NOW).map(candidateEvidence);let bytes;
 const model=createNvidiaAdapter({apiKey:'nvapi-TEST_ONLY_NOT_A_REAL_KEY_123456',freeEndpointConfirmed:true,maxCalls:1,fetchImpl:async(_url,options)=>{
   bytes=Buffer.byteLength(options.body);assert.ok(bytes<=32768);return Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify({opportunityIds:[]})}}]});
 }});
 assert.deepEqual(await model.select({message:'Compare two opportunities for my interests. '+ 'x'.repeat(450),context:{},candidates}),{opportunityIds:[]});assert.ok(bytes>0);
});
