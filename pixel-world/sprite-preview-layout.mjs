// Generated sheets have uneven row spacing. Detect each column's opaque bands.
export function detectSpriteFrames(data,width,height,rows=8){
  const columns=[];
  for(let col=0;col<3;col++){
    const x0=Math.floor(col*width/3),x1=Math.floor((col+1)*width/3),bands=[];
    let start=null;
    for(let y=0;y<=height;y++){
      let count=0;
      if(y<height)for(let x=x0;x<x1;x++)if(data[(y*width+x)*4+3]>160)count++;
      if(count>3&&start===null)start=y;
      if(count<=3&&start!==null){bands.push([start,y]);start=null;}
    }
    if(bands.length!==rows)throw new Error('Expected '+rows+' separated sprite rows; found '+bands.length+' in column '+col);
    columns.push(bands.map(([top,end])=>{
      let left=x1,right=x0,bottom=top;
      for(let y=top;y<end;y++)for(let x=x0;x<x1;x++)if(data[(y*width+x)*4+3]>160){left=Math.min(left,x);right=Math.max(right,x);bottom=Math.max(bottom,y);}
      let headLeft=x1,headRight=x0;
      for(let y=top;y<top+(bottom-top+1)*.35;y++)for(let x=left;x<=right;x++)if(data[(y*width+x)*4+3]>160){headLeft=Math.min(headLeft,x);headRight=Math.max(headRight,x);}
      return {x:left,y:top,w:right-left+1,h:bottom-top+1,anchorX:(headLeft+headRight+1)/2};
    }));
  }
  return Array.from({length:rows},(_,row)=>columns.map(column=>column[row]));
}
export function previewPlacement(frame,idle,center,floor,height){
  const scale=height/idle.h;
  return {x:Math.round(center-(frame.anchorX-frame.x)*scale),y:Math.round(floor-frame.h*scale),w:Math.round(frame.w*scale),h:Math.round(frame.h*scale)};
}

export function drawSprite(ctx,frames,direction,column,center,floor,height){
  const frame=frames[direction][column];
  const p=previewPlacement(frame,frames[direction][1],center,floor,height);
  ctx.save();
  if(frame.mirror){ctx.translate(2*center,0);ctx.scale(-1,1);}
  ctx.drawImage(frame.image,frame.x,frame.y,frame.w,frame.h,p.x,p.y,p.w,p.h);
  ctx.restore();
}
