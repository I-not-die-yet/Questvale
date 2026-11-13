import { pointDistance } from './route.mjs';
export const SIZE={width:3072,height:2048};
export const SPAWN={x:1536,y:1130};
export const PLACES=[
  {category:'hackathon',label:'Hackathon',place:'Maker workshop',x:660,y:650,width:550,asset:'hack',crop:[236,163,1032,694],anchor:.542},
  {category:'business',label:'Business',place:'Exchange hall',x:2400,y:650,width:550,asset:'kit',crop:[83,105,701,482],anchor:.5},
  {category:'startup',label:'Startup',place:'Launch studio',x:640,y:1590,width:490,asset:'kit',crop:[824,185,613,376],anchor:.63},
  {category:'research',label:'Research',place:'Observatory',x:2400,y:1590,width:500,asset:'kit',crop:[1519,135,579,424],anchor:.5},
];
export const BOARD={x:1536,y:820};
export const ROUTES=[
  [SPAWN,{x:1280,y:970},{x:1080,y:930},{x:900,y:830},{x:760,y:760},{x:660,y:650}],
  [SPAWN,{x:1800,y:970},{x:1980,y:900},{x:2180,y:800},{x:2330,y:710},{x:2400,y:650}],
  [SPAWN,{x:1280,y:1210},{x:1120,y:1310},{x:1030,y:1430},{x:1000,y:1530},{x:940,y:1590},{x:640,y:1590}],
  [SPAWN,{x:1800,y:1210},{x:1960,y:1310},{x:2030,y:1430},{x:2060,y:1530},{x:2120,y:1590},{x:2400,y:1590}],
];
export const EXTRA_ROADS=ROUTES.slice(2).map(r=>r.slice(2));
export function buildingRect(p){const h=p.width*p.crop[3]/p.crop[2];return{x:p.x-p.width*p.anchor,y:p.y-h,width:p.width,height:h};}
export function walkable(p){
  if(p.x<30||p.y<30||p.x>SIZE.width-30||p.y>SIZE.height-30)return false;
  if(PLACES.some(b=>{const r=buildingRect(b);return p.x>r.x+12&&p.x<r.x+r.width-12&&p.y>r.y+30&&p.y<b.y-10;}))return false;
  if(p.x>1390&&p.x<1690&&p.y>580&&p.y<800)return false;
  const plaza=((p.x-1536)/365)**2+((p.y-1050)/265)**2<1;
  const boardApproach=p.x>1480&&p.x<1590&&p.y>815&&p.y<1050;
  return plaza||boardApproach||ROUTES.some(route=>route.slice(1).some((b,i)=>pointDistance(p,route[i],b)<62));
}
export function advance(p,input,dt){
  const d=250*Math.min(.035,dt),n=Math.hypot(input.x,input.y)||1,next={...p};
  const x=p.x+input.x/n*d,y=p.y+input.y/n*d;
  if(walkable({x,y:p.y}))next.x=x;
  if(walkable({x:next.x,y}))next.y=y;
  return next;
}
export function nearby(p){return PLACES.find(b=>Math.hypot(p.x-b.x,p.y-b.y)<90)?.category??(Math.hypot(p.x-BOARD.x,p.y-BOARD.y)<110?'all':null);}
