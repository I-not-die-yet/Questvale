export function parsePublicOrigin(value=''){
  if(!value)return '';
  const url=new URL(value);
  if(url.protocol!=='https:'||url.origin!==value||url.username||url.password)throw Error('PUBLIC_ORIGIN must be an exact HTTPS origin without a path or trailing slash.');
  return url.origin;
}
export function requestOrigin(host,port,publicOrigin=''){
  if(publicOrigin)return host===new URL(publicOrigin).host?publicOrigin:null;
  return ['127.0.0.1:'+port,'localhost:'+port].includes(host)?'http://'+host:null;
}
// Process-wide budget plus per-authenticated-guest cooldown; no IP assumptions.
export function createAdvisorGate({maxCalls=0,clock=Date.now}={}){
  if(!Number.isSafeInteger(maxCalls)||maxCalls<0)throw Error('ADVISOR_PROXY_MAX_CALLS must be a non-negative safe integer.');
  let attempts=0,inFlight=0,recent=[];const guests=new Map();
  const denied=(status,code,message,retryAfter=0)=>({status,body:{error:{code,message}},headers:retryAfter?{'Retry-After':String(retryAfter)}:{}});
  return {take(user){
    if(!user)return denied(401,'GUEST_REQUIRED','Reconnect your guest session before sending.');
    if(attempts>=maxCalls)return denied(503,'ADVISOR_PROXY_BUDGET','Advisor call budget is unavailable or exhausted.');
    const now=clock();recent=recent.filter(t=>now-t<60000);
    for(const [id,time]of guests)if(now-time>=5000)guests.delete(id);
    if(guests.has(user))return denied(429,'GUEST_COOLDOWN','Please wait before sending again.',Math.max(1,Math.ceil((5000-now+guests.get(user))/1000)));
    if(inFlight>=2||recent.length>=20)return denied(429,'ADVISOR_BUSY','Advisor is busy. Retry manually later.',3);
    guests.set(user,now);recent.push(now);attempts++;inFlight++;
    let released=false;return {release(){if(!released){released=true;inFlight--;}}};
  }};
}
