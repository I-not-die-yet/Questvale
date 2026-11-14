import {test} from 'node:test';
import assert from 'node:assert/strict';
import {joystickState} from '../joystick.mjs';
test('central dead zone stops movement',()=>{
  for(const [x,y]of [[0,0],[5,0],[0,-5],[4,4]])assert.deepEqual([joystickState(x,y,40).x,joystickState(x,y,40).y],[0,0]);
});
test('all eight sectors select the intended movement',()=>{
  for(const [x,y]of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]){
    const state=joystickState(x*30,y*30,40);assert.deepEqual([state.x,state.y],[x,y]);
  }
  assert.deepEqual([joystickState(30,2,40).x,joystickState(30,2,40).y],[1,0]);
});
test('thumb stays inside the base even when dragged far outside',()=>{
  for(const [x,y]of [[400,0],[-400,-400],[0,400]]){
    const state=joystickState(x,y,40);assert.ok(Math.abs(Math.hypot(state.thumbX,state.thumbY)-40)<1e-8);
  }
});
