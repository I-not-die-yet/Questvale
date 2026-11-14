import {safeSourceUrl} from './opportunity-data.mjs';
export function createOpportunityComparison(){
  const selected=new Map();
  return {
    items:()=>[...selected.values()],
    has:id=>selected.has(id),
    clear:()=>selected.clear(),
    toggle(item){if(selected.has(item.id)){selected.delete(item.id);return true;}if(selected.size===2)return false;selected.set(item.id,item);return true;},
  };
}
export function comparisonFacts(item){
  return [['Availability',item.availability],['Deadline / time zone',item.deadline],['Location',item.location],['Fee and charges',item.fee],['Eligibility (public source)',item.eligibility],['Recorded source check',item.sourceCheck],['Source limitations',item.evidence],['Source notes',item.notes]].map(([label,value])=>[label,value||'Not confirmed']);
}
export function comparisonSources(item){
  return [['View official information',safeSourceUrl(item.officialUrl)],['View recorded source',safeSourceUrl(item.sourceUrl)]].filter(([,url])=>url);
}
