import {normalizeSkills} from './skills.mjs';
import {detectSpriteFrames} from './sprite-preview-layout.mjs';
export const CHARACTERS=[
  {id:'boy',label:'Boy',src:'assets/character-drafts/boy-walk-rough.png'},
  {id:'girl',label:'Girl',src:'assets/character-drafts/girl-walk-rough.png'},
  {id:'robot',label:'Robot',src:'assets/character-drafts/robot-walk-rough.png'},
  {id:'mushroom',label:'Mushroom',src:'assets/character-drafts/mushroom-walk-rough.png'}
];
export function normalizeProfile(value){
  if(!value||!CHARACTERS.some(c=>c.id===value.character))return null;
  return {character:value.character,nickname:typeof value.nickname==='string'?value.nickname.trim().slice(0,24)||'Explorer':'Explorer',skills:normalizeSkills(value.skills)};
}
export async function loadCharacters(load){
  return Promise.all(CHARACTERS.map(async character=>{
    const image=await load(character.src),scratch=document.createElement('canvas');
    scratch.width=image.width;scratch.height=image.height;
    const ctx=scratch.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,image.width,image.height).data;
    const frames=detectSpriteFrames(pixels,image.width,image.height).map(poses=>poses.map(pose=>({...pose,image})));
    // Correct the source sheet's reversed NW right-step without altering the PNG.
    if(character.id==='robot')frames[4][2]={...frames[5][2],mirror:true};
    return {...character,frames};
  }));
}
