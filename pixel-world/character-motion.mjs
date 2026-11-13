// Sheet row order: down, left, right, up, northwest, northeast, southwest, southeast.
export function facingFor(input, previous) {
  if(input.x&&input.y)return input.y<0?(input.x<0?4:5):(input.x<0?6:7);
  if(input.x)return input.x<0?1:2;
  if(input.y)return input.y<0?3:0;
  return previous;
}
