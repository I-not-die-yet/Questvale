import {normalizeProfile} from './character-sprites.mjs';
import {normalizeSkills} from './skills.mjs';
export function updateProfileSkills(root,skills,storage){
  const profile=normalizeProfile({character:root.dataset.character,nickname:root.dataset.nickname,skills:normalizeSkills(skills)});
  if(!profile)throw new Error('Choose a character before editing skills.');
  root.dataset.skills=JSON.stringify(profile.skills);
  let persisted=true;
  try{(storage||globalThis.localStorage).setItem('questvale.profile.v1',JSON.stringify(profile));}catch{persisted=false;}
  const event=new Event('qv-profile-skills');event.profile=profile;root.dispatchEvent(event);
  return {profile,persisted};
}
export function observeProfileSkills(root,onProfile){
  root.addEventListener('qv-profile-skills',event=>{const profile=normalizeProfile(event.profile);if(profile)onProfile(profile);});
}
