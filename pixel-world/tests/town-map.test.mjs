import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SIZE,SPAWN,PLACES,ROUTES,BOARD,walkable,advance,nearby,buildingRect} from '../town-map.mjs';
import {CATEGORIES} from '../contract.mjs';
test('four-zone map uses the existing category contract and a clear neutral spawn',()=>{
  assert.deepEqual(PLACES.map(p=>p.category),CATEGORIES);
  assert.equal(walkable(SPAWN),true);assert.equal(nearby(SPAWN),null);
});
for(const [index,route] of ROUTES.entries())test('walk to '+PLACES[index].category+' and back without crossing collision',()=>{
  let player={...SPAWN},steps=0;
  const follow=points=>{for(const b of points){let attempts=0;while(Math.hypot(b.x-player.x,b.y-player.y)>3&&attempts++<1500){
    const next=advance(player,{x:b.x-player.x,y:b.y-player.y},.01);
    assert.ok(Math.hypot(next.x-player.x,next.y-player.y)>.01,'Blocked at '+JSON.stringify(player));
    player=next;steps++;
  }assert.ok(attempts<1500);}};
  follow(route.slice(1));assert.equal(nearby(player),PLACES[index].category);
  follow([...route].reverse().slice(1));assert.equal(nearby(player),null);assert.ok(steps<1600);
});
test('each building and the board block their painted footprint',()=>{
  for(const p of PLACES){const r=buildingRect(p);assert.equal(walkable({x:r.x+r.width/2,y:r.y+r.height/2}),false);}
  assert.equal(walkable({x:1536,y:700}),false);
  assert.equal(nearby(BOARD),'all');
  for(const p of [{x:-1,y:100},{x:SIZE.width+1,y:100}])assert.equal(walkable(p),false);
});
test('diagonal movement stays normalized and long pauses cannot tunnel through walls',()=>{
  const a=advance(SPAWN,{x:1,y:0},.01),b=advance(SPAWN,{x:1,y:1},.01);
  assert.ok(Math.abs(Math.hypot(a.x-SPAWN.x,a.y-SPAWN.y)-Math.hypot(b.x-SPAWN.x,b.y-SPAWN.y))<1e-8);
  assert.ok(advance(SPAWN,{x:1,y:0},100).x-SPAWN.x<=8.75);
});
