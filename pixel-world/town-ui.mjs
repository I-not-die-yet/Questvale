export function createTownUI(root,map){
  const dock=document.createElement('section');dock.className='chat-dock';dock.setAttribute('aria-label','Town conversations');
  dock.innerHTML=`<div class="chat-top"><div role="tablist" aria-label="Conversation"><button role="tab" id="ai-tab" aria-controls="chat-panel" aria-selected="true" data-channel="advisor">AI Advisor</button><button role="tab" id="town-tab" aria-controls="chat-panel" aria-selected="false" tabindex="-1" data-channel="town">Town Chat</button></div><button class="chat-toggle" aria-label="Expand conversation" aria-expanded="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 12 5-5 5 5"/></svg></button></div><div class="chat-panel" id="chat-panel" role="tabpanel" aria-labelledby="ai-tab" hidden><div class="chat-context"><strong>Private AI conversation</strong><span class="chat-status">AI is not connected</span></div><div class="chat-history" role="log" aria-label="Conversation messages"></div></div><form class="chat-form"><label class="sr" for="town-message">Message AI Advisor</label><textarea id="town-message" rows="1" maxlength="500" placeholder="What would you like to explore?" aria-describedby="chat-disclosure"></textarea><button type="submit" disabled aria-label="Preview your message"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 15V5m-5 5 5-5 5 5"/></svg></button></form><p class="chat-disclosure" id="chat-disclosure">Local preview only · messages are not sent or saved.</p>`;
  root.append(dock);
  const panel=dock.querySelector('.chat-panel'),input=dock.querySelector('textarea'),send=dock.querySelector('[type=submit]'),toggle=dock.querySelector('.chat-toggle');
  const history=dock.querySelector('.chat-history'),tabs=[...dock.querySelectorAll('[role=tab]')];
  const channels={advisor:{draft:'',messages:[]},town:{draft:'',messages:[]}};
  let channel='advisor',expanded=false;
  function pause(){root.dataset.inputBusy='true';root.dispatchEvent(new Event('qv-input-pause'));}
  function setExpanded(value){
    expanded=value;panel.hidden=!value;root.dataset.chatExpanded=String(value);
    toggle.setAttribute('aria-expanded',String(value));toggle.setAttribute('aria-label',value?'Collapse conversation':'Expand conversation');
  }
  function renderHistory(){
    history.replaceChildren();
    if(!channels[channel].messages.length){
      const empty=document.createElement('div');empty.className='chat-empty';
      const title=document.createElement('strong');title.textContent=channel==='advisor'?'Where would you like to go next?':'Meet at the town square.';
      const text=document.createElement('p');text.textContent=channel==='advisor'?'Share your interests, goals or experience.':'A space to exchange ideas and find teammates.';
      empty.append(title,text);history.append(empty);
    }
    for(const text of channels[channel].messages){
      const message=document.createElement('div');message.className='chat-message';
      const by=document.createElement('small');by.textContent='You · local preview';
      const body=document.createElement('p');body.textContent=text;message.append(by,body);history.append(message);
    }
    history.scrollTop=history.scrollHeight;
  }
  function select(next,focus=false){
    channels[channel].draft=input.value;channel=next;
    for(const tab of tabs){const selected=tab.dataset.channel===channel;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
    panel.setAttribute('aria-labelledby',channel==='advisor'?'ai-tab':'town-tab');
    dock.querySelector('.chat-context strong').textContent=channel==='advisor'?'Private AI conversation':'Public town channel';
    dock.querySelector('.chat-status').textContent=channel==='advisor'?'AI is not connected':'Shared chat is not connected';
    dock.querySelector('label').textContent=channel==='advisor'?'Message AI Advisor':'Message Town Chat';
    input.placeholder=channel==='advisor'?'What would you like to explore?':'Share an idea or look for teammates…';
    input.value=channels[channel].draft;send.disabled=!input.value.trim();renderHistory();setExpanded(true);
    if(focus)input.focus();
  }
  for(const tab of tabs){
    tab.addEventListener('click',()=>select(tab.dataset.channel));
    tab.addEventListener('keydown',e=>{
      if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
        e.preventDefault();e.stopPropagation();const next=e.key==='Home'?'advisor':e.key==='End'?'town':channel==='advisor'?'town':'advisor';select(next);tabs.find(t=>t.dataset.channel===next).focus();
      }
    });
  }
  toggle.addEventListener('click',()=>{
    setExpanded(!expanded);
    if(!expanded)root.querySelector('canvas').focus();
  });
  input.addEventListener('focus',()=>setExpanded(true));
  input.addEventListener('input',()=>{channels[channel].draft=input.value;send.disabled=!input.value.trim();});
  dock.addEventListener('focusin',pause);
  dock.addEventListener('focusout',e=>{if(!dock.contains(e.relatedTarget))root.dataset.inputBusy='false';});
  dock.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setExpanded(false);root.querySelector('canvas').focus();}
    if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.target===input){e.preventDefault();dock.querySelector('form').requestSubmit();}
  });
  dock.querySelector('form').addEventListener('submit',e=>{
    e.preventDefault();const text=input.value.trim();if(!text)return;
    channels[channel].messages.push(text);if(channels[channel].messages.length>30)channels[channel].messages.shift();
    channels[channel].draft='';input.value='';send.disabled=true;setExpanded(true);renderHistory();input.focus();
  });
  renderHistory();
  const mini=document.createElement('aside');mini.className='mini-map';mini.setAttribute('aria-label','Town overview map');
  mini.innerHTML=`<button class="mini-toggle" aria-expanded="true" aria-controls="mini-body"><span>Town map</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 12 5-5 5 5"/></svg></button><div id="mini-body"><canvas class="mini-canvas" width="480" height="320" role="img" aria-label="Map showing the four destinations and your live position"></canvas><div class="mini-legend"><span class="player-key"></span>You are here<span class="mini-north">N ↑</span></div></div>`;
  root.append(mini);
  mini.addEventListener('focusin',pause);
  mini.addEventListener('focusout',e=>{if(!mini.contains(e.relatedTarget))root.dataset.inputBusy='false';});
  const mc=mini.querySelector('canvas'),mctx=mc.getContext('2d');mctx.imageSmoothingEnabled=false;
  mini.querySelector('button').addEventListener('click',()=>{
    const body=mini.querySelector('#mini-body');body.hidden=!body.hidden;mini.querySelector('button').setAttribute('aria-expanded',String(!body.hidden));
  });
  let cached=null,lastPaint=0;
  const names={hackathon:'Hackathon',business:'Business',startup:'Startup',research:'Research'};
  return {update(player,background,buildings,time){
    if(mini.querySelector('#mini-body').hidden||time-lastPaint<80)return;lastPaint=time;
    if(!cached){
      cached=document.createElement('canvas');cached.width=480;cached.height=320;const c=cached.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(background,0,0,480,320);
      c.save();c.scale(480/map.SIZE.width,320/map.SIZE.height);
      c.strokeStyle='#f4c990';c.lineWidth=100;c.lineJoin='round';c.lineCap='round';
      for(const points of map.EXTRA_ROADS){c.beginPath();c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);c.stroke();}
      for(const p of map.PLACES){const r=map.buildingRect(p);c.drawImage(buildings[p.asset],...p.crop,r.x,r.y,r.width,r.height);}c.restore();
      c.font='600 17px system-ui';c.textAlign='center';c.textBaseline='top';
      for(const p of map.PLACES){const x=p.x/map.SIZE.width*480,y=(p.y+50)/map.SIZE.height*320;const text=names[p.category],w=c.measureText(text).width;c.fillStyle='#faf1d7';c.fillRect(x-w/2-5,y-2,w+10,23);c.fillStyle='#253f35';c.fillText(text,x,y);}
    }
    mctx.drawImage(cached,0,0);
    const dx=player.x-map.SPAWN.x,dy=player.y-map.SPAWN.y;
    const area=Math.abs(dx)<180&&Math.abs(dy)<180?'at the central square':(dy<-180?'north':dy>180?'south':'')+(dx<-180?'west':dx>180?'east':'')+' of the central square';
    mc.setAttribute('aria-label','Town map: Hackathon northwest, Business northeast, Startup southwest, Research southeast. You are '+area+'.');
    const x=player.x/map.SIZE.width*480,y=player.y/map.SIZE.height*320;
    mctx.beginPath();mctx.arc(x,y,8,0,Math.PI*2);mctx.fillStyle='#fff7df';mctx.fill();mctx.lineWidth=2;mctx.strokeStyle='#203d32';mctx.stroke();
    mctx.beginPath();mctx.arc(x,y,4,0,Math.PI*2);mctx.fillStyle='#203d32';mctx.fill();
  }};
}
