import {detectSpriteFrames,previewPlacement} from './sprite-preview-layout.mjs';
const names=['Boy','Girl','Robot','Mushroom'];
const directions=['Down','Left','Right','Up','Up-left','Up-right','Down-left','Down-right'];
const focus=document.querySelector('#focus'),all=document.querySelector('#all');
const direction=document.querySelector('#direction'),play=document.querySelector('#play'),slider=document.querySelector('#frame'),backdrop=document.querySelector('#backdrop'),status=document.querySelector('#status');
const contexts=[focus.getContext('2d'),all.getContext('2d')];
let playing=true,step=0,last=0,actors=[];
function load(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Unable to load '+src));image.src=src;});}
function extract(image,rows){
  const scratch=document.createElement('canvas');scratch.width=image.width;scratch.height=image.height;
  const ctx=scratch.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,image.width,image.height).data;
  return detectSpriteFrames(data,image.width,image.height,rows).map(poses=>poses.map(pose=>({...pose,image})));
}

function actor(ctx,index,row,column,x,floor,height){
  const frames=actors[index],f=frames[row][column],idle=frames[row][1];
  const placement=previewPlacement(f,idle,x,floor,height);
  ctx.save();
  if(f.mirror){ctx.translate(2*x,0);ctx.scale(-1,1);}
  ctx.drawImage(f.image,f.x,f.y,f.w,f.h,placement.x,placement.y,placement.w,placement.h);
  ctx.restore();
}
function paint(){
  const column=[0,1,2,1][step],colors={grass:['#89ac61','#30452c'],paper:['#f4e5c7','#493520'],dark:['#26312f','#fff0ce']};
  const [bg,ink]=colors[backdrop.value];
  for(const ctx of contexts){ctx.imageSmoothingEnabled=false;ctx.fillStyle=bg;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.fillStyle=ink;ctx.font='bold 17px monospace';ctx.textAlign='center';for(let i=0;i<4;i++)ctx.fillText(names[i],125+i*250,27);}
  for(let i=0;i<4;i++){
    actor(contexts[0],i,Number(direction.value),column,125+i*250,232,170);
    for(let row=0;row<8;row++)actor(contexts[1],i,row,column,125+i*250,165+row*140,100);
  }
  contexts[1].textAlign='left';contexts[1].font='12px monospace';
  for(let row=0;row<8;row++)contexts[1].fillText(directions[row],10,56+row*140);
}
play.addEventListener('click',()=>{playing=!playing;play.textContent=playing?'Pause':'Play';play.setAttribute('aria-pressed',String(playing));});
slider.addEventListener('input',()=>{playing=false;play.textContent='Play';play.setAttribute('aria-pressed','false');step=Number(slider.value);if(actors.length)paint();});
for(const control of [direction,backdrop])control.addEventListener('change',()=>{if(actors.length)paint();});
try{
  const images=await Promise.all(['boy','girl','robot','mushroom'].map(name=>'assets/character-drafts/'+name+'-walk-rough.png').map(load));
  actors=images.map(image=>extract(image,8));
  // Source robot NW right-step faces NE; mirror the matching NE pose for preview.
  actors[2][4][2]={...actors[2][5][2],mirror:true};
  status.textContent='All 96 poses loaded. Rough pixel drafts. Robot NW right-step uses a mirrored NE pose. Main game unchanged.';
  paint();requestAnimationFrame(function tick(time){if(playing&&time-last>=150){step=(step+1)%4;slider.value=step;last=time;paint();}requestAnimationFrame(tick);});
}catch(error){status.textContent=error.message;play.disabled=true;}
