import {createJoystick} from './joystick.mjs';
import {drawSprite} from './sprite-preview-layout.mjs';
import { loadCharacters } from './character-sprites.mjs';
import { createEntry } from './entry.mjs';
import { show } from './approved.mjs';
import { facingFor } from './character-motion.mjs';
import { createTownUI } from './town-ui.mjs';
import { createGuide, GUIDE } from './guide.mjs';
import { ROOMS, ROOM_SIZE, roomAdvance, roomNearby, createWorkshopVisit } from './workshop.mjs';
const root=document.querySelector('.town'),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
const four=root.dataset.map==='four';
const map=await import(four?'./town-map.mjs':'./route.mjs');
const { SIZE,SPAWN,advance,nearby }=map;
const touchPointers=new Map();
let joystick=null,joystickInput={x:0,y:0};
const keys=new Set(),dialog=root.querySelector('dialog');
const townUI=four?createTownUI(root,map):null;
const guide=four&&document.body.classList.contains('rpg')?createGuide(root,townUI):null;
const interiorsEnabled=four&&document.body.classList.contains('rpg');
let activeRoom=null;
const interiorImages={};
const visit=createWorkshopVisit();
const townCanvasLabel=canvas.getAttribute('aria-label');
const interactionTarget=()=>activeRoom?roomNearby(player):guide?.isNear(player)?'guide':nearby(player);
function interactWith(target){
  if(!ready||root.dataset.entryOpen==='true'||dialog.open||guide?.isOpen())return;
  clear();
  if(activeRoom){
    if(target==='board')show(activeRoom);
    if(target==='exit'){
      const saved=visit.leave();player=saved.player;direction=saved.direction;
      activeRoom=null;root.dataset.scene='town';delete root.dataset.room;canvas.setAttribute('aria-label',townCanvasLabel);canvas.focus();
    }
  }else if(ROOMS[target]&&interiorsEnabled){
    player=visit.enter(player,direction);direction=3;activeRoom=target;
    const room=ROOMS[activeRoom];
    root.dataset.scene='interior';root.dataset.room=activeRoom;canvas.setAttribute('aria-label',room.label+' '+room.name+'. Move using WASD or arrow keys. Press E at the noticeboard to view opportunities or at the entrance mat to return to town.');
    root.querySelector('#selection-status').textContent='Entered '+room.label+' '+room.name+'. Noticeboard ahead; exit at the entrance mat.';canvas.focus();
  }else if(target==='guide')guide.open();else if(target)show(target);
}
root.addEventListener('qv-input-pause',clear);
root.addEventListener('qv-browse-category',event=>{
  if(map.PLACES?.some(place=>place.category===event.detail)&&!dialog.open){clear();show(event.detail);}
});
root.addEventListener('qv-browse-category',event=>{if(map.PLACES?.some(place=>place.category===event.detail)&&!dialog.open){clear();show(event.detail);}});
let player={...SPAWN},direction=3,overview=false,last=0,frames=[],ready=false,stride=0,moving=false;
let background,buildingImages={};
const townLabels=[];
if(four){
  root.querySelector('.workshop').hidden=true;
  for(const p of map.PLACES){
    const button=document.createElement('button');button.className='hotspot workshop';
    button.textContent=p.label;button.setAttribute('aria-label','Explore '+p.label);
    button.addEventListener('click',()=>interactWith(p.category));root.append(button);
    townLabels.push({p,button});
  }
}
const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
function resize(){canvas.width=Math.round(root.clientWidth);canvas.height=Math.round(root.clientHeight);ctx.imageSmoothingEnabled=false;}
const observer=new ResizeObserver(resize);observer.observe(root);resize();
function clear(){keys.clear();touchPointers.clear();joystick?.reset();}
function pressed(key){return keys.has(key)||[...touchPointers.values()].some(held=>held.includes(key));}
window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
dialog.addEventListener('close',clear);
document.addEventListener('keydown',e=>{
  if(guide?.isOpen()){if(e.key==='Escape'){e.preventDefault();guide.close();}return;}
  if(root.dataset.entryOpen==='true'||dialog.open||root.dataset.inputBusy==='true'||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  const key=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){e.preventDefault();keys.add(key);}
  if(key==='e'&&!e.repeat){const target=interactionTarget();if(target){e.preventDefault();clear();interactWith(target);}}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
const touchDirections={up:['w'],left:['a'],down:['s'],right:['d'],'up-left':['w','a'],'up-right':['w','d'],'down-left':['s','a'],'down-right':['s','d']};
for(const button of root.querySelectorAll('[data-direction]')){
  button.addEventListener('pointerdown',e=>{
    e.preventDefault();
    if(root.dataset.entryOpen==='true'||dialog.open||guide?.isOpen()||root.dataset.inputBusy==='true')return;
    button.setPointerCapture(e.pointerId);touchPointers.set(e.pointerId,touchDirections[button.dataset.direction]);
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>touchPointers.delete(e.pointerId));
}
const joystickPad=root.querySelector('.touch-joystick');
if(joystickPad)joystick=createJoystick(joystickPad,{onInput:input=>{joystickInput=input;},enabled:()=>ready&&root.dataset.entryOpen!=='true'&&!dialog.open&&!guide?.isOpen()&&root.dataset.inputBusy!=='true'});
const overviewButton=root.querySelector('.overview');
overviewButton?.addEventListener('click',()=>{overview=!overview;overviewButton.setAttribute('aria-pressed',String(overview));overviewButton.textContent=overview?'Follow player':four?'View town':'View route';clear();});
root.querySelector('.interaction').addEventListener('click',e=>{e.stopImmediatePropagation();const target=interactionTarget();interactWith(target);},true);
function positionLabel(selector,x,y,camera,scale){
  const el=typeof selector==='string'?root.querySelector(selector):selector,sx=(x-camera.x)*scale,sy=(y-camera.y)*scale;
  el.hidden=sx<45||sx>canvas.width-45||sy<145||sy>canvas.height-95;
  el.style.left=sx+'px';el.style.top=sy+'px';
}
function render(t){
  const dt=last?Math.min(.035,(t-last)/1000):0;last=t;
  if(ready){
    moving=false;
    if(root.dataset.entryOpen!=='true'&&!dialog.open&&root.dataset.inputBusy!=='true'){
      let input={x:Number(pressed('d')||pressed('arrowright'))-Number(pressed('a')||pressed('arrowleft')),y:Number(pressed('s')||pressed('arrowdown'))-Number(pressed('w')||pressed('arrowup'))};
      if(!input.x&&!input.y)input=joystickInput;
      let next=activeRoom?roomAdvance(player,input,dt,ROOMS[activeRoom]):advance(player,input,dt);
      if(!activeRoom&&guide?.blocks(next))next=player;
      const distance=Math.hypot(next.x-player.x,next.y-player.y);
      moving=distance>.01;
      if(moving)stride+=distance;
      player=next;
      direction=facingFor(input,direction);
    }
    if(activeRoom){renderInterior();requestAnimationFrame(render);return;}
    const scale=overview?Math.min(canvas.width/SIZE.width,canvas.height/SIZE.height):Math.max(canvas.width/980,canvas.height/620)*(four ? .66 : .88);
    const w=canvas.width/scale,h=canvas.height/scale;
    const actorHeight=four?74*1.15:74;
    const actorWidth=actorHeight*frames[0][1].w/frames[0][1].h;
    const camera=overview?{x:(SIZE.width-w)/2,y:(SIZE.height-h)/2}:{x:Math.max(0,Math.min(SIZE.width-w,player.x-w/2)),y:Math.max(0,Math.min(SIZE.height-h,four?player.y-h/2-actorHeight/2:player.y-h*.78))};
    ctx.fillStyle='#82a85b';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(background,Math.round(-camera.x*scale),Math.round(-camera.y*scale),Math.round(SIZE.width*scale),Math.round(SIZE.height*scale));
    if(four){
      ctx.save();ctx.translate(-camera.x*scale,-camera.y*scale);ctx.scale(scale,scale);
      // Small ground connectors let southern doors face the player without crossing buildings.
      for(const points of map.EXTRA_ROADS){
        ctx.fillStyle='#f4c990';
        for(let i=1;i<points.length;i++){
          const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.y-a.y);
          for(let n=0;n<=d;n+=8){
            const t=n/d,x=Math.round((a.x+(b.x-a.x)*t)/4)*4,y=Math.round((a.y+(b.y-a.y)*t)/4)*4;
            for(let dy=-48;dy<=48;dy+=8){const half=Math.floor(Math.sqrt(2500-dy*dy)/4)*4;ctx.fillRect(x-half,y+dy,half*2,8);}
          }
        }
      }
      for(const p of map.PLACES){
        const r=map.buildingRect(p);
        ctx.drawImage(buildingImages[p.asset],...p.crop,Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height));
      }
      ctx.restore();
    }
    if(guide&&player.y>=GUIDE.y)guide.paint(ctx,camera,scale,actorHeight,actorWidth);
    const column=moving?[0,1,2,1][Math.floor(stride/30)%4]:1;
    const f=frames[direction][column],idle=frames[direction][1],unit=actorHeight*scale/idle.h;
    // Lock scale and head origin to the idle pose, never refit each walking frame.
    if(four)drawSprite(ctx,frames,direction,column,(player.x-camera.x)*scale,(player.y-camera.y)*scale,actorHeight*scale);
    else ctx.drawImage(f.image,f.x,f.y,f.w,f.h,Math.round((player.x-camera.x)*scale-(f.anchorX-f.x)*unit),Math.round((player.y-camera.y)*scale-actorHeight*scale),Math.round(f.w*unit),Math.round(f.h*unit));
    if(guide&&player.y<GUIDE.y)guide.paint(ctx,camera,scale,actorHeight,actorWidth);
    guide?.update(player,camera,scale,canvas.width,canvas.height);
    root.dataset.walkFrame=String(column);
    root.dataset.facing=String(direction);
    townUI?.update(player,background,buildingImages,t);
    if(four){
      for(const {p,button} of townLabels)positionLabel(button,p.x,p.y+48,camera,scale);
      positionLabel('.board',map.BOARD.x,map.BOARD.y-40,camera,scale);
    }else{
      positionLabel('.workshop',555,487,camera,scale);
      positionLabel('.board',1540,665,camera,scale);
    }
    const mapTarget=nearby(player),target=interactionTarget(),interact=root.querySelector('.interaction');
    interact.hidden=!target||dialog.open||guide?.isOpen();interact.querySelector('span').textContent=ROOMS[target]&&interiorsEnabled?'Enter '+ROOMS[target].name:target==='guide'?'Talk to Town Guide':target==='all'?'All opportunities':'Explore '+(four?map.PLACES.find(p=>p.category===target)?.label||'':'Hackathon');
    root.querySelector('.location').textContent=four?(mapTarget&&mapTarget!=='all'?map.PLACES.find(p=>p.category===mapTarget).label:Math.hypot(player.x-SPAWN.x,player.y-SPAWN.y)<300?'Central square':'Town paths'):target==='hackathon'?'Hackathon · Maker workshop':player.x>1110?'Central square':'Path to Hackathon ↖';
    root.dataset.playerX=player.x.toFixed(1);root.dataset.playerY=player.y.toFixed(1);root.dataset.nearby=target||'';
  }
  requestAnimationFrame(render);
}
function renderInterior(){
  // Reserve space for the existing chat dock instead of obscuring the doorway.
  const dockHeight=root.querySelector('.chat-dock').getBoundingClientRect().height;
  const scale=Math.min(canvas.width/ROOM_SIZE.width,Math.max(160,canvas.height-dockHeight-110)/ROOM_SIZE.height);
  const ox=(canvas.width-ROOM_SIZE.width*scale)/2,oy=80;
  ctx.fillStyle='#292832';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(interiorImages[activeRoom],Math.round(ox),oy,Math.round(ROOM_SIZE.width*scale),Math.round(ROOM_SIZE.height*scale));
  const column=moving?[0,1,2,1][Math.floor(stride/30)%4]:1;
  const actorHeight=85.1*1.7;
  drawSprite(ctx,frames,direction,column,ox+player.x*scale,oy+player.y*scale,actorHeight*scale);
  const target=roomNearby(player),interact=root.querySelector('.interaction');
  interact.hidden=!target||dialog.open;
  interact.querySelector('span').textContent=target==='exit'?'Return to town':'View '+ROOMS[activeRoom].label+' opportunities';
  root.querySelector('.location').textContent=ROOMS[activeRoom].label+' · '+ROOMS[activeRoom].name;
  root.dataset.playerX=player.x.toFixed(1);root.dataset.playerY=player.y.toFixed(1);root.dataset.nearby=target||'';
  root.dataset.walkFrame=String(column);root.dataset.facing=String(direction);
}
async function init(){
  try{
    const [plate,cardinalSheet,diagonalSheet]=await Promise.all([load(four?'assets/town-ground.png':'assets/workshop-ground.png'),four?null:load('assets/student-walk.png'),four?null:load('assets/student-walk-diagonal.png')]);background=plate;
    if(four){
      const [hack,kit]=await Promise.all([load('assets/hackathon-building.png'),load('assets/three-buildings.png')]);
      buildingImages={hack,kit};

    }
    if(!four)for(const sheet of [cardinalSheet,diagonalSheet]){
    const scratch=document.createElement('canvas');scratch.width=sheet.width;scratch.height=sheet.height;
    const sc=scratch.getContext('2d',{willReadFrequently:true});sc.drawImage(sheet,0,0);
    const data=sc.getImageData(0,0,sheet.width,sheet.height).data;
    for(let row=0;row<4;row++){
      const poses=[];
      for(let cell=0;cell<3;cell++){
        const start=Math.floor(cell*sheet.width/3),end=Math.floor((cell+1)*sheet.width/3);
        const y0=Math.floor(row*sheet.height/4),y1=Math.floor((row+1)*sheet.height/4);
        let left=end,right=start,top=y1,bottom=y0;
        for(let y=y0;y<y1;y++)for(let x=start;x<end;x++)if(data[(y*sheet.width+x)*4+3]>160){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
        if(right<=left||bottom<=top)throw new Error('Sprite cell is empty');
        let headLeft=end,headRight=start;
        for(let y=top;y<top+(bottom-top)*.35;y++)for(let x=left;x<=right;x++)if(data[(y*sheet.width+x)*4+3]>160){headLeft=Math.min(headLeft,x);headRight=Math.max(headRight,x);}
        poses.push({image:sheet,x:left,y:top,w:right-left+1,h:bottom-top+1,anchorX:(headLeft+headRight)/2});
      }
      frames.push(poses);
    }
    }
    await guide?.load(load);
    if(interiorsEnabled)await Promise.all(Object.entries(ROOMS).map(async([category,room])=>{interiorImages[category]=await load(room.asset);}));
    if(four){
      const characters=await loadCharacters(load);
      frames=characters[0].frames;
      createEntry(root,characters,{background,buildings:buildingImages},map,(character,profile)=>{
        frames=character.frames;stride=0;moving=false;clear();
        root.dataset.character=character.id;root.dataset.nickname=profile.nickname;root.dataset.skills=JSON.stringify(profile.skills||[]);
        root.querySelector('#selection-status').textContent=profile.nickname+' selected '+character.label+'.';
      });
    }
    ready=true;root.querySelector('.loading').hidden=true;
    if(root.dataset.entryOpen!=='true')canvas.focus();
  }catch{root.querySelector('.loading').textContent='The town artwork could not load. Please reload the page.';}
}
init();requestAnimationFrame(render);
