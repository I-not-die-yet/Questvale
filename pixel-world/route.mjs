export const SIZE={width:1672,height:941};
export const SPAWN={x:1360,y:835};
export const ROUTE=[{x:1360,y:835},{x:1110,y:840},{x:1040,y:815},{x:950,y:760},{x:890,y:700},{x:825,y:660},{x:760,y:630},{x:670,y:610},{x:590,y:560},{x:555,y:520},{x:560,y:475}];
export function pointDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
export function walkable(p){
  const plaza=p.x>1050&&p.x<1630&&p.y>730&&p.y<910;
  const landing=p.x>460&&p.x<725&&p.y>470&&p.y<550;
  return plaza||landing||ROUTE.slice(1).some((b,i)=>pointDistance(p,ROUTE[i],b)<48);
}
export function advance(p,input,dt){
  const d=200*Math.min(.035,dt),n=Math.hypot(input.x,input.y)||1;
  const x=p.x+input.x/n*d,y=p.y+input.y/n*d;
  const next={...p};if(walkable({x,y:p.y}))next.x=x;if(walkable({x:next.x,y}))next.y=y;return next;
}
export function nearby(p){return Math.hypot(p.x-560,p.y-478)<72?'hackathon':Math.hypot(p.x-1530,p.y-730)<95?'all':null;}
