import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createTeamService} from '../team-service.mjs';
async function client(service,name){
 let cookie='';const call=async(path='',body)=>{const r=await service.handle(new Request('http://localhost/api/teams'+path,{method:body===undefined?'GET':'POST',headers:{cookie,...(body===undefined?{}:{'Content-Type':'application/json','X-Questvale-Client':'teams',Origin:'http://localhost'})},...(body===undefined?{}:{body:JSON.stringify(body)})}));if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};};
 const session=await call('/session',{nickname:name,skills:['Design']});return {call,id:session.data.userId,get cookie(){return cookie;}};
}
test('two guest identities share teams, captain approvals, member messages and revocation',async()=>{
 const s=createTeamService(':memory:',new Set(['event','other']));try{
 const a=await client(s,'Same name'),b=await client(s,'Same name'),c=await client(s,'Other');assert.notEqual(a.id,b.id);
 const create=await a.call('',{opportunity:'event',name:'Team',intro:'Build',roles:'Design',capacity:2});assert.equal(create.status,201);const id=create.data.id;
 assert.equal((await b.call('?opportunity=event')).data.teams.length,1);
 assert.equal((await b.call('/'+id+'/messages')).status,403);
 assert.equal((await b.call('/'+id+'/request',{})).status,200);
 assert.equal((await c.call('/'+id+'/request',{})).status,200);
 assert.equal((await b.call('/'+id+'/accept',{userId:b.id})).status,403);
 assert.equal((await a.call('/'+id+'/accept',{userId:b.id})).status,200);
 assert.equal((await a.call('/'+id+'/accept',{userId:c.id})).status,409);
 assert.equal((await b.call('',{opportunity:'event',name:'Duplicate',intro:'x',roles:'x',capacity:2})).status,409);
 assert.equal((await b.call('/'+id+'/messages',{text:'Hello <script>',nonce:'one'})).status,201);
 assert.equal((await b.call('/'+id+'/messages',{text:'Hello <script>',nonce:'one'})).status,200);
 assert.equal((await a.call('/'+id+'/messages')).data.messages.length,1);
 assert.equal((await a.call('/'+id+'/leave',{})).status,409);
 assert.equal((await a.call('/'+id+'/transfer',{userId:b.id})).status,200);
 assert.equal((await a.call('/'+id+'/leave',{})).status,200);
 assert.equal((await a.call('/'+id+'/messages')).status,403);
 assert.equal((await b.call('/'+id+'/disband',{})).status,200);
 assert.equal((await c.call('?opportunity=event')).data.teams.length,0);
 }finally{s.close();}
});
test('sessions and membership survive reopening the database; untrusted mutations fail',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'qv-teams-'));let service=createTeamService(join(dir,'test.sqlite'),new Set(['event']));
 try{
 const a=await client(service,'Captain');const id=(await a.call('',{opportunity:'event',name:'Persisted',intro:'Build',roles:'Design',capacity:4})).data.id;
 service.close();service=createTeamService(join(dir,'test.sqlite'),new Set(['event']));
 const result=await service.handle(new Request('http://localhost/api/teams/session',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json','X-Questvale-Client':'teams'},body:'{}'}));assert.equal(result.status,403);
 assert.equal((await service.handle(new Request('http://localhost/api/teams?opportunity=event'))).status,401);
 const persisted=await service.handle(new Request('http://localhost/api/teams?opportunity=event',{headers:{cookie:a.cookie}}));const data=await persisted.json();assert.equal(data.teams[0].id,id);assert.equal(data.teams[0].isCaptain,true);
 }finally{service.close();rmSync(dir,{recursive:true,force:true});}
});
test('town chat is shared across guests without team membership, with validation and idempotent sends',async()=>{
 const s=createTeamService(':memory:',new Set(['event']));try{
 const a=await client(s,'Alex'),b=await client(s,'Jamie');
 assert.equal((await a.call('/town/messages',{text:' ',nonce:'empty'})).status,400);
 assert.equal((await a.call('/town/messages',{text:'x'.repeat(501),nonce:'long'})).status,400);
 assert.equal((await a.call('/town/messages',{text:'Public hello <script>',nonce:'public-one'})).status,201);
 assert.equal((await a.call('/town/messages',{text:'Public hello <script>',nonce:'public-one'})).status,200);
 assert.equal((await a.call('/town/messages',{text:'Too fast',nonce:'public-two'})).status,429);
 const messages=(await b.call('/town/messages')).data.messages;
 assert.equal(messages.length,1);assert.equal(messages[0].name,'Alex');assert.equal(messages[0].body,'Public hello <script>');
 assert.equal((await b.call('/town/messages?after='+messages[0].id)).data.messages.length,0);
 assert.equal((await b.call('/town/messages?after=invalid')).status,400);
 assert.equal((await b.call('/town/messages',{text:'Public reply',nonce:'reply'})).status,201);
 const id=(await a.call('',{opportunity:'event',name:'Private',intro:'Build',roles:'Design',capacity:4})).data.id;
 assert.equal((await a.call('/'+id+'/messages',{text:'Private note',nonce:'private'})).status,201);
 assert.equal((await b.call('/'+id+'/messages')).status,403);
 assert.ok((await b.call('/town/messages')).data.messages.every(m=>m.body!=='Private note'));
 }finally{s.close();}
});
