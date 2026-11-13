import test from 'node:test';
import assert from 'node:assert/strict';
import {detectSpriteFrames,previewPlacement} from '../sprite-preview-layout.mjs';
test('frames in different source columns share the same screen anchor',()=>{
  const idle={x:300,y:30,w:20,h:40,anchorX:310};
  for(const x of [20,300,600]){
    const p=previewPlacement({x,y:900,w:20,h:40,anchorX:x+10},idle,125,232,160);
    assert.deepEqual(p,{x:85,y:72,w:80,h:160});
  }
});
test('stride height changes keep feet on the ground and scale constant',()=>{
  const idle={h:40};
  for(const h of [38,40,42]){
    const p=previewPlacement({x:0,w:20,h,anchorX:10},idle,125,232,160);
    assert.equal(p.y+p.h,232);assert.equal(p.w,80);
  }
});
test('unequal source row spacing is detected without clipping',()=>{
  const width=90,height=70,data=new Uint8ClampedArray(width*height*4);
  for(let col=0;col<3;col++)for(const [top,bottom] of [[2,22],[27,43],[50,68]])for(let y=top;y<bottom;y++)for(let x=col*30+5;x<col*30+15;x++)data[(y*width+x)*4+3]=255;
  const rows=detectSpriteFrames(data,width,height,3);
  assert.deepEqual(rows.map(row=>row[0].y),[2,27,50]);
  assert.deepEqual(rows.map(row=>row[0].h),[20,16,18]);
});
