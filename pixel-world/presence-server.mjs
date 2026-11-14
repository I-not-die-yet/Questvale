import {WebSocketServer,WebSocket} from 'ws';
import {randomBytes} from 'node:crypto';
import {requestOrigin} from './public-access.mjs';
import {walkable} from './town-map.mjs';
import {roomWalkable,ROOMS} from './workshop.mjs';
const CHARACTERS=['boy','girl','robot','mushroom'];
export function validatePresence(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  if(value.scene==='away')return Object.keys(value).length===1;
  return Object.keys(value).every(k=>['scene','x','y','direction','moving','character'].includes(k))&&(value.scene==='town'||Object.hasOwn(ROOMS,value.scene))&&Number.isFinite(value.x)&&Number.isFinite(value.y)&&(value.scene==='town'?walkable(value):roomWalkable(value,ROOMS[value.scene]))&&Number.isInteger(value.direction)&&value.direction>=0&&value.direction<8&&typeof value.moving==='boolean'&&CHARACTERS.includes(value.character);
}
export function attachPresence(server,{teams,publicOrigin='',clock=Date.now}){
  const wss=new WebSocketServer({noServer:true,maxPayload:512,perMessageDeflate:false});
  const peers=new Map();
  function upgrade(req,socket,head){
    const reject=status=>{socket.end('HTTP/1.1 '+status+'\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');};
    const origin=requestOrigin(req.headers.host,req.socket.localPort,publicOrigin);
    if(req.url!=='/api/presence'||!origin||req.headers.origin!==origin)return reject('403 Forbidden');
    const user=teams.authenticate(req.headers.cookie);if(!user)return reject('401 Unauthorized');
    if([...peers.values()].some(p=>p.user===user))return reject('409 Conflict');
    if(peers.size>=10)return wss.handleUpgrade(req,socket,head,ws=>{ws.on('error',()=>{});ws.send(JSON.stringify({type:'full'}));ws.close(1013,'Town is full (10 players)');});
    const name=teams.guestName(user);if(!name)return reject('401 Unauthorized');
    wss.handleUpgrade(req,socket,head,ws=>{
      const peer={id:randomBytes(12).toString('hex'),user,name,state:null,last:null,seen:clock(),count:0,window:clock(),alive:true,valid:()=>teams.authenticate(req.headers.cookie)===user};peers.set(ws,peer);
      ws.send(JSON.stringify({type:'welcome',id:peer.id,limit:10}));
      ws.on('error',()=>{});ws.on('pong',()=>{peer.alive=true;});
      ws.on('close',()=>peers.delete(ws));
      ws.on('message',(data,binary)=>{
        const now=clock();if(now-peer.window>=1000){peer.window=now;peer.count=0;}
        if(binary||++peer.count>20){ws.close(1008,'Invalid update rate or format');return;}
        let value;try{value=JSON.parse(data.toString());}catch{ws.close(1008,'Invalid update');return;}
        if(!validatePresence(value)){ws.close(1008,'Invalid position');return;}
        if(value.scene==='away'){peer.state=null;peer.last=null;return;}
        if(peer.last&&peer.last.scene===value.scene&&Math.hypot(value.x-peer.last.x,value.y-peer.last.y)>600*Math.min(2,(now-peer.seen)/1000)+100){ws.close(1008,'Position changed too quickly');return;}
        peer.state=value;peer.last=value;peer.seen=now;
      });
    });
  }
  server.on('upgrade',upgrade);
  const broadcast=setInterval(()=>{
    const players=[...peers.values()].filter(p=>p.state).map(p=>({id:p.id,name:p.name,...p.state}));
    for(const [ws,peer]of peers)if(ws.readyState===WebSocket.OPEN){
      if(ws.bufferedAmount>65536){ws.terminate();continue;}
      const scene=peer.state?.scene??null;
      ws.send(JSON.stringify({type:'snapshot',scene,players:players.filter(p=>p.scene===scene),online:peers.size}));
    }
  },100);broadcast.unref();
  const heartbeat=setInterval(()=>{for(const [ws,p]of peers){if(!p.alive||!p.valid()){ws.terminate();continue;}p.alive=false;ws.ping();}},15000);heartbeat.unref();
  let closed=false;
  const close=()=>{if(closed)return;closed=true;clearInterval(broadcast);clearInterval(heartbeat);server.removeListener('upgrade',upgrade);for(const ws of peers.keys())ws.terminate();peers.clear();wss.close();};
  return {close};
}
