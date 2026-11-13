import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATEGORIES} from '../contract.mjs';
import {ROOMS,ROOM_SIZE,ROOM_SPAWN,ROOM_BOARD,ROOM_EXIT,roomWalkable,roomAdvance,roomNearby,createWorkshopVisit} from '../workshop.mjs';
import {PLACES} from '../town-map.mjs';

test('all four categories have a complete interior and a matching PNG canvas',()=>{
  assert.deepEqual(Object.keys(ROOMS),CATEGORIES);
  for(const room of Object.values(ROOMS)){
    const png=readFileSync(new URL('../'+room.asset,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.equal(png.readUInt32BE(16),ROOM_SIZE.width);
    assert.equal(png.readUInt32BE(20),ROOM_SIZE.height);
  }
});
for(const [category,room]of Object.entries(ROOMS)){
  test(category+': walk entrance to board and back, with furniture and walls blocked',()=>{
    let player={...ROOM_SPAWN};
    assert.ok(roomWalkable(player,room));assert.equal(roomNearby(player),'exit');
    for(const target of [ROOM_BOARD,ROOM_EXIT]){
      let steps=0;
      while(Math.hypot(player.x-target.x,player.y-target.y)>3&&steps++<500){
        const next=roomAdvance(player,{x:target.x-player.x,y:target.y-player.y},.01,room);
        assert.ok(roomWalkable(next,room));assert.notDeepEqual(next,player);player=next;
      }
      assert.ok(steps<500);assert.equal(roomNearby(player),target===ROOM_BOARD?'board':'exit');
    }
    for(const r of room.furniture)assert.equal(roomWalkable({x:r.x+r.width/2,y:r.y+r.height/2},room),false);
    for(const p of [{x:60,y:850},{x:1470,y:850},{x:768,y:440},{x:768,y:940}])assert.equal(roomWalkable(p,room),false);
    const wall={x:768,y:910};assert.deepEqual(roomAdvance(wall,{x:0,y:1},.035,room),wall);
  });
}
test('research uses its wider atlas desk rather than the workshop collision footprint',()=>{
  assert.equal(roomWalkable({x:970,y:650},ROOMS.research),false);
  assert.equal(roomWalkable({x:970,y:650},ROOMS.hackathon),true);
});
test('successive visits to different buildings restore each exact town position independently',()=>{
  const visit=createWorkshopVisit();
  for(const [index,place]of PLACES.entries()){
    const player={x:place.x+.25,y:place.y+.5};
    assert.deepEqual(visit.enter(player,index),ROOM_SPAWN);
    assert.deepEqual(visit.leave(),{player,direction:index});
  }
});
