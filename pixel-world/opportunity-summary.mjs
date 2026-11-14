import {CATEGORIES} from './contract.mjs';
export const STATUS_LABELS={open:'Listed open',closing_soon:'Listed closing soon',upcoming:'Upcoming',closed_historical:'Closed / historical',unknown:'Unknown'};
export function summarizeOpportunities(items){
  const categories=Object.fromEntries(CATEGORIES.map(c=>[c,0])),statuses=Object.fromEntries(Object.keys(STATUS_LABELS).map(s=>[s,0]));
  for(const item of items){if(Object.hasOwn(categories,item.category))categories[item.category]++;const status=Object.hasOwn(statuses,item.statusKey)?item.statusKey:'unknown';statuses[status]++;}
  return {total:items.length,categories,statuses};
}
