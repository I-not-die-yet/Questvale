export const GUIDE={x:1770,y:1070,radius:105};
export const TOUR={
  hackathon:{label:'Hackathon',direction:'northwest',text:'The maker workshop is a place to discover hackathons, build projects and meet teammates.'},
  business:{label:'Business',direction:'northeast',text:'The exchange hall brings together business cases, strategy challenges and opportunities to connect.'},
  startup:{label:'Startup',direction:'southwest',text:'The launch studio is for exploring entrepreneurship, product ideas and startup programmes.'},
  research:{label:'Research',direction:'southeast',text:'The observatory is where you can explore research programmes and academic opportunities.'},
};
export const guideNearby=p=>Math.hypot(p.x-GUIDE.x,p.y-GUIDE.y)<GUIDE.radius;
export const guideBlocked=p=>Math.hypot(p.x-GUIDE.x,p.y-GUIDE.y)<35;

export function createGuide(root,townUI){
  let active=false,view='hello',image=null,bounds=null;
  const panel=document.createElement('section');panel.className='chat-dock guide-dock';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','guide-heading');
  panel.innerHTML='<div class="chat-top"><strong id="guide-heading">Town Guide</strong><button class="guide-close" aria-label="End conversation">×</button></div><div class="guide-body"><img src="assets/town-guide-v3.png" class="guide-portrait" alt=""><div class="guide-copy"><p class="guide-line"></p><div class="guide-options"></div></div></div><p class="guide-footer">Esc · Back to exploring</p>';
  root.append(panel);
  const line=panel.querySelector('.guide-line'),options=panel.querySelector('.guide-options');
  const nearbyButton=document.createElement('button');nearbyButton.className='hotspot workshop guide-label';nearbyButton.textContent='Town Guide';nearbyButton.setAttribute('aria-label','Talk to Town Guide');nearbyButton.hidden=true;root.append(nearbyButton);
  const hint=document.createElement('p');hint.className='guide-route-hint';hint.hidden=true;hint.setAttribute('aria-live','polite');root.append(hint);
  function close(focus=true){
    if(!active)return;
    active=false;panel.hidden=true;root.dataset.guideOpen='false';root.dataset.inputBusy='false';townUI.setGuideActive(false);
    root.dispatchEvent(new Event('qv-input-pause'));
    if(focus)root.querySelector('canvas').focus();
  }
  function action(text,handler){
    const b=document.createElement('button');b.className='guide-choice';b.type='button';b.textContent=text;b.addEventListener('click',handler);options.append(b);
  }
  function render(next){
    view=next;options.replaceChildren();
    if(view==='hello'){
      line.textContent='Welcome to Questvale! Looking for something to build, explore, or try? I can show you around.';
      action('Show me around',()=>render('regions'));
      action('Help me find an opportunity',()=>{close(false);townUI.openAdvisor();});
      action('I’ll explore on my own',()=>close());
    }else if(view==='regions'){
      line.textContent='Four paths, four kinds of opportunity. Which place would you like to know about?';
      for(const [category,r]of Object.entries(TOUR))action(r.label,()=>render(category));
      action('Back',()=>render('hello'));
    }else{
      const r=TOUR[view];
      line.textContent=r.text+' Head '+r.direction+' from the square, then press E near the entrance.';
      action('Mark on map & start exploring',()=>{
        townUI.setDestination(view);hint.textContent='To '+r.label+' · '+r.direction;hint.hidden=false;close();
      });
      action('Explore another district',()=>render('regions'));
      action('Ask something else',()=>render('hello'));
    }
    options.querySelector('button').focus();
  }
  function open(){
    if(active||!image)return;
    active=true;root.dataset.guideOpen='true';root.dataset.inputBusy='true';root.dispatchEvent(new Event('qv-input-pause'));
    townUI.setGuideActive(true);panel.hidden=false;render('hello');
  }
  nearbyButton.addEventListener('click',open);
  panel.querySelector('.guide-close').addEventListener('click',()=>close());
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
  root.addEventListener('qv-destination-reached',()=>{hint.hidden=true;});
  root.addEventListener('qv-panel-open',()=>close(false));
  return {
    open,close,isOpen:()=>active,isNear:guideNearby,blocks:guideBlocked,
    async load(loadImage){
      image=await loadImage('assets/town-guide-v3.png');
      const scratch=document.createElement('canvas');scratch.width=image.width;scratch.height=image.height;
      const c=scratch.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
      const data=c.getImageData(0,0,image.width,image.height).data;
      let l=image.width,r=0,t=image.height,b=0;
      for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(data[(y*image.width+x)*4+3]>160){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
      if(r<=l||b<=t)throw new Error('Guide sprite is empty');
      bounds={x:l,y:t,w:r-l+1,h:b-t+1};
    },
    paint(ctx,camera,scale,actorHeight,actorWidth){
      if(!bounds)return;const h=actorHeight*scale,w=actorWidth*scale;
      ctx.drawImage(image,bounds.x,bounds.y,bounds.w,bounds.h,Math.round((GUIDE.x-camera.x)*scale-w/2),Math.round((GUIDE.y-camera.y)*scale-h),Math.round(w),Math.round(h));
    },
    update(player,camera,scale,width,height){
      const x=(GUIDE.x-camera.x)*scale,y=(GUIDE.y-camera.y)*scale;
      nearbyButton.hidden=active||!guideNearby(player)||x<65||x>width-65||y<120||y>height-175;
      nearbyButton.style.left=x+'px';nearbyButton.style.top=(y-90*scale)+'px';
    },
  };
}
