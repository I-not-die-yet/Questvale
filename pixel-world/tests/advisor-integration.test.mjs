import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advisorContext,requestAdvisor} from '../advisor-client.mjs';
import {advisorBoundary,advisorProxy} from '../advisor-proxy.mjs';
const result={message:'Review sources',recommendations:[],missingFields:[],uncertainties:['Draft data'],followUpQuestions:[]};
test('only explicit conditions enter Advisor context; blanks stay unknown',()=>{
 assert.deepEqual(advisorContext({age:'',teamSize:'',isStudent:'',category:''}),{});
 assert.deepEqual(advisorContext({age:'20',teamSize:'3',isStudent:'yes',category:'research'}),{age:20,teamSize:3,isStudent:true,preferredCategories:['research']});
 assert.deepEqual(advisorContext({skills:['Design'],isStudent:'no'}),{isStudent:false});
});
test('browser sends same-origin JSON with same-origin guest cookies and preserves structured results',async()=>{
 const response=await requestAdvisor('Hello',{}, {fetchImpl:async(url,options)=>{
 assert.equal(url,'/api/advisor');assert.equal(options.credentials,'same-origin');assert.equal(options.headers['X-Questvale-Client'],'advisor');assert.deepEqual(JSON.parse(options.body),{message:'Hello',context:{}});return Response.json(result);
 }});assert.deepEqual(response,result);
});
test('rate limit retry delay and budget errors remain errors, never invented success',async()=>{
 await assert.rejects(requestAdvisor('Hello',{}, {fetchImpl:async()=>Response.json({error:{code:'PROVIDER_RATE_LIMITED',message:'Wait'}},{status:429,headers:{'Retry-After':'12'}})}),e=>e.code==='PROVIDER_RATE_LIMITED'&&e.retryAfter===12);
 await assert.rejects(requestAdvisor('Hello',{}, {fetchImpl:async()=>Response.json({error:{code:'DEMO_BUDGET_EXHAUSTED',message:'Budget exhausted'}},{status:503})}),/Budget exhausted/);
});
test('invalid responses and aborted transports do not yield results',async()=>{
 await assert.rejects(requestAdvisor('Hello',{}, {fetchImpl:async()=>Response.json({message:'bad'})}),/invalid result/);
 const abort=new AbortController();abort.abort();await assert.rejects(requestAdvisor('Hello',{}, {signal:abort.signal,fetchImpl:async(_url,o)=>{o.signal.throwIfAborted();}}));
});
test('proxy accepts only local same-origin POSTs with an explicit client header',()=>{
 const req={method:'POST',host:'127.0.0.1:4174',origin:'http://127.0.0.1:4174',client:'advisor',type:'application/json'};
 assert.equal(advisorBoundary(req,4174),0);
 assert.equal(advisorBoundary({...req,origin:'https://other.example'},4174),403);
 assert.equal(advisorBoundary({...req,host:'attacker.example'},4174),403);
 assert.equal(advisorBoundary({...req,client:undefined},4174),403);
 assert.equal(advisorBoundary({...req,type:'text/plain'},4174),415);
 assert.equal(advisorBoundary({...req,method:'GET'},4174),405);
});
test('proxy uses fixed loopback endpoint, strips credentials and relays Retry-After',async()=>{
 const response=await advisorProxy('{}',{fetchImpl:async(url,options)=>{
 assert.equal(url,'http://127.0.0.1:4185/api/advisor');assert.equal(options.redirect,'error');assert.equal(options.headers.Cookie,undefined);assert.equal(options.headers.Authorization,undefined);
 return Response.json({error:{code:'RATE_LIMITED',message:'Wait'}},{status:429,headers:{'Retry-After':'5','Set-Cookie':'not-forwarded'}});
 }});assert.equal(response.status,429);assert.deepEqual(response.headers,{'Retry-After':'5'});
});
test('missing backend, invalid JSON and excessive responses are sanitized',async()=>{
 for(const fetchImpl of [async()=>{throw Error('secret-like provider detail');},async()=>new Response('bad'),async()=>new Response('x'.repeat(70000))]){
  const response=await advisorProxy('{}',{fetchImpl});assert.equal(response.status,503);assert.equal(response.body.error.code,'ADVISOR_UNAVAILABLE');assert.doesNotMatch(JSON.stringify(response),/secret-like/);
 }
});
