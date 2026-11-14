import {createQuestvaleServer} from './create-server.mjs';
const server=await createQuestvaleServer({publicOrigin:process.env.PUBLIC_ORIGIN||'',advisorMaxCalls:Number(process.env.ADVISOR_PROXY_MAX_CALLS||0)});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(Number(process.env.PORT||4174),'127.0.0.1',()=>console.log('Questvale: http://127.0.0.1:'+server.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
