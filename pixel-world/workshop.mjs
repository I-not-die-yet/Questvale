// Coordinates match the approved 1536 × 1024 interior background.
export const ROOM_SIZE={width:1536,height:1024};
export const ROOM_SPAWN={x:768,y:866};
export const ROOM_BOARD={x:768,y:490};
export const ROOM_EXIT={x:768,y:910};
export const FURNITURE=[
  {x:125,y:220,width:365,height:265},
  {x:530,y:90,width:480,height:365},
  {x:1080,y:265,width:330,height:245},
  {x:180,y:535,width:355,height:255},
  {x:1005,y:535,width:355,height:255},
  {x:75,y:770,width:130,height:140},
  {x:1330,y:770,width:130,height:140},
];
export const ROOMS={
  hackathon:{label:'Hackathon',name:'Workshop',asset:'assets/workshop-interior.png',furniture:FURNITURE},
  business:{label:'Business',name:'Exchange Hall',asset:'assets/business-interior.png',furniture:[
    {x:130,y:220,width:350,height:285},
    {x:530,y:90,width:480,height:365},
    {x:1080,y:280,width:325,height:240},
    {x:180,y:535,width:350,height:255},
    {x:1010,y:535,width:350,height:255},
    {x:75,y:770,width:130,height:140},
    {x:1330,y:770,width:130,height:140},
  ]},
  startup:{label:'Startup',name:'Launch Studio',asset:'assets/startup-interior.png',furniture:[
    {x:130,y:220,width:350,height:265},
    {x:530,y:90,width:480,height:365},
    {x:1080,y:265,width:325,height:245},
    {x:180,y:535,width:350,height:255},
    {x:1010,y:535,width:350,height:255},
    {x:75,y:770,width:130,height:140},
    {x:1330,y:770,width:130,height:140},
  ]},
  research:{label:'Research',name:'Observatory',asset:'assets/research-interior.png',furniture:[
    {x:130,y:220,width:350,height:265},
    {x:530,y:90,width:480,height:365},
    {x:1080,y:220,width:325,height:290},
    {x:175,y:530,width:355,height:260},
    {x:985,y:535,width:385,height:255},
    {x:75,y:770,width:130,height:140},
    {x:1330,y:770,width:130,height:140},
  ]},
};
export function roomWalkable(p,room=ROOMS.hackathon){
  const radius=16;
  if(p.x<100||p.x>1430||p.y<470||p.y>910)return false;
  return !room.furniture.some(r=>p.x>r.x-radius&&p.x<r.x+r.width+radius&&p.y>r.y-radius&&p.y<r.y+r.height+radius);
}
export function roomAdvance(player,input,dt,room=ROOMS.hackathon){
  const length=Math.hypot(input.x,input.y)||1,step=487.5*Math.min(Math.max(dt,0),.035);
  const next={...player};
  const x=next.x+input.x/length*step;if(roomWalkable({x,y:next.y},room))next.x=x;
  const y=next.y+input.y/length*step;if(roomWalkable({x:next.x,y},room))next.y=y;
  return next;
}
export function roomNearby(p){
  if(Math.hypot(p.x-ROOM_EXIT.x,p.y-ROOM_EXIT.y)<65)return 'exit';
  if(Math.hypot(p.x-ROOM_BOARD.x,p.y-ROOM_BOARD.y)<105)return 'board';
  return null;
}
export function createWorkshopVisit(){
  let outside=null;
  return {
    enter(player,direction){outside={player:{...player},direction};return {...ROOM_SPAWN};},
    leave(){const saved=outside;outside=null;return saved;},
  };
}
