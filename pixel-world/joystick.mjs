const DIRECTIONS=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
export function joystickState(dx,dy,radius){
  const distance=Math.hypot(dx,dy),limit=Math.max(1,radius),factor=distance>limit?limit/distance:1;
  const [x,y]=distance<=limit*.22?[0,0]:DIRECTIONS[(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
  return {x,y,thumbX:dx*factor,thumbY:dy*factor};
}
export function createJoystick(pad,{onInput,enabled}){
  let pointer=null;
  function reset(){
    const previous=pointer;pointer=null;
    onInput({x:0,y:0});pad.style.setProperty('--stick-x','0px');pad.style.setProperty('--stick-y','0px');
    if(previous!==null&&pad.hasPointerCapture(previous))pad.releasePointerCapture(previous);
  }
  function update(e){
    if(e.pointerId!==pointer)return;
    if(!enabled()){reset();return;}
    const rect=pad.getBoundingClientRect(),state=joystickState(e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2,rect.width/2-24);
    pad.style.setProperty('--stick-x',state.thumbX+'px');pad.style.setProperty('--stick-y',state.thumbY+'px');onInput({x:state.x,y:state.y});
  }
  pad.addEventListener('pointerdown',e=>{
    e.preventDefault();if(pointer!==null||!enabled()||(e.pointerType==='mouse'&&e.button!==0))return;
    pointer=e.pointerId;pad.setPointerCapture(pointer);update(e);
  });
  pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();update(e);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,e=>{if(e.pointerId===pointer)reset();});
  window.addEventListener('resize',reset);
  return {reset};
}
