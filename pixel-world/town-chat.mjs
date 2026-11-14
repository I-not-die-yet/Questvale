// Transport-independent public chat controller; no automatic replies or fake presence.
export function createTownChat({request,ensureSession,onMessages,onStatus,schedule=setTimeout,cancel=clearTimeout,nonce=()=>crypto.randomUUID()}){
 let active=false,generation=0,timer=null,failures=0,messages=[],polling=false,sending=false,pending=null;
 function merge(rows){const map=new Map(messages.map(m=>[m.id,m]));for(const row of rows)map.set(row.id,row);messages=[...map.values()].sort((a,b)=>a.id-b.id).slice(-200);onMessages(messages);}
 function stop(){active=false;generation++;cancel(timer);timer=null;}
 async function poll(version){
  if(!active||version!==generation||polling)return;
  polling=true;
  try{
   const data=await request('/town/messages'+(messages.length?'?after='+messages.at(-1).id:''));
   if(!active||version!==generation)return;
   merge(data.messages);failures=0;onStatus('Connected · public to all guests',false);
  }catch{
   if(!active||version!==generation)return;
   failures++;onStatus(failures>=3?'Connection paused. Reconnect to try again.':'Connection interrupted. Retrying…',failures>=3);
  }finally{
   polling=false;
   if(active&&version===generation&&failures<3)timer=schedule(()=>poll(version),3000);
   else if(active&&version!==generation)timer=schedule(()=>poll(generation),0);
  }
 }
 async function start(){
  stop();active=true;failures=0;const version=generation;onStatus('Connecting…',false);
  try{await ensureSession();if(active&&version===generation)await poll(version);}catch{if(active&&version===generation)onStatus('Connection unavailable. Reconnect to try again.',true);}
 }
 async function send(text){
  const value=text.trim();if(!active||!value||sending)return false;
  if(value.length>500)throw new Error('Messages must be at most 500 characters.');
  sending=true;if(!pending||pending.text!==value)pending={text:value,nonce:nonce()};
  try{await request('/town/messages',pending);pending=null;return true;}finally{sending=false;}
 }
 async function earlier(){
  if(!active)return;const version=generation;const data=await request('/town/messages'+(messages.length?'?before='+messages[0].id:''));if(active&&generation===version){merge(data.messages);return data.messages.length;}
 }
 return {start,stop,send,earlier};
}
