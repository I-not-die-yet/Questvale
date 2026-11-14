import {CATEGORIES} from './contract.mjs';
export function safeSourceUrl(value){
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
const STATUSES={open:'Listed as open',closing_soon:'Listed as closing soon',upcoming:'Upcoming',closed_historical:'Closed · historical',unknown:'Availability not confirmed'};
export function opportunityNextSteps(row){
  const uncertainty=row.uncertainty||{},url=safeSourceUrl(row.sourceUrl)||safeSourceUrl(row.officialUrl);
  const action=(reason,label)=>({reason,label:url?label:'Read source notes below',url});
  if(row.status==='closed_historical')return [action('Closed or historical record. Explore other opportunities for current intakes.','View historical information')];
  const steps=[];
  if(uncertainty.fee||row.fee?.amount==null||row.fee?.amount==='')steps.push(action('Fee not confirmed. Do not assume free entry.','Check recorded source'));
  if(uncertainty.eligibility||!row.eligibilityRawText)steps.push(action('Eligibility needs confirmation. Review requirements and source notes.','Review recorded requirements'));
  if(row.status==='unknown'||uncertainty.availability)steps.push(action('Current availability is uncertain. Confirm the intake with the organizer.','Check intake information'));
  else if(row.status==='upcoming')steps.push(action('Upcoming intake. Check when applications actually open.','Check intake information'));
  if(!steps.length&&(uncertainty.deadline||!row.dates?.deadline))steps.push(action('Deadline not confirmed. Check the current intake dates.','Check recorded dates'));
  return steps.slice(0,3);
}
export function adaptOpportunities(rows){
  if(!Array.isArray(rows))throw new TypeError('Expected an opportunity array');
  const ids=new Set();
  return rows.map(row=>{
    if(!row.id||ids.has(row.id)||!row.name||!CATEGORIES.includes(row.category))throw new TypeError('Invalid or duplicate opportunity');
    ids.add(row.id);
    const uncertain=row.uncertainty||{},dates=row.dates||{},fee=row.fee||{},location=row.location||{};
    const mark=(text,key)=>text+(uncertain[key]?' · Needs confirmation':'');
    const amount=fee.amount!==null&&fee.amount!==undefined&&fee.amount!==''?String(fee.amount):null;
    return {
      statusKey:Object.hasOwn(STATUSES,row.status)?row.status:'unknown',nextSteps:opportunityNextSteps(row),id:row.id,category:row.category,title:row.name,description:row.description||row.shortDescription||'Description not provided.',organizer:row.organizer||'Not confirmed',
      location:[location.place,({offline:'In person',online:'Online',hybrid:'Hybrid'})[location.type]].filter(Boolean).join(' · ')||'Not confirmed',
      deadline:mark(dates.deadline?[dates.deadline,dates.deadlineTimezone].filter(Boolean).join(' · '):'Not confirmed','deadline'),
      deadlineDate:dates.deadline||null,deadlineTimezone:dates.deadlineTimezone||null,deadlineUncertain:!!uncertain.deadline,
      eventDates:[dates.eventStart,dates.eventEnd].filter(Boolean).join(' – ')||'Not confirmed',
      fee:mark([amount===null?'Amount not confirmed':[fee.currency,amount].filter(Boolean).join(' '),fee.note].filter(Boolean).join(' · '),'fee'),
      teamSizeRule:row.eligibilityConditions?.teamSize||'Not confirmed',
      eligibility:mark(row.eligibilityRawText||'Not confirmed','eligibility'),
      availability:mark(STATUSES[row.status]||STATUSES.unknown,'availability'),
      officialUrl:safeSourceUrl(row.officialUrl),sourceUrl:safeSourceUrl(row.sourceUrl),
      sourceCheck:row.lastVerifiedAt||'Not recorded',notes:row.notes||'No additional source notes provided.',
      evidence:'Imported draft · source claims have not been independently rechecked in this app.',
    };
  });
}
export async function loadOpportunityData(){
  const response=await fetch(new URL('./data/opportunities.json',import.meta.url),{cache:'no-store'});
  if(!response.ok)throw new Error('Opportunity data unavailable');
  return adaptOpportunities(await response.json());
}
