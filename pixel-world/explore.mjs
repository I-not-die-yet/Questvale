import { show } from './approved.mjs';
import { createTownUI } from './town-ui.mjs';
const root=document.querySelector('.town'),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
const four=root.dataset.map==='four';
const map=await import(four?'./town-map.mjs':'./route.mjs');
const { SIZE,SPAWN,advance,nearby }=map;
const keys=new Set(),dialog=root.querySelector('dialog');
const townUI=four?createTownUI(root,map):null;
root.addEventListener('qv-input-pause',()=>keys.clear());
let player={...SPAWN},direction=3,overview=false,last=0,frames=[],ready=false,stride=0,moving=false;
let background,buildingImages={};
const townLabels=[];
if(four){
  root.querySelector('.workshop').hidden=true;
  for(const p of map.PLACES){
    const button=document.createElement('button');button.className='hotspot workshop';
    button.textContent=p.label;button.setAttribute('aria-label','Explore '+p.label);
    button.addEventListener('click',()=>{clear();show(p.category);});root.append(button);
    townLabels.push({p,button});
  }
}
const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
function resize(){canvas.width=Math.round(root.clientWidth);canvas.height=Math.round(root.clientHeight);ctx.imageSmoothingEnabled=false;}
const observer=new ResizeObserver(resize);observer.observe(root);resize();
function clear(){keys.clear();}
window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
dialog.addEventListener('close',clear);
document.addEventListener('keydown',e=>{
  if(dialog.open||root.dataset.inputBusy==='true'||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  const key=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){e.preventDefault();keys.add(key);}
  if(key==='e'&&!e.repeat){const target=nearby(player);if(target){e.preventDefault();clear();show(target);}}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
for(const button of root.querySelectorAll('[data-direction]')){
  const key={up:'w',left:'a',down:'s',right:'d'}[button.dataset.direction];
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(key);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(key));
}
const overviewButton=root.querySelector('.overview');
overviewButton?.addEventListener('click',()=>{overview=!overview;overviewButton.setAttribute('aria-pressed',String(overview));overviewButton.textContent=overview?'Follow player':four?'View town':'View route';clear();});
root.querySelector('.interaction').addEventListener('click',e=>{e.stopImmediatePropagation();const target=nearby(player);if(target)show(target);},true);
function positionLabel(selector,x,y,camera,scale){
  const el=typeof selector==='string'?root.querySelector(selector):selector,sx=(x-camera.x)*scale,sy=(y-camera.y)*scale;
  el.hidden=sx<45||sx>canvas.width-45||sy<145||sy>canvas.height-95;
  el.style.left=sx+'px';el.style.top=sy+'px';
}
function render(t){
  const dt=last?Math.min(.035,(t-last)/1000):0;last=t;
  if(ready){
    moving=false;
    if(!dialog.open&&root.dataset.inputBusy!=='true'){
      const input={x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))};
      const next=advance(player,input,dt);
      const distance=Math.hypot(next.x-player.x,next.y-player.y);
      moving=distance>.01;
      if(moving)stride+=distance;
      player=next;
      if(input.x||input.y)direction=input.x?(input.x<0?1:2):(input.y<0?3:0);
    }
    const scale=overview?Math.min(canvas.width/SIZE.width,canvas.height/SIZE.height):Math.max(canvas.width/980,canvas.height/620)*(four ? .66 : .88);
    const w=canvas.width/scale,h=canvas.height/scale;
    const actorHeight=four?74*1.15:74;
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
    const column=moving?[0,1,2,1][Math.floor(stride/30)%4]:1;
    const f=frames[direction][column],idle=frames[direction][1],unit=actorHeight*scale/idle.h;
    // Lock scale and head origin to the idle pose, never refit each walking frame.
    ctx.drawImage(f.image,f.x,f.y,f.w,f.h,Math.round((player.x-camera.x)*scale-(f.anchorX-f.x)*unit),Math.round((player.y-camera.y)*scale-actorHeight*scale),Math.round(f.w*unit),Math.round(f.h*unit));
    root.dataset.walkFrame=String(column);
    townUI?.update(player,background,buildingImages,t);
    if(four){
      for(const {p,button} of townLabels)positionLabel(button,p.x,p.y+48,camera,scale);
      positionLabel('.board',map.BOARD.x,map.BOARD.y-40,camera,scale);
    }else{
      positionLabel('.workshop',555,487,camera,scale);
      positionLabel('.board',1540,665,camera,scale);
    }
    const target=nearby(player),interact=root.querySelector('.interaction');
    interact.hidden=!target||dialog.open;interact.querySelector('span').textContent=target==='all'?'All opportunities':'Explore '+(four?map.PLACES.find(p=>p.category===target)?.label||'':'Hackathon');
    root.querySelector('.location').textContent=four?(target&&target!=='all'?map.PLACES.find(p=>p.category===target).label:Math.hypot(player.x-SPAWN.x,player.y-SPAWN.y)<300?'Central square':'Town paths'):target==='hackathon'?'Hackathon · Maker workshop':player.x>1110?'Central square':'Path to Hackathon ↖';
    root.dataset.playerX=player.x.toFixed(1);root.dataset.playerY=player.y.toFixed(1);root.dataset.nearby=target||'';
  }
  requestAnimationFrame(render);
}
async function init(){
  try{
    const [plate,sheet]=await Promise.all([load(four?'assets/town-ground.png':'assets/workshop-ground.png'),load('assets/student-walk.png')]);background=plate;
    if(four){
      const [hack,kit]=await Promise.all([load('assets/hackathon-building.png'),load('assets/three-buildings.png')]);
      buildingImages={hack,kit};

    }
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
    ready=true;root.querySelector('.loading').hidden=true;canvas.focus();
  }catch{root.querySelector('.loading').textContent='The town artwork could not load. Please reload the page.';}
}
init();requestAnimationFrame(render);
