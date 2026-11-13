import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROOM_SPAWN,ROOM_BOARD,ROOM_EXIT,FURNITURE,roomWalkable,roomAdvance,roomNearby,createWorkshopVisit} from '../workshop.mjs';
test('entrance is clear and offers a deliberate return interaction',()=>{
  assert.equal(roomWalkable(ROOM_SPAWN),true);
  assert.equal(roomNearby(ROOM_SPAWN),'exit');assert.equal(roomWalkable(ROOM_EXIT),true);
});
test('walk from entrance to noticeboard and back through the central aisle',()=>{
  let player={...ROOM_SPAWN};
  for(const target of [ROOM_BOARD,ROOM_SPAWN]){
    let steps=0;
    while(Math.hypot(player.x-target.x,player.y-target.y)>3&&steps++<500){
      const next=roomAdvance(player,{x:target.x-player.x,y:target.y-player.y},.01);
      assert.ok(roomWalkable(next));assert.notDeepEqual(next,player);player=next;
    }
    assert.ok(steps<500);assert.equal(roomNearby(player),target===ROOM_BOARD?'board':'exit');
  }
});
test('furniture, walls and outside areas block movement',()=>{
  for(const r of FURNITURE)assert.equal(roomWalkable({x:r.x+r.width/2,y:r.y+r.height/2}),false);
  for(const p of [{x:50,y:850},{x:1490,y:850},{x:768,y:400},{x:768,y:940}])assert.equal(roomWalkable(p),false);
  const besideTable={x:552,y:650};assert.equal(roomWalkable(besideTable),true);
  assert.deepEqual(roomAdvance(besideTable,{x:-1,y:0},.035),besideTable);
});
test('diagonal speed is normalized and long frames are capped',()=>{
  const p={x:768,y:700},a=roomAdvance(p,{x:1,y:0},.01),b=roomAdvance(p,{x:1,y:1},.01);
  assert.ok(Math.abs(Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))<1e-8);
  assert.equal(roomAdvance(p,{x:1,y:0},100).x-p.x,17.0625);
});
test('leaving restores a snapshot of the exact town position and facing',()=>{
  const visit=createWorkshopVisit(),outside={x:660.25,y:650.5};
  const spawn=visit.enter(outside,3);outside.x=0;spawn.y=0;
  assert.deepEqual(visit.leave(),{player:{x:660.25,y:650.5},direction:3});assert.equal(visit.leave(),null);
});
