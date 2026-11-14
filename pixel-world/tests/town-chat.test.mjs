import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTownChat} from '../town-chat.mjs';
function harness(request){const tasks=[],updates=[],statuses=[];const chat=createTownChat({request,ensureSession:async()=>{},onMessages:m=>updates.push(m),onStatus:(...s)=>statuses.push(s),schedule:fn=>{tasks.push(fn);return fn;},cancel:fn=>{const i=tasks.indexOf(fn);if(i>=0)tasks.splice(i,1);},nonce:()=> 'stable-nonce'});return {chat,tasks,updates,statuses};}
test('polling deduplicates messages and stops when closed',async()=>{
 let calls=0;const h=harness(async()=>{calls++;return {messages:[{id:1,body:'Hello'}]};});
 await h.chat.start();assert.equal(h.updates.at(-1).length,1);await h.tasks.shift()();assert.equal(h.updates.at(-1).length,1);assert.equal(calls,2);h.chat.stop();assert.equal(h.tasks.length,0);
});
test('three consecutive failures stop polling until a manual restart',async()=>{
 let calls=0;const h=harness(async()=>{calls++;throw Error('offline');});await h.chat.start();await h.tasks.shift()();await h.tasks.shift()();assert.equal(calls,3);assert.equal(h.tasks.length,0);assert.equal(h.statuses.at(-1)[1],true);
 await h.chat.start();assert.equal(calls,4);h.chat.stop();
});
test('late responses cannot update a closed channel',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>{resolve=r;}));const opening=h.chat.start();await Promise.resolve();h.chat.stop();resolve({messages:[{id:1,body:'late'}]});await opening;assert.equal(h.updates.length,0);assert.equal(h.tasks.length,0);
});
test('retrying an ambiguous send reuses its nonce and never invents a local reply',async()=>{
 const sent=[];const h=harness(async(path,body)=>{if(body){sent.push({...body});if(sent.length===1)throw Error('lost response');return {ok:true};}return {messages:[]};});
 await h.chat.start();await assert.rejects(h.chat.send('Hello'));assert.equal(await h.chat.send('Hello'),true);assert.equal(sent[0].nonce,sent[1].nonce);assert.equal(h.updates.at(-1).length,0);h.chat.stop();
});
