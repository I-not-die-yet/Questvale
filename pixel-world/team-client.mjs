import {normalizeSkills} from './skills.mjs';
let sessionFlight=null;
export function ensureGuest(root){
 if(!sessionFlight){let skills=[];try{skills=normalizeSkills(JSON.parse(root.dataset.skills||'[]'));}catch{}
 sessionFlight=teamRequest('/session',{nickname:root.dataset.nickname||'Explorer',skills}).finally(()=>{sessionFlight=null;});}
 return sessionFlight;
}
export async function teamRequest(path='',body){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
 const response=await fetch('/api/teams'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',signal:controller.signal,headers:body===undefined?{}:{'Content-Type':'application/json','X-Questvale-Client':'teams'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 let data;try{data=await response.json();}catch{throw new Error('Team service is unavailable. Restart the current local server.');}
 if(!response.ok)throw new Error(data.error||'Request failed.');return data;
 }finally{clearTimeout(timer);}
}
