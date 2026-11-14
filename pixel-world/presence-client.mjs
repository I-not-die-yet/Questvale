import {ensureGuest} from './team-client.mjs';
import {drawSprite} from './sprite-preview-layout.mjs';
export function createPresence(root,characters){
  const peers=new Map(),status=document.createElement('small');status.className='presence-status';status.setAttribute('role','status');root.querySelector('.brand').append(status);
  let socket=null,connecting=false,generation=0,active=false,attempts=0,next=0,self=null,lastSend=0,lastState='',handshake=null,scene=null;
  const say=text=>{if(status.textContent!==text)status.textContent=text;};
  function stop(){generation++;clearTimeout(handshake);socket?.close();socket=null;connecting=false;peers.clear();self=null;}
  async function connect(){
    connecting=true;attempts++;const version=generation;say('Connecting players…');
    try{
      await ensureGuest(root);if(version!==generation||!active)return;
      const url=new URL('/api/presence',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
      const ws=new WebSocket(url);socket=ws;let full=false;
      handshake=setTimeout(()=>{if(ws.readyState!==WebSocket.OPEN)ws.close();},8000);
      ws.onopen=()=>{if(version!==generation)return;clearTimeout(handshake);lastSend=0;lastState='';connecting=false;};
      ws.onmessage=event=>{
        if(version!==generation)return;
        let packet;try{packet=JSON.parse(event.data);}catch{return;}
        if(packet.type==='full'){full=true;attempts=3;say('Town full · 10 players. Reload to retry.');return;}
        if(packet.type==='welcome'){self=packet.id;return;}
        if(packet.type!=='snapshot'||packet.scene!==scene||!Array.isArray(packet.players))return;
        const ids=new Set();
        for(const player of packet.players){if(player.id===self)continue;ids.add(player.id);const old=peers.get(player.id);peers.set(player.id,{...player,drawX:old?.drawX??player.x,drawY:old?.drawY??player.y});}
        for(const id of peers.keys())if(!ids.has(id))peers.delete(id);
        say('Players · '+packet.online+' / 10');
      };
      ws.onerror=()=>{};
      ws.onclose=event=>{if(version!==generation)return;clearTimeout(handshake);socket=null;connecting=false;peers.clear();next=performance.now()+1000*2**(attempts-1);if(event.code===1008)attempts=3;say(full?'Town full · 10 players. Reload to retry.':attempts>=3?'Players offline · reload to retry':'Players disconnected · reconnecting…');};
    }catch{if(version===generation){connecting=false;next=performance.now()+1000*2**(attempts-1);say(attempts>=3?'Players offline · reload to retry':'Players unavailable · retrying…');}}
  }
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){active=false;stop();say('Players paused');}});
  return {
    update(enabled,state,time){
      if(state.scene!==scene){scene=state.scene;peers.clear();lastState='';lastSend=0;}
      if(enabled!==active){active=enabled;stop();if(active){attempts=0;next=0;}else say('Players paused');}
      if(!active)return;
      if(!socket&&!connecting&&attempts<3&&time>=next)connect();
      if(socket?.readyState===WebSocket.OPEN&&time-lastSend>=100){const text=JSON.stringify(state);if(text!==lastState||time-lastSend>=1000){socket.send(text);lastSend=time;lastState=text;}}
    },
    paint(ctx,camera,scale,height,time,dt){
      for(const peer of peers.values()){
        const character=characters.find(c=>c.id===peer.character);if(!character)continue;
        const blend=Math.min(1,dt*12);peer.drawX+=(peer.x-peer.drawX)*blend;peer.drawY+=(peer.y-peer.drawY)*blend;
        const x=(peer.drawX-camera.x)*scale,y=(peer.drawY-camera.y)*scale;
        drawSprite(ctx,character.frames,peer.direction,peer.moving?[0,1,2,1][Math.floor(time/150)%4]:1,x,y,height*scale);
        ctx.save();ctx.font='600 '+Math.max(10,12*scale)+'px ui-monospace,monospace';ctx.textAlign='center';
        const name=peer.name+' #'+peer.id.slice(-3),width=ctx.measureText(name).width+10,top=y-height*scale-23;
        ctx.fillStyle='#263e32e8';ctx.fillRect(x-width/2,top,width,20);ctx.fillStyle='#fff0ce';ctx.fillText(name,x,top+14);ctx.restore();
      }
    },
  };
}
