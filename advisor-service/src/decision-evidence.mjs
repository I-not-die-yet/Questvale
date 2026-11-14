import {isDateOnly,isInstant,validTimeZone} from './dataset.mjs';

// Source data and partial assessments only; never instructions or eligibility proof.
export function candidateEvidence({row,availability,eligibility}){
  return {opportunityId:row.id,name:row.name,category:row.category,
    shortDescription:row.shortDescription,tags:[...(row.tags||[])],
    dates:{...row.dates},fee:{...row.fee},location:{...row.location},
    uncertainty:{...row.uncertainty},availability,eligibility,
    dataSource:row.dataSource,lastVerifiedAt:row.lastVerifiedAt,sourceNotes:row.notes};
}

export function decisionReasons(row,selected){
  const u=row.uncertainty||{},date=row.dates||{},fee=row.fee||{};
  const reasons=[
    'Recorded deadline: '+(date.deadline||'not confirmed')+(date.deadlineTimezone?' · '+date.deadlineTimezone:' · time zone not confirmed')+(u.deadline?' · needs confirmation':'')+'.',
    'Recorded fee: '+(fee.amount==null||fee.amount===''?'amount not confirmed':[(fee.currency||'currency not confirmed'),fee.amount].join(' '))+(u.fee?' · needs confirmation':'')+(fee.note?' · '+fee.note:'')+'.',
    'Recorded location: '+([row.location?.place,row.location?.type].filter(Boolean).join(' · ')||'not confirmed')+'.',
    'Recorded source check: '+(row.lastVerifiedAt||'not recorded')+'; not a complete verification. Source type: '+(row.dataSource||'not recorded')+'.',
  ];
  // Only order trustworthy dates that share a calendar zone, or explicit instants.
  const comparable=selected.map(x=>x.row).filter(x=>!x.uncertainty.deadline&&x.dates.deadline);
  const dates=comparable.map(x=>x.dates.deadline);
  const calendar=dates.every(isDateOnly)&&comparable.every(x=>validTimeZone(x.dates.deadlineTimezone)&&x.dates.deadlineTimezone===date.deadlineTimezone);
  const instants=dates.every(isInstant);
  if(comparable.length>=2&&comparable.some(x=>x.id===row.id)&&(calendar||instants)){
    const values=dates.map(d=>instants?Date.parse(d):d),value=instants?Date.parse(date.deadline):date.deadline;
    const earlier=values.some(d=>d<value),later=values.some(d=>d>value);
    reasons.push('Deadline comparison: '+(!earlier&&!later?'same recorded deadline as the other comparable selections':!earlier?'earliest among comparable selections':!later?'latest among comparable selections':'between the other comparable selections')+'. Timing only; not a suitability ranking.');
  }
  if(row.notes)reasons.push('Source notes: '+row.notes);
  return reasons;
}
