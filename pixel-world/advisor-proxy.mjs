// Fixed loopback destination. Never forward browser cookies or authorization.
export async function advisorProxy(request,{fetchImpl=fetch,signal}={}){
  const headers={'Content-Type':'application/json','Accept':'application/json'};
  try{
    const upstream=await fetchImpl('http://127.0.0.1:4185/api/advisor',{method:'POST',headers,body:request,signal,redirect:'error'});
    const reader=upstream.body?.getReader();let size=0;const chunks=[];
    if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw Error('oversized');}chunks.push(value);}}
    const text=new TextDecoder().decode(Buffer.concat(chunks));const body=JSON.parse(text);
    const retry=upstream.headers.get('retry-after');
    return {status:upstream.status,body,headers:retry&&/^\d+$/.test(retry)?{'Retry-After':retry}:{}};
  }catch{return {status:503,body:{error:{code:'ADVISOR_UNAVAILABLE',message:'Advisor unavailable. Start the configured local Advisor service, then retry manually.'}},headers:{}};}
}
export function advisorBoundary({method,host,origin,client,type,encoding},port,effectiveOrigin){
  const expected=effectiveOrigin||(['127.0.0.1:'+port,'localhost:'+port].includes(host)?'http://'+host:null);
  if(!expected||origin&&origin!==expected||client!=='advisor')return 403;
  if(method!=='POST')return 405;
  if(type?.split(';')[0].trim()!=='application/json'||encoding&&encoding!=='identity')return 415;
  return 0;
}
