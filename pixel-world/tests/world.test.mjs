import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, PLACES, BOARD, blocked, move, nearby, door, cameraAt } from '../world.mjs';
test('spawn is clear and no category building is visible in the largest field of view', () => {
  assert.equal(blocked(WORLD.spawn.x, WORLD.spawn.y), false);
  const camera=cameraAt(WORLD.spawn,640,440);
  for(const p of PLACES) assert.ok(p.x+160<camera.x||p.x>camera.x+640||p.y+128<camera.y||p.y>camera.y+440);
});
test('diagonal and straight travel have identical speed', () => {
  const p=WORLD.spawn, a=move(p,{x:1,y:0},.05),b=move(p,{x:1,y:1},.05);
  assert.ok(Math.abs(Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))<1e-8);
});
test('walls and world boundary block movement, and long pauses are bounded', () => {
  const p={x:570,y:571};assert.equal(move(p,{x:0,y:-1},.05).y,571);
  assert.equal(move({x:42,y:300},{x:-1,y:0},.05).x,42);
  assert.ok(move(WORLD.spawn,{x:1,y:0},100).x-WORLD.spawn.x<=5.25);
});
test('only nearby door and board interactions are offered', () => {
  assert.equal(nearby(WORLD.spawn),null);
  for(const p of PLACES) assert.equal(nearby(door(p)).category,p.category);
  assert.equal(nearby({x:BOARD.x,y:BOARD.y+24}).category,null);
});
test('each door can be reached from spawn using runtime collision rules', () => {
  const cell=10,start={x:1280,y:1010},queue=[start],seen=new Set(['1280,1010']);
  for(let i=0;i<queue.length;i++) {
    const p=queue[i];
    for(const [dx,dy] of [[10,0],[-10,0],[0,10],[0,-10]]) {
      const n={x:p.x+dx,y:p.y+dy},k=n.x+','+n.y;
      if(!seen.has(k)&&!blocked(n.x,n.y)){seen.add(k);queue.push(n);}
    }
  }
  for(const p of PLACES) {const d=door(p);assert.ok(seen.has(d.x+','+d.y),p.category);}
});
test('camera remains within map limits', () => {
  assert.deepEqual(cameraAt({x:0,y:0},480,300),{x:0,y:0});
  assert.deepEqual(cameraAt({x:WORLD.width,y:WORLD.height},480,300),{x:2080,y:1620});
});
