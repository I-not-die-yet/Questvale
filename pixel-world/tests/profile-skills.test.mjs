import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateProfileSkills,observeProfileSkills} from '../profile-skills.mjs';
import {normalizeProfile} from '../character-sprites.mjs';
import {opportunityNextSteps} from '../opportunity-data.mjs';
function root(){const r=new EventTarget();r.dataset={character:'robot',nickname:'Alex',skills:'[]'};return r;}
test('inline update shares profile storage and refreshes the character-page snapshot',()=>{
 const r=root();let saved=normalizeProfile({character:'robot',nickname:'Alex'}),written;
 observeProfileSkills(r,profile=>{saved=profile;});
 updateProfileSkills(r,['Design','Unknown'],{setItem:(key,value)=>{assert.equal(key,'questvale.profile.v1');written=JSON.parse(value);}});
 assert.deepEqual(saved.skills,['Design']);assert.deepEqual(JSON.parse(r.dataset.skills),saved.skills);assert.deepEqual(written,saved);
 assert.deepEqual(normalizeProfile({...saved,character:'girl'}).skills,['Design']);
 updateProfileSkills(r,[],{setItem:()=>{}});assert.deepEqual(saved.skills,[]);
});
test('unavailable storage preserves session skills and unrelated state',()=>{
 const r=root();r.dataset.query='IoT';r.dataset.room='research';const before={...r.dataset};
 const result=updateProfileSkills(r,['Research'],{setItem:()=>{throw Error('blocked');}});
 assert.equal(result.persisted,false);assert.deepEqual(JSON.parse(r.dataset.skills),['Research']);assert.equal(r.dataset.query,before.query);assert.equal(r.dataset.room,before.room);
});
test('missing or unsafe sources produce instructions without clickable URLs',()=>{
 const steps=opportunityNextSteps({status:'unknown',fee:{amount:null},uncertainty:{eligibility:true},sourceUrl:'javascript:alert(1)'});
 assert.equal(steps.length,3);assert.ok(steps.every(s=>s.url===null&&s.label==='Read source notes below'));
});
test('historical and uncertain records give actionable information links without eligibility judgments',()=>{
 const historical=opportunityNextSteps({status:'closed_historical',sourceUrl:'https://example.com/archive'});
 assert.equal(historical.length,1);assert.match(historical[0].reason,/historical/);assert.equal(historical[0].url,'https://example.com/archive');
 const upcoming=opportunityNextSteps({status:'upcoming',fee:{amount:'0'},eligibilityRawText:'Students',officialUrl:'https://example.com/info'});
 assert.ok(upcoming.some(s=>/when applications actually open/.test(s.reason)));assert.ok(upcoming.every(s=>s.url==='https://example.com/info'));
});
