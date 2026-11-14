import {createTeamService} from './team-service.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
await mkdir(resolve(root,'.local'),{recursive:true});
const opportunities=JSON.parse(await readFile(resolve(root,'data/opportunities.json'),'utf8'));
const teams=createTeamService(resolve(root,'.local/teams.sqlite'),new Set(opportunities.map(item=>item.id)));
const server = createServer(async (req, res) => {
  if(req.url?.split('?')[0].startsWith('/api/teams')){
    try{
      const host=req.headers.host;if(!['127.0.0.1:'+req.socket.localPort,'localhost:'+req.socket.localPort].includes(host)){res.writeHead(403);res.end();return;}
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096){res.writeHead(413);res.end();return;}}
      const response=await teams.handle(new Request('http://'+host+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}:{} )}));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
    }catch{res.writeHead(500);res.end('Team service unavailable');}return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(pathname.split('/').some(part=>part.startsWith('.')||part==='node_modules')){res.writeHead(403);res.end();return;}
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(resolve(root) + sep)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': (mime[extname(file)] || 'text/plain') + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', e => { console.error(e.message); process.exitCode = 1; });
server.listen(Number(process.env.PORT || 4174), '127.0.0.1', () => console.log('Questvale: http://127.0.0.1:' + server.address().port));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(()=>teams.close()));
