import {test} from 'node:test';
import assert from 'node:assert/strict';
import {facingFor} from '../character-motion.mjs';
import {SPAWN,advance} from '../town-map.mjs';
test('cardinal facings retain their original sprite rows',()=>{
  for(const [x,y,row]of [[0,1,0],[-1,0,1],[1,0,2],[0,-1,3]])assert.equal(facingFor({x,y},3),row);
});
test('each diagonal uses its own three-quarter facing and normalized movement',()=>{
  for(const [x,y,row]of [[-1,-1,4],[1,-1,5],[-1,1,6],[1,1,7]]){
    assert.equal(facingFor({x,y},0),row);
    const p=advance(SPAWN,{x,y},.01);
    assert.equal(Math.sign(p.x-SPAWN.x),x);assert.equal(Math.sign(p.y-SPAWN.y),y);
    const straight=advance(SPAWN,{x:1,y:0},.01);
    assert.ok(Math.abs(Math.hypot(p.x-SPAWN.x,p.y-SPAWN.y)-Math.hypot(straight.x-SPAWN.x,straight.y-SPAWN.y))<1e-8);
  }
});
test('releasing one key returns to cardinal; stopping retains last facing',()=>{
  assert.equal(facingFor({x:0,y:-1},4),3);
  for(let row=0;row<8;row++)assert.equal(facingFor({x:0,y:0},row),row);
});
