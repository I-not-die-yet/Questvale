import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {parsePublicOrigin,requestOrigin,createAdvisorGate} from '../public-access.mjs';
import {createQuestvaleServer} from '../create-server.mjs';
function rawFetch(url,{method='GET',headers={},body}={}){return new Promise((resolve,reject)=>{const req=request(url,{method,headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const out=new Headers();for(const [key,value]of Object.entries(res.headers))for(const v of Array.isArray(value)?value:[value])if(v!==undefined)out.append(key,v);resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:out}));});});req.on('error',reject);req.end(body);});}
test('public origin is explicit HTTPS; local remains loopback-only; spoofed hosts cannot select an origin',()=>{
 assert.equal(parsePublicOrigin('https://demo.example'),'https://demo.example');
 for(const value of ['http://demo.example','https://demo.example/','https://u:p@demo.example','https://demo.example/path','https://demo.example?x=1'])assert.throws(()=>parsePublicOrigin(value));
 assert.equal(requestOrigin('evil.example',4174),null);assert.equal(requestOrigin('localhost:4174',4174),'http://localhost:4174');
 assert.equal(requestOrigin('demo.example',4174,'https://demo.example'),'https://demo.example');assert.equal(requestOrigin('localhost:4174',4174,'https://demo.example'),null);
});
test('Advisor gate authenticates guests, separates cooldowns, caps concurrency and counts failed attempts',()=>{
 let now=10000;const gate=createAdvisorGate({maxCalls:3,clock:()=>now});assert.equal(gate.take(null).status,401);
 const a=gate.take('a');assert.equal(gate.take('a').status,429);const b=gate.take('b');assert.equal(gate.take('c').status,429);a.release();a.release();b.release();
 now+=5000;const c=gate.take('c');c.release();assert.equal(gate.take('d').status,503);assert.equal(createAdvisorGate().take('a').status,503);
});
test('public HTTPS team/session + authenticated Advisor work behind local HTTP without trusting forwarded headers',async t=>{
 const calls=[];const server=await createQuestvaleServer({databasePath:':memory:',publicOrigin:'https://demo.example',advisorMaxCalls:2,advisorFetch:async(url,options)=>{calls.push({url,options});return Response.json({message:'mock',recommendations:[],missingFields:[],uncertainties:[],followUpQuestions:[]});}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body,extra={})=>rawFetch(base+path,{method:'POST',headers:{Host:'demo.example',Origin:'https://demo.example','Content-Type':'application/json','X-Questvale-Client':path.includes('advisor')?'advisor':'teams',...extra},body:JSON.stringify(body)});
 const session=await post('/api/teams/session',{nickname:'Guest',skills:[]});assert.equal(session.status,200);const cookies=session.headers.getSetCookie();assert.match(cookies[0],/Path=\/api;/);assert.match(cookies[0],/Secure/);assert.match(cookies[0],/HttpOnly/);assert.match(cookies[1],/Path=\/api\/teams; Max-Age=0/);const cookie=cookies[0].split(';')[0];
 const payload={message:'Mock transport test only',context:{}};
 assert.equal((await post('/api/advisor',payload)).status,401);assert.equal(calls.length,0);
 assert.equal((await post('/api/advisor',payload,{Cookie:cookie})).status,200);assert.equal(calls.length,1);assert.equal(calls[0].options.headers.Cookie,undefined);assert.equal(calls[0].options.headers.Authorization,undefined);assert.deepEqual(JSON.parse(calls[0].options.body),payload);
 assert.equal((await post('/api/advisor',payload,{Cookie:cookie})).status,429);
 assert.equal((await post('/api/teams/session',{}, {Origin:'https://evil.example','X-Forwarded-Host':'demo.example','X-Forwarded-Proto':'https'})).status,403);
 assert.equal((await post('/api/teams/session',{}, {Host:'evil.example','X-Forwarded-Host':'demo.example'})).status,403);
 for(const path of ['/.local/teams.sqlite','/tools/wrangler/package.json','/team-service.mjs','/advisor-proxy.mjs','/create-server.mjs','/tests/public-access.test.mjs'])assert.equal((await rawFetch(base+path,{headers:{Host:'demo.example'}})).status,403,path);
 assert.equal((await rawFetch(base+'/rpg.html',{headers:{Host:'demo.example'}})).status,200);
});
test('HTTP local mode preserves teams and migrates an existing session without changing identity; Advisor disabled by default',async t=>{
 const server=await createQuestvaleServer({databasePath:':memory:'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body,cookie='')=>rawFetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Questvale-Client':path.includes('advisor')?'advisor':'teams',Cookie:cookie},body:JSON.stringify(body)});
 const a=await post('/api/teams/session',{nickname:'Original'}),id=(await a.json()).userId,cookie=a.headers.getSetCookie()[0].split(';')[0];assert.doesNotMatch(a.headers.getSetCookie()[0],/Secure/);
 const b=await post('/api/teams/session',{nickname:'Original'},cookie);assert.equal((await b.json()).userId,id);assert.equal(b.headers.getSetCookie()[0].split(';')[0],cookie);
 assert.equal((await post('/api/advisor',{message:'No model call'},cookie)).status,503);
});
