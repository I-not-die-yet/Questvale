import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sortOpportunities,sortTeams} from '../list-sorting.mjs';
import {adaptOpportunities} from '../opportunity-data.mjs';
const now=new Date('2026-11-14T03:00:00Z');
const event=(id,date,extra={})=>({id,statusKey:'open',deadlineDate:date,deadlineTimezone:'Asia/Hong_Kong',deadlineUncertain:false,...extra});
test('soonest recorded date first, unknowns after known dates, historical/past records last',()=>{
 const rows=[event('later','2026-12-20'),event('missing',null),event('soon','2026-11-15'),event('past','2026-11-13'),event('historical','2027-01-01',{statusKey:'closed_historical'}),event('uncertain','2026-11-14',{deadlineUncertain:true}),event('unknown','2026-11-14',{statusKey:'unknown'})];
 assert.deepEqual(sortOpportunities(rows,'deadline',now).map(r=>r.id),['soon','later','missing','uncertain','unknown','past','historical']);
 assert.equal(rows[0].id,'later');assert.deepEqual(sortOpportunities(rows),rows);
});
test('calendar-day expiry respects recorded time zone, invalid dates/time zones are not guessed',()=>{
 const rows=[event('invalid','2026-02-30'),event('no-zone','2026-12-01',{deadlineTimezone:null}),event('ny-today','2026-11-13',{deadlineTimezone:'America/New_York'}),event('hk-past','2026-11-13')];
 assert.deepEqual(sortOpportunities(rows,'deadline',now).map(r=>r.id),['ny-today','invalid','no-zone','hk-past']);
});
test('sorting uses structured fields rather than parsing rendered disclaimer text',()=>{
 const rows=adaptOpportunities([{id:'x',name:'X',category:'research',status:'open',dates:{deadline:'2026-11-15',deadlineTimezone:'Asia/Hong_Kong'},uncertainty:{deadline:true}}]);
 assert.equal(rows[0].deadlineDate,'2026-11-15');assert.equal(rows[0].deadlineUncertain,true);
 const other=event('confirmed','2026-12-01');assert.deepEqual(sortOpportunities([...rows,other],'deadline',now).map(r=>r.id),['confirmed','x']);
});
test('team slot sorting leaves full teams last, preserves ties and never mutates membership',()=>{
 const team=(id,n)=>({id,capacity:4,members:Array.from({length:4-n},(_,i)=>({id:String(i)}))});
 const rows=[team('two',2),team('full',0),team('three',3),team('one',1),team('tie',2)],before=JSON.stringify(rows);
 assert.deepEqual(sortTeams(rows,'slots-most').map(r=>r.id),['three','two','tie','one','full']);
 assert.deepEqual(sortTeams(rows,'slots-fewest').map(r=>r.id),['one','two','tie','three','full']);
 assert.deepEqual(sortTeams(rows),rows);assert.equal(JSON.stringify(rows),before);
});
