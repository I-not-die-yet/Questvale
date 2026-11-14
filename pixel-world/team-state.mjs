// Page-lifetime UI state only. No identity, storage or multiplayer service.
export function createTeamPreviewStore(){
  const opportunities=new Map();
  function get(id){
    if(!opportunities.has(id))opportunities.set(id,{own:null,pending:false,messages:[],draft:''});
    return opportunities.get(id);
  }
  function create(id,{name,intro,roles,capacity}){
    const state=get(id),size=Number(capacity);
    if(state.own)throw new Error('You already have a team for this opportunity.');
    if(!name.trim()||!intro.trim()||!roles.trim()||!Number.isInteger(size)||size<2||size>6)throw new Error('Complete all fields and choose a capacity from 2 to 6.');
    state.own={name:name.trim().slice(0,48),intro:intro.trim().slice(0,240),roles:roles.trim().slice(0,80),capacity:size,members:['You · captain']};state.pending=false;return state.own;
  }
  function request(id){const state=get(id);if(state.own)throw new Error('Leave your current team before requesting another.');state.pending=true;}
  function remove(id){const state=get(id);state.own=null;state.messages=[];state.draft='';}
  function message(id,text){const state=get(id),value=text.trim().slice(0,500);if(!state.own||!value)return false;state.messages.push(value);if(state.messages.length>30)state.messages.shift();state.draft='';return true;}
  return {get,create,request,remove,message};
}
export const teamPreview=createTeamPreviewStore();
