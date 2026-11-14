import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createQuestvaleServer} from '../create-server.mjs';
import {validatePresence} from '../presence-server.mjs';
import {SPAWN} from '../town-map.mjs';
import {ROOM_SPAWN,ROOMS} from '../workshop.mjs';
async function setup(t){const server=await createQuestvaleServer({databasePath:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 t.after(()=>new Promise(r=>{server.closePresence();server.close(r);server.closeAllConnections();}));
 const guest=async name=>{const r=await fetch(base+'/api/teams/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Questvale-Client':'teams'},body:JSON.stringify({nickname:name})});return r.headers.getSetCookie()[0].split(';')[0];};
 const connect=(cookie,origin=base)=>new Promise((resolve,reject)=>{const ws=new WebSocket(base.replace('http:','ws:')+'/api/presence',{headers:{Origin:origin,Cookie:cookie}});ws.on('error',()=>{});ws.on('message',data=>{const p=JSON.parse(data.toString());if(p.type==='full')ws.full=p;});ws.once('unexpected-response',(_req,r)=>{r.resume();ws.terminate();reject(Object.assign(Error('Upgrade rejected'),{status:r.statusCode}));});ws.once('open',()=>resolve(ws));});
 return {server,base,guest,connect};}
const state=(x=SPAWN.x)=>({scene:'town',x,y:SPAWN.y,direction:3,moving:true,character:'boy'});
function packet(ws,predicate){if(ws.full&&predicate(ws.full))return Promise.resolve(ws.full);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',on);reject(Error('No expected snapshot'));},2000);function on(data){const value=JSON.parse(data.toString());if(predicate(value)){clearTimeout(timer);ws.off('message',on);resolve(value);}}ws.on('message',on);});}
test('validates walkable finite coordinates, allowed sprites/directions and exact state keys',()=>{
 assert.equal(validatePresence(state()),true);assert.equal(validatePresence({scene:'away'}),true);
 for(const value of [state(NaN),state(-5),{...state(),direction:8},{...state(),character:'fake'},{...state(),id:'spoof'},{...state(),moving:'yes'},{scene:'away',x:3}])assert.equal(validatePresence(value),false);
});
test('two verified guests receive live movement with server-owned names, disconnect and away removal',async t=>{
 const h=await setup(t),a=await h.connect(await h.guest('Alice')),b=await h.connect(await h.guest('Bob'));
 a.send(JSON.stringify(state()));b.send(JSON.stringify(state(SPAWN.x+10)));
 const first=await packet(a,p=>p.type==='snapshot'&&p.players.length===2);assert.deepEqual(first.players.map(p=>p.name).sort(),['Alice','Bob']);assert.equal(first.online,2);assert.ok(!JSON.stringify(first).includes('qv_session'));
 b.send(JSON.stringify(state(SPAWN.x+30)));const second=await packet(a,p=>p.players?.some(x=>x.name==='Bob'&&x.x===SPAWN.x+30));assert.equal(second.players.length,2);
 b.send(JSON.stringify({scene:'away'}));await packet(a,p=>p.players?.length===1);
 b.close();await packet(a,p=>p.online===1);a.close();
});
test('rejects anonymous, forged, cross-origin and duplicate guests; first ten connections fill capacity',async t=>{
 const h=await setup(t);await assert.rejects(h.connect(''),e=>e.status===401);await assert.rejects(h.connect('qv_session='+'f'.repeat(64)),e=>e.status===401);
 const cookie=await h.guest('One');await assert.rejects(h.connect(cookie,'https://evil.example'),e=>e.status===403);
 const all=[await h.connect(cookie)];await assert.rejects(h.connect(cookie),e=>e.status===409);
 for(let i=1;i<10;i++)all.push(await h.connect(await h.guest('Guest '+i)));
 const eleven=await h.connect(await h.guest('Eleven'));await packet(eleven,p=>p.type==='full');
 const close=new Promise(r=>all[0].once('close',r));all[0].close();await close;await new Promise(r=>setTimeout(r,20));const replacement=await h.connect(await h.guest('Replacement'));replacement.close();all.slice(1).forEach(ws=>ws.close());
});
test('invalid or flooded updates close the connection without crashing the HTTP service',async t=>{
 const h=await setup(t),bad=await h.connect(await h.guest('Bad'));
 const closed=new Promise(r=>bad.once('close',code=>r(code)));bad.send(JSON.stringify({...state(),id:'pretend-user'}));assert.equal(await closed,1008);
 const fast=await h.connect(await h.guest('Fast'));const rejected=new Promise(r=>fast.once('close',r));for(let i=0;i<25;i++)fast.send(JSON.stringify(state()));assert.equal(await rejected,1008);
 assert.equal((await fetch(h.base+'/rpg.html')).status,200);
});
test('all four rooms use their furniture/bounds and reject unknown scene IDs',()=>{
 for(const scene of Object.keys(ROOMS)){const room={...state(),scene,...ROOM_SPAWN};assert.equal(validatePresence(room),true);for(const value of [{...room,scene:'fake'},{...room,scene:'__proto__'},{...room,y:100},{...room,x:0},{...room,x:300,y:650}])assert.equal(validatePresence(value),false);}
});
for(const scene of Object.keys(ROOMS))test(scene+' isolates town/interior players and preserves identity across enter, move and exit',async t=>{
 const h=await setup(t),a=await h.connect(await h.guest('Alice')),b=await h.connect(await h.guest('Bob')),outside=await h.connect(await h.guest('Outside'));
 const room={...state(),scene,...ROOM_SPAWN};a.send(JSON.stringify(state()));b.send(JSON.stringify(state()));outside.send(JSON.stringify(state()));
 const initial=await packet(a,p=>p.players?.length===3);const alice=initial.players.find(p=>p.name==='Alice').id;
 a.send(JSON.stringify(room));const inside=await packet(a,p=>p.scene===scene&&p.players.length===1);assert.equal(inside.players[0].id,alice);
 const exterior=await packet(outside,p=>p.scene==='town'&&p.players.length===2);assert.ok(exterior.players.every(p=>p.name!=='Alice'));
 b.send(JSON.stringify({...room,x:ROOM_SPAWN.x+15}));const both=await packet(a,p=>p.scene===scene&&p.players.length===2);assert.deepEqual(both.players.map(p=>p.name).sort(),['Alice','Bob']);assert.equal(both.online,3);
 b.send(JSON.stringify({...room,x:ROOM_SPAWN.x+35}));await packet(a,p=>p.players?.some(p=>p.name==='Bob'&&p.x===ROOM_SPAWN.x+35));
 b.send(JSON.stringify(state()));await packet(a,p=>p.scene===scene&&p.players.length===1);await packet(outside,p=>p.scene==='town'&&p.players.length===2);
 a.close();b.close();outside.close();
});
test('players with identical coordinates in different interiors cannot see each other',async t=>{
 const h=await setup(t),a=await h.connect(await h.guest('Researcher')),b=await h.connect(await h.guest('Founder'));
 const room={...state(),...ROOM_SPAWN};a.send(JSON.stringify({...room,scene:'research'}));b.send(JSON.stringify({...room,scene:'startup'}));
 const research=await packet(a,p=>p.scene==='research'&&p.players.length===1);assert.equal(research.players[0].name,'Researcher');
 const startup=await packet(b,p=>p.scene==='startup'&&p.players.length===1);assert.equal(startup.players[0].name,'Founder');
 b.send(JSON.stringify({...room,scene:'research'}));await packet(a,p=>p.scene==='research'&&p.players.length===2);a.close();b.close();
});
