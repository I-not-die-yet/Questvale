import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTeamChatPoller} from '../team-chat-poller.mjs';
function harness(request){
  const tasks=[],rows=[],errors=[];
  const chat=createTeamChatPoller({request,alive:()=>true,after:()=>null,onRows:value=>rows.push(value),onError:(...value)=>errors.push(value),schedule:fn=>{tasks.push(fn);return fn;},cancel:fn=>{const i=tasks.indexOf(fn);if(i>=0)tasks.splice(i,1);}});
  return {chat,tasks,rows,errors};
}
test('late previous-team response is discarded and new chat resumes without overlapping polls',async()=>{
  const pending=[];const h=harness(path=>new Promise(resolve=>pending.push({path,resolve})));
  const first=h.chat.start('A');const visit=h.chat.capture();await h.chat.start('B');await h.chat.poll();
  assert.equal(pending.length,1);assert.equal(visit.valid(),false);
  pending[0].resolve({messages:[{id:1,body:'A'}]});await first;assert.equal(h.rows.length,0);
  const second=h.tasks.shift()();assert.equal(pending[1].path,'/B/messages');
  pending[1].resolve({messages:[{id:2,body:'B'}]});await second;assert.equal(h.rows[0][0].body,'B');h.chat.stop();assert.equal(h.tasks.length,0);
});
test('closed chat ignores late failures and invalidates send/history callbacks',async()=>{
  let reject;const h=harness(()=>new Promise((_resolve,r)=>{reject=r;}));const first=h.chat.start('A');const visit=h.chat.capture();h.chat.stop();reject(Error('timeout'));await first;
  assert.equal(visit.valid(),false);assert.equal(h.errors.length,0);assert.equal(h.tasks.length,0);
});
test('old chat failure does not add an error to a reopened chat',async()=>{
  let reject;const h=harness(()=>new Promise((_resolve,r)=>{reject=r;}));const first=h.chat.start('A');await h.chat.start('A');reject(Error('old failure'));await first;
  assert.equal(h.errors.length,0);assert.equal(h.tasks.length,1);h.chat.stop();
});
test('three failures pause polling; manual restart permits another request',async()=>{
  let calls=0;const h=harness(async()=>{calls++;throw Error('offline');});await h.chat.start('A');await h.tasks.shift()();await h.tasks.shift()();
  assert.equal(calls,3);assert.equal(h.errors.at(-1)[1],true);assert.equal(h.tasks.length,0);await h.chat.poll();assert.equal(calls,3);
  await h.chat.start('A');assert.equal(calls,4);h.chat.stop();
});
