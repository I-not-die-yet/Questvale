// Calendar-date sorting, not an inferred closing time or suitability ranking.
function deadline(item,now){
  const date=item.deadlineDate,zone=item.deadlineTimezone;
  if(item.deadlineUncertain||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
  const parsed=new Date(date+'T00:00:00Z');if(!Number.isFinite(+parsed)||parsed.toISOString().slice(0,10)!==date)return null;
  try{const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone||'Invalid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const part=key=>parts.find(p=>p.type===key).value;return {date,past:date<[part('year'),part('month'),part('day')].join('-')};}catch{return null;}
}
export function sortOpportunities(items,order='default',now=new Date()){
  if(order!=='deadline')return [...items];
  const records=items.map(item=>{const d=deadline(item,now);const ended=item.statusKey==='closed_historical'||d?.past;const group=ended?2:d&&item.statusKey!=='unknown'?0:1;return {item,d,group};});
  records.sort((a,b)=>a.group-b.group||(a.group===0?a.d.date.localeCompare(b.d.date):0));
  return records.map(record=>record.item);
}
export function sortTeams(teams,order='default'){
  if(!['slots-most','slots-fewest'].includes(order))return [...teams];
  const slots=team=>Math.max(0,team.capacity-team.members.length);
  return [...teams].sort((a,b)=>Number(slots(a)===0)-Number(slots(b)===0)||(order==='slots-most'?slots(b)-slots(a):slots(a)-slots(b)));
}
