export function advisorContext(values){
  const context={};
  for(const key of ['age','teamSize','studentYear','hoursPerWeek'])if(values[key]!==''&&values[key]!=null){const n=Number(values[key]);if(!Number.isFinite(n))throw Error('Enter valid numbers for your conditions.');context[key]=n;}
  if(values.isStudent==='yes')context.isStudent=true;else if(values.isStudent==='no')context.isStudent=false;
  if(values.category)context.preferredCategories=[values.category];
  return context;
}
export async function requestAdvisor(message,context,{signal,fetchImpl=fetch}={}){
  const r=await fetchImpl('/api/advisor',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Questvale-Client':'advisor'},body:JSON.stringify({message,context}),signal});
  let body;try{body=await r.json();}catch{throw Error('Advisor service is unavailable. Retry manually after checking the local server.');}
  if(!r.ok){const error=new Error(body.error?.message||'Advisor request failed.');error.code=body.error?.code;const retry=r.headers.get('retry-after');error.retryAfter=/^\d+$/.test(retry||'')?Math.min(Number(retry),86400):0;throw error;}
  if(typeof body.message!=='string'||!Array.isArray(body.recommendations)||!Array.isArray(body.uncertainties)||!Array.isArray(body.followUpQuestions)||!Array.isArray(body.missingFields)||body.recommendations.length>3)throw Error('Advisor returned an invalid result.');
  return body;
}
