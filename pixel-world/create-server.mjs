import {advisorProxy,advisorBoundary} from './advisor-proxy.mjs';
import {createTeamService} from './team-service.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {parsePublicOrigin,requestOrigin,createAdvisorGate} from './public-access.mjs';
import {attachPresence} from './presence-server.mjs';
export async function createQuestvaleServer({root=fileURLToPath(new URL('.',import.meta.url)),publicOrigin='',databasePath=resolve(root,'.local/teams.sqlite'),advisorMaxCalls=0,advisorFetch=fetch}={}){
publicOrigin=parsePublicOrigin(publicOrigin);
const gate=createAdvisorGate({maxCalls:advisorMaxCalls});
const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
if(databasePath!==':memory:')await mkdir(resolve(databasePath,'..'),{recursive:true});
const opportunities=JSON.parse(await readFile(resolve(root,'data/opportunities.json'),'utf8'));
const teams=createTeamService(databasePath,new Set(opportunities.map(item=>item.id)));
const server = createServer({requestTimeout:10000,headersTimeout:10000,maxHeaderSize:16384},async (req, res) => {
  const origin=requestOrigin(req.headers.host,req.socket.localPort,publicOrigin);
  if(!origin||(req.headers.origin&&req.headers.origin!==origin)||(publicOrigin&&!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)){res.writeHead(403);res.end('Same-origin requests only.');req.resume();return;}
  if(req.url==='/api/advisor'){
    const reply=(status,body,headers={})=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));}};
    const blocked=advisorBoundary({method:req.method,host:req.headers.host,origin:req.headers.origin,client:req.headers['x-questvale-client'],type:req.headers['content-type'],encoding:req.headers['content-encoding']},req.socket.localPort,origin);
    if(blocked){reply(blocked,{error:{code:'INVALID_ADVISOR_REQUEST',message:'This Advisor request is not allowed.'}});req.resume();return;}
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
    const stop=()=>abort.abort();req.once('aborted',stop);res.once('close',stop);
    let expired=false;const bodyTimer=setTimeout(()=>{expired=true;reply(408,{error:{code:'REQUEST_TIMEOUT',message:'Request body took too long.'}});req.destroy();},5000);
    try{
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>8192){reply(413,{error:{code:'REQUEST_TOO_LARGE',message:'Advisor request is too large.'}});req.resume();return;}chunks.push(chunk);}
      clearTimeout(bodyTimer);if(expired)return;
      const raw=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));JSON.parse(raw);
      const slot=gate.take(teams.authenticate(req.headers.cookie));
      if(slot.status){reply(slot.status,slot.body,slot.headers);return;}
      try{const result=await advisorProxy(raw,{signal:abort.signal,fetchImpl:advisorFetch});reply(result.status,result.body,result.headers);}finally{slot.release();}
    }catch{reply(400,{error:{code:'INVALID_REQUEST',message:'Advisor request could not be read.'}});}
    finally{clearTimeout(timer);clearTimeout(bodyTimer);req.removeListener('aborted',stop);res.removeListener('close',stop);}return;
  }
  if(req.url?.split('?')[0].startsWith('/api/teams')){
    try{
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096){res.writeHead(413);res.end();return;}}
      const response=await teams.handle(new Request(new URL(req.url,origin),{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}:{} )}));
      res.writeHead(response.status,{...Object.fromEntries(response.headers),...(response.headers.getSetCookie().length?{'set-cookie':response.headers.getSetCookie()}:{})});res.end(await response.text());
    }catch{res.writeHead(500);res.end('Team service unavailable');}return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(pathname.split('/').some(part=>part.startsWith('.')||['node_modules','tests','tools','docs'].includes(part))||['/serve.mjs','/create-server.mjs','/team-service.mjs','/advisor-proxy.mjs','/public-access.mjs','/presence-server.mjs'].includes(pathname)||/\.(sqlite|db)(-|$)/i.test(pathname)){res.writeHead(403);res.end();return;}
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(resolve(root) + sep)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': (mime[extname(file)] || 'text/plain') + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
const presence=attachPresence(server,{teams,publicOrigin});
server.closePresence=presence.close;
server.once('close',()=>{presence.close();teams.close();});
return server;
}
