import {drawSprite} from './sprite-preview-layout.mjs';
import { normalizeProfile } from './character-sprites.mjs';
const STORAGE='questvale.profile.v1';
export function createEntry(root,characters,art,map,onSelect){
  let saved=null;
  try{saved=normalizeProfile(JSON.parse(localStorage.getItem(STORAGE)));}catch{}
  let selected=Math.max(0,characters.findIndex(c=>c.id===saved?.character)),returnToTown=false;
  const gameCanvas=root.querySelector('canvas');
  const overlay=document.createElement('section');overlay.className='entry-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','entry-title');
  overlay.innerHTML=`<canvas class="entry-world" width="1536" height="1024" aria-hidden="true"></canvas><div class="entry-shade"></div><div class="entry-content"><h1 id="entry-title" class="entry-logo">Questvale</h1><p class="entry-tagline">Find your next chapter</p><div class="entry-welcome"><button class="entry-start">Start exploring</button><p>Choose your character. Explore your possibilities.</p></div><form class="character-picker" hidden><h2>Choose your character</h2><div class="character-hero"><button type="button" class="character-prev" aria-label="Previous character">◀</button><canvas width="200" height="210" aria-label="Selected character animation"></canvas><button type="button" class="character-next" aria-label="Next character">▶</button></div><div class="character-options" role="group" aria-label="Character"></div><label class="nickname-label" for="player-nickname">Nickname</label><input id="player-nickname" name="nickname" maxlength="24" autocomplete="nickname" placeholder="Explorer"><button type="submit" class="entry-enter">Enter Questvale</button><p class="entry-hint">You can change your character later.</p><button type="button" class="entry-back">Back</button></form><p class="entry-storage" role="status"></p></div>`;
  root.append(overlay);
  const picker=overlay.querySelector('form'),welcome=overlay.querySelector('.entry-welcome'),input=overlay.querySelector('input'),hero=overlay.querySelector('.character-hero canvas'),options=overlay.querySelector('.character-options');
  const board=overlay.querySelector('.entry-world'),ctx=board.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(art.background,0,0,board.width,board.height);
  ctx.save();ctx.scale(board.width/map.SIZE.width,board.height/map.SIZE.height);
  for(const p of map.PLACES){const rect=map.buildingRect(p);ctx.drawImage(art.buildings[p.asset],...p.crop,rect.x,rect.y,rect.width,rect.height);}ctx.restore();
  function draw(canvas,frames,column,height){
    const c=canvas.getContext('2d');
    c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
    drawSprite(c,frames,0,column,canvas.width/2,canvas.height-10,height);
  }
  const buttons=characters.map((character,index)=>{
    const button=document.createElement('button');button.type='button';button.className='character-option';button.setAttribute('aria-label',character.label);button.innerHTML='<canvas width="96" height="108" aria-hidden="true"></canvas><span></span>';button.querySelector('span').textContent=character.label;draw(button.querySelector('canvas'),character.frames,1,88);button.addEventListener('click',()=>choose(index));options.append(button);return button;
  });
  function choose(index){selected=(index+characters.length)%characters.length;buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));hero.setAttribute('aria-label',characters[selected].label+' walking preview');draw(hero,characters[selected].frames,1,172);}
  function lock(value){
    root.dataset.entryOpen=String(value);root.dispatchEvent(new Event('qv-input-pause'));
    for(const child of root.children)if(child!==overlay)child.inert=value;
    overlay.hidden=!value;
  }
  function selectScreen(){welcome.hidden=true;picker.hidden=false;overlay.classList.add('choosing');buttons[selected].focus();}
  function titleScreen(){welcome.hidden=false;picker.hidden=true;overlay.classList.remove('choosing');overlay.querySelector('.entry-start').focus();}
  function close(animate=true){
    if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){lock(false);gameCanvas.focus();return;}
    if(overlay.classList.contains('is-leaving'))return;
    overlay.classList.add('is-leaving');
    setTimeout(()=>{lock(false);overlay.classList.remove('is-leaving');gameCanvas.focus();},250);
  }
  overlay.querySelector('.entry-start').addEventListener('click',selectScreen);
  overlay.querySelector('.character-prev').addEventListener('click',()=>choose(selected-1));overlay.querySelector('.character-next').addEventListener('click',()=>choose(selected+1));
  overlay.querySelector('.entry-back').addEventListener('click',()=>returnToTown?close():titleScreen());
  picker.addEventListener('submit',e=>{
    e.preventDefault();const profile=normalizeProfile({character:characters[selected].id,nickname:input.value});
    onSelect(characters[selected],profile);saved=profile;
    try{localStorage.setItem(STORAGE,JSON.stringify(profile));}catch{root.querySelector('#selection-status').textContent='Character selected. Browser storage unavailable; selection lasts for this visit.';}
    close();
  });
  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();returnToTown?close():titleScreen();}
    if(e.key==='Tab'){
      const targets=[...overlay.querySelectorAll('button,input')].filter(el=>!el.closest('[hidden]'));
      const first=targets[0],last=targets.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  const change=document.createElement('button');change.type='button';change.className='change-character';change.textContent='Change character';
  change.addEventListener('click',()=>{returnToTown=true;selected=Math.max(0,characters.findIndex(c=>c.id===saved?.character));input.value=saved?.nickname||'';choose(selected);lock(true);selectScreen();});
  root.querySelector('.actions').append(change);
  input.value=saved?.nickname||'';choose(selected);
  onSelect(characters[selected],saved||{character:characters[selected].id,nickname:'Explorer'});
  if(saved)close(false);else{lock(true);titleScreen();}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let last=0,step=0;
  requestAnimationFrame(function animate(time){
    if(!overlay.hidden&&!picker.hidden&&time-last>160){last=time;draw(hero,characters[selected].frames,reduced.matches?1:[0,1,2,1][step++%4],172);}
    requestAnimationFrame(animate);
  });
}
