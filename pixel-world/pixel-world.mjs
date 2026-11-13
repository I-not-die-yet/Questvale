import { validateProps, REGIONS, selectionSummary } from './contract.mjs';
import { WORLD, PLACES, BOARD, door, move, nearby, cameraAt } from './world.mjs';
import { drawTree, drawBuilding, drawPlayer } from './art.mjs';

export function createPixelWorld(host, incoming) {
  validateProps(incoming);
  let props = incoming, player = { ...WORLD.spawn }, facing = 'down', walking = 0;
  let frame, last = 0, modal = null, previousFocus = null, destroyed = false;
  const keys = new Set();
  const root = document.createElement('section');
  root.className = 'qv-world';
  root.innerHTML = `
    <canvas tabindex="0" aria-label="Questvale town. Move with WASD or arrow keys. Walk to a building and press E. Use Places for a keyboard-accessible destination list."></canvas>
    <header class="qv-hud"><a class="qv-brand" href="#world" aria-label="Questvale home"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 18 9 6l4 6 3-4 6 10M7 10l2 3 3-2"/></svg>Questvale<span>Explore your next chapter</span></a>
    <div class="qv-actions"><button class="qv-places-toggle">Places</button><button class="qv-advisor"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v12H9l-4 4V4Z"/><path d="M8 9h8M8 12h5"/></svg>AI Advisor</button></div></header>
    <div class="qv-location">Central square</div>
    <nav class="qv-destinations" aria-label="Explore places" hidden><h2>Where to?</h2><p>Choose directly, or follow the signposts.</p></nav>
    <div class="qv-labels"></div>
    <div class="qv-signs"></div>
    <button class="qv-interact" hidden><kbd>E</kbd><span></span></button>
    <footer class="qv-help"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span><span><kbd>E</kbd> Interact</span><span><kbd>Esc</kbd> Close</span></footer>
    <div class="qv-touch" aria-label="Movement controls"><button data-dir="up" aria-label="Move north">↑</button><button data-dir="left" aria-label="Move west">←</button><button data-dir="down" aria-label="Move south">↓</button><button data-dir="right" aria-label="Move east">→</button></div>
    <p class="qv-live qv-sr" aria-live="polite"></p>
    <dialog class="qv-dialog"><button class="qv-close" aria-label="Close panel">×</button><div class="qv-panel-content"></div></dialog>
  `;
  host.append(root);
  const $ = s => root.querySelector(s);
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const dialog = $('dialog'), content = $('.qv-panel-content'), nav = $('nav');
  const interact = $('.qv-interact'), labelLayer = $('.qv-labels');
  const signs = [[1232,867,'← Hackathon · Business →'],[1325,1145,'← Startup · Research →'],[1280,900,'All opportunities']].map(([x,y,text]) => {
    const node = document.createElement('span');node.className='qv-sign';node.textContent=text;$('.qv-signs').append(node);return {x,y,node};
  });
  const labels = PLACES.map(p => {
    const button = document.createElement('button');
    button.className = 'qv-map-label';
    button.addEventListener('click', () => openCategory(p));
    labelLayer.append(button);
    return { p, button };
  });
  for (const p of [...PLACES, BOARD]) {
    const button = document.createElement('button');
    button.textContent = p.label;
    button.addEventListener('click', () => openCategory(p, $('.qv-places-toggle')));
    nav.append(button);
  }
  $('.qv-places-toggle').setAttribute('aria-expanded', 'false');
  const abort = new AbortController(), signal = abort.signal;
  function close() { if (dialog.open) dialog.close(); }
  function openPanel(kind, returnFocus = document.activeElement) {
    keys.clear(); previousFocus = returnFocus; modal = kind;
    nav.hidden = true;
    $('.qv-places-toggle').setAttribute('aria-expanded', 'false');
    if (!dialog.open) dialog.showModal();
    $('.qv-close').focus();
  }
  function openCategory(p, returnFocus = document.activeElement) {
    props.onRegionSelect(p.category);
    content.replaceChildren();
    const title = document.createElement('h1'); title.id = 'qv-panel-title'; title.textContent = p.label;
    const sub = document.createElement('p'); sub.className = 'qv-panel-sub'; sub.textContent = p.place || 'The town noticeboard';
    const empty = document.createElement('div'); empty.className = 'qv-empty';
    const heading = document.createElement('h2'); heading.textContent = 'You’ve found your way here.';
    const text = document.createElement('p'); text.textContent = 'This exploration preview has no opportunity listings connected yet. Your category selection is passed to the host application.';
    empty.append(heading, text);
    const back = document.createElement('button'); back.className = 'qv-primary'; back.textContent = 'Back to exploring'; back.addEventListener('click', close);
    content.append(sub, title, empty, back);
    dialog.setAttribute('aria-labelledby', title.id);
    openPanel('category', returnFocus);
  }
  function openAdvisor() {
    content.innerHTML = `<p class="qv-panel-sub">Your opportunity guide</p><h1 id="qv-panel-title">What would you like to explore?</h1><p>Describe your interests, experience, or what you want to try next.</p><label for="qv-message">Tell your advisor</label><textarea id="qv-message" placeholder="I’m a first-year student curious about hackathons, but I haven’t coded before…" rows="5"></textarea><p class="qv-preview-note">Preview only · AI is not connected. Nothing you type is sent or saved.</p><button class="qv-primary" disabled>Analysis available after integration</button>`;
    dialog.setAttribute('aria-labelledby', 'qv-panel-title');
    openPanel('advisor');
    $('textarea').focus();
  }
  $('.qv-close').addEventListener('click', close);
  dialog.addEventListener('close', () => { modal = null; keys.clear(); previousFocus?.isConnected && previousFocus.focus(); });
  $('.qv-advisor').addEventListener('click', openAdvisor);
  $('.qv-places-toggle').addEventListener('click', () => {
    nav.hidden = !nav.hidden; keys.clear();
    $('.qv-places-toggle').setAttribute('aria-expanded', String(!nav.hidden));
    if (!nav.hidden) nav.querySelector('button').focus();
  });
  interact.addEventListener('click', () => { const p = nearby(player); if (p) openCategory(p); });
  function clearKeys() { keys.clear(); }
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !nav.hidden) { nav.hidden = true; $('.qv-places-toggle').setAttribute('aria-expanded', 'false'); $('.qv-places-toggle').focus(); }
    if (modal || !nav.hidden || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)) { e.preventDefault(); keys.add(key); }
    if (key === 'e' && !e.repeat) { const p = nearby(player); if (p) { e.preventDefault(); openCategory(p); } }
  }, { signal });
  root.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()), { signal });
  window.addEventListener('blur', clearKeys, { signal });
  document.addEventListener('visibilitychange', clearKeys, { signal });
  root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) clearKeys(); }, { signal });
  for (const button of root.querySelectorAll('[data-dir]')) {
    // Pointer controls supplement the canvas's WASD / arrow-key controls.
    button.tabIndex = -1;
    const key = { up:'w', left:'a', down:'s', right:'d' }[button.dataset.dir];
    button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); keys.add(key); });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, () => keys.delete(key));
  }
  const floor = document.createElement('canvas');
  floor.width = WORLD.width; floor.height = WORLD.height;
  const ground = floor.getContext('2d');
  function rect(c,x,y,w,h,color) { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),w,h); }
  rect(ground,0,0,WORLD.width,WORLD.height,'#82a85b');
  let seed = 71031;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  for (let i=0;i<16000;i++) {
    const x=Math.floor(random()*WORLD.width), y=Math.floor(random()*WORLD.height);
    rect(ground,x,y,random()>.7?3:1,2,random()>.5?'#769c51':'#91b565');
  }
  function road(points, width=42) {
    for (let i=1;i<points.length;i++) {
      const a=points[i-1], b=points[i], distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
      for(const edge of [true,false]) for(let n=0;n<=distance;n+=4) {
        const t=n/distance, x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
        if(edge) rect(ground,x-width/2-2,y-width/2-2,width+4,width+4,'#b5ad70');
        else rect(ground,x-width/2,y-width/2,width,width,'#d9bf86');
      }
    }
  }
  for(const p of PLACES) {
    const d=door(p), top=p.y<1000, left=p.x<1280;
    road([[1280,1000],[1280,top?825:1160],[left?1080:1480,top?740:1260],[d.x,top?740:1260],[d.x,d.y]]);
  }
  for (let y=-76;y<=76;y+=4) {
    const w=Math.floor(Math.sqrt(76*76-y*y))*2;
    rect(ground,1280-w/2,1000+y,w,4,'#b5ad70');
    rect(ground,1282-w/2,1000+y,Math.max(0,w-4),4,'#d9bf86');
  }
  for(let i=0;i<120;i++) { const a=random()*Math.PI*2,r=random()*66; rect(ground,1280+Math.cos(a)*r,1000+Math.sin(a)*r,5,2,'#c7ad76'); }
  const trees=[{x:1110,y:935,v:0},{x:1460,y:965,v:1},{x:1120,y:1080,v:2},{x:1450,y:1100,v:0},{x:1180,y:850,v:1},{x:1370,y:845,v:2}];
  for(let i=0;i<240;i++) {
    const x=Math.floor(random()*(WORLD.width-90))+45,y=Math.floor(random()*(WORLD.height-90))+45;
    const isOuter=x<300||x>2260||y<280||y>1700;
    if(isOuter && !PLACES.some(p=>Math.abs(p.x+80-x)<150&&Math.abs(p.y+100-y)<150)) trees.push({x,y,v:i%3});
  }
  // Flowers and benches frame the square; the main approach stays clear.
  for (const [x,y] of [[1160,920],[1395,920],[1150,1100],[1400,1100]]) {
    for(let i=0;i<8;i++) {
      const px=x+(i%4)*6,py=y+Math.floor(i/4)*7;
      rect(ground,px,py,1,5,'#527d47');rect(ground,px-1,py-2,3,3,i%2?'#e3ca72':'#e7b29a');
    }
  }
  let scale=3,width=480,height=300;
  function resize() {
    scale=Math.max(2,Math.floor(Math.min(root.clientWidth/480,root.clientHeight/270)));
    width=Math.ceil(root.clientWidth/scale);height=Math.ceil(root.clientHeight/scale);
    // Cap the field of view even on ultrawide displays.
    scale=Math.max(scale,Math.ceil(root.clientWidth/640),Math.ceil(root.clientHeight/440));
    width=Math.ceil(root.clientWidth/scale);height=Math.ceil(root.clientHeight/scale);
    canvas.width=width;canvas.height=height;
    canvas.style.width=width*scale+'px';canvas.style.height=height*scale+'px';
    ctx.imageSmoothingEnabled=false;
  }
  const observer = new ResizeObserver(resize);observer.observe(root);resize();
  let lastNear;
  function render(time) {
    if (destroyed) return;
    const dt=last?Math.min((time-last)/1000,.05):0;last=time;
    const input={x:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))};
    if (!modal && nav.hidden) {
      player=move(player,input,dt);
      if(input.x||input.y){facing=input.x?(input.x>0?'right':'left'):(input.y>0?'down':'up');walking+=dt;}
      else walking=0;
    }
    const camera=cameraAt(player,width,height),cx=Math.round(camera.x),cy=Math.round(camera.y);
    ctx.clearRect(0,0,width,height);ctx.drawImage(floor,cx,cy,width,height,0,0,width,height);
    ctx.save();ctx.translate(-cx,-cy);
    for(const p of PLACES) {
      drawBuilding(ctx,p.category,p.x,p.y);
      if(props.activeRegion===p.category) {
        ctx.strokeStyle='#f8e4aa';ctx.lineWidth=2;ctx.strokeRect(p.x-4,p.y+128,168,28);
      }
    }
    const bx=BOARD.x,by=BOARD.y;
    rect(ctx,bx-26,by-28,52,28,'#344c3c');rect(ctx,bx-24,by-26,48,24,'#926840');
    rect(ctx,bx-29,by-31,58,5,'#583f2f');rect(ctx,bx-20,by-20,12,13,'#f5e5bc');rect(ctx,bx-2,by-20,9,8,'#d9bf86');rect(ctx,bx+10,by-19,8,12,'#f5e5bc');
    rect(ctx,bx-22,by,4,11,'#583f2f');rect(ctx,bx+18,by,4,11,'#583f2f');
    for(const [sx,sy,direction] of [[1232,867,'north'],[1325,1145,'south']]) {
      rect(ctx,sx,sy,3,26,'#634d34');rect(ctx,sx-28,sy-4,60,11,'#d7bb83');rect(ctx,sx-28,sy+9,60,11,'#d7bb83');
    }
    const objects=trees.map(t=>({y:t.y,paint:()=>drawTree(ctx,t.x,t.y,t.v)}));
    objects.push({y:player.y,paint:()=>drawPlayer(ctx,Math.round(player.x),Math.round(player.y),facing,Math.floor(walking*8)%4)});
    objects.sort((a,b)=>a.y-b.y).forEach(o=>o.paint());
    ctx.restore();
    for(const {p,button} of labels) {
      const x=(p.x+80-cx)*scale,y=(p.y+158-cy)*scale;
      button.hidden=x<20||x>root.clientWidth-20||y<90||y>root.clientHeight-70;
      button.style.left=x+'px';button.style.top=y+'px';
    }
    for(const {x,y,node} of signs) {
      const sx=(x-cx)*scale,sy=(y-cy)*scale;
      node.hidden=sx<40||sx>root.clientWidth-40||sy<140||sy>root.clientHeight-65;
      node.style.left=sx+'px';node.style.top=sy+'px';
    }
    const near=nearby(player);
    interact.hidden=!near||!!modal||!nav.hidden;
    if(near) interact.querySelector('span').textContent='Explore '+near.label;
    if(near?.label!==lastNear) { lastNear=near?.label;$('.qv-live').textContent=near?'Press E to explore '+near.label:selectionSummary(props); }
    const location=PLACES.find(p=>Math.hypot(door(p).x-player.x,door(p).y-player.y)<235);
    $('.qv-location').textContent=location?location.label+' · '+location.place:Math.hypot(player.x-1280,player.y-1000)<150?'Central square':'Town paths';
    root.dataset.playerX=player.x.toFixed(2);root.dataset.playerY=player.y.toFixed(2);
    root.dataset.nearby=near?.category??(near?'all':'');
    frame=requestAnimationFrame(render);
  }
  function update(next) {
    validateProps(next);props=next;
    for(const {p,button} of labels) {
      const selected=props.activeRegion===p.category,recommended=props.highlightedRegions.includes(p.category);
      button.replaceChildren(document.createTextNode(p.label));
      if(selected) { const check=document.createElement('span');check.textContent='✓ Selected';button.append(check); }
      if(recommended) { const star=document.createElement('span');star.textContent='★ Recommended';button.append(star); }
      button.setAttribute('aria-pressed',String(selected));
      button.setAttribute('aria-label',p.label+(selected?', selected':'')+(recommended?', recommended':''));
    }
    $('.qv-live').textContent=selectionSummary(props);
  }
  update(incoming);frame=requestAnimationFrame(render);
  return { update, destroy() { destroyed=true;cancelAnimationFrame(frame);observer.disconnect();abort.abort();if(dialog.open)dialog.close();root.remove(); } };
}
