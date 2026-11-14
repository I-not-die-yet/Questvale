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
  assert.equal(items.filter(i=>i.availability.startsWith('Closed')).length,rows.filter(r=>r.status==='closed_historical').length);
});
test('unknown fee and eligibility remain unknown',()=>{
  const item=adaptOpportunities([{...rows[0],fee:{amount:null},eligibilityRawText:null,uncertainty:{fee:true,eligibility:true}}])[0];
  assert.match(item.fee,/Amount not confirmed/);assert.match(item.eligibility,/Not confirmed/);assert.match(item.fee,/Needs confirmation/);assert.doesNotMatch(item.fee,/Free|HKD 0/);
});
test('additional fees and source verification caveats survive conversion',()=>{
  const items=adaptOpportunities(rows),index=rows.findIndex(r=>r.id==='qv-research-hkust-summer-ug-research-2027');
  assert.match(items[index].fee,/17700/);assert.match(items[index].fee,/200/);assert.match(items[0].notes,/403/);assert.match(items[0].evidence,/not been independently rechecked/);
});
test('source links reject executable schemes and embedded credentials',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,hello','https://name:secret@example.com','invalid'])assert.equal(safeSourceUrl(url),null);
  assert.equal(safeSourceUrl('https://example.com/info'),'https://example.com/info');
});
test('invalid or duplicate records reject the dataset',()=>{
  assert.throws(()=>adaptOpportunities({}),TypeError);assert.throws(()=>adaptOpportunities([rows[0],rows[0]]),TypeError);assert.throws(()=>adaptOpportunities([{...rows[0],category:'invalid'}]),TypeError);
});

// Source-backed data corrections reviewed on 14 November 2026; no live source or model calls.
test('HKSI applications are closed; membership application charges are not an entry fee',()=>{
 const row=rows.find(r=>r.id==='qv-biz-hksi-case-competition-2027');
 assert.equal(row.status,'closed_historical');assert.equal(row.dates.deadline,'2026-10-13');
 assert.equal(row.dates.deadlineTimezone,null);assert.equal(row.uncertainty.deadline,true);
 assert.equal(row.fee.amount,null);assert.match(row.fee.note,/HK\$100/);
 assert.match(row.fee.note,/not a confirmed competition entry fee/);
 assert.match(row.sourceUrl,/membership\/outreach\/case-competition/);
 assert.match(adaptOpportunities([row])[0].availability,/Closed/);
});
test('HKUST records eight weeks and conditional tuition rather than an all-in programme fee',()=>{
 const row=rows.find(r=>r.id==='qv-research-hkust-summer-ug-research-2027');
 assert.match(row.description,/8-week/);assert.doesNotMatch(row.description,/10-week/);
 assert.equal(row.fee.amount,'17700');assert.equal(row.uncertainty.fee,true);
 for(const text of ['21,600','39,500','17,900','nominated Exchange Students','not an all-in price'])assert.ok(row.fee.note.includes(text));
 const item=adaptOpportunities([row])[0];assert.match(item.fee,/21,600/);assert.match(item.fee,/Needs confirmation/);
});
test('CBS keeps distinct solo and complete-team deadlines and limits the zero-price claim',()=>{
 const row=rows.find(r=>r.id==='qv-biz-cbs-global-case-competition-2026');
 assert.equal(row.dates.deadline,'2026-11-16');assert.equal(row.dates.deadlineTimezone,'Europe/Copenhagen');
 assert.match(row.shortDescription,/solo sign-up closed/);
 assert.match(row.description,/12 November 2026 at 20:00 CET/);assert.match(row.description,/16 November 2026 at 08:00 CET/);
 assert.equal(row.fee.amount,'0');assert.equal(row.fee.currency,null);assert.equal(row.uncertainty.fee,true);
 assert.match(row.fee.note,/Travel, accommodation/);assert.match(row.eligibilityRawText,/two-year gap/);
});
test('Hult conflicting age dates stay uncertain without resetting the previous source-check timestamp',()=>{
 const row=rows.find(r=>r.id==='qv-startup-hult-prize-2027');
 assert.equal(row.uncertainty.eligibility,true);
 assert.match(row.eligibilityConditions.age,/28 February 2027/);assert.match(row.eligibilityConditions.age,/28 February 2025/);
 assert.equal(row.lastVerifiedAt,'2026-11-14T00:20:00+08:00');
 assert.match(adaptOpportunities([row])[0].eligibility,/Needs confirmation/);
});
test('HKU employer location does not create an unsupported HKU-only applicant restriction',()=>{
 const ids=['qv-research-hku-talic-student-ra-2026-27','qv-research-hku-public-health-student-ra-2026-27','qv-research-hku-ai-agents-student-ra-2026-27'];
 for(const id of ids){const row=rows.find(r=>r.id===id);assert.equal(row.eligibilityConditions.institution,null);
 assert.match(row.organizer,/University of Hong Kong/);assert.match(row.notes,/does not state an HKU-only/);
 assert.equal(row.eligibilityConditions.student,true);assert.match(row.sourceUrl,/jobs\.hku\.hk/);}
});
