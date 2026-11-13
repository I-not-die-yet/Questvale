import {REGIONS} from './contract.mjs';
// Fictional UI fixtures only. This is not the backend team's data schema.
export const DEMO_ITEMS=[
  {id:'demo-build',category:'hackathon',title:'Build for Campus',location:'Hong Kong · In person',deadline:'Not confirmed',eligibility:'Example: university students. Final eligibility is not available.',fee:'Not confirmed',description:'A fictional weekend challenge to prototype a useful campus idea.'},
  {id:'demo-case',category:'business',title:'Student Strategy Challenge',location:'Online',deadline:'Not confirmed',eligibility:'Not confirmed',fee:'Not confirmed',description:'A fictional case challenge exploring decisions for a growing business.'},
  {id:'demo-launch',category:'startup',title:'Idea to Prototype Studio',location:'Hong Kong · Hybrid',deadline:'Not confirmed',eligibility:'Not confirmed',fee:'Not confirmed',description:'A fictional programme for students exploring an early product idea.'},
  {id:'demo-research',category:'research',title:'Undergraduate Discovery Programme',location:'Hong Kong · In person',deadline:'Not confirmed',eligibility:'Not confirmed',fee:'Not confirmed',description:'A fictional introduction to research projects and academic collaboration.'},
];
export function filterOpportunities(items,category='all',query=''){
  const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item=>(category==='all'||item.category===category)&&words.every(word=>[item.title,item.location,item.description,REGIONS.find(r=>r.category===item.category)?.label].join(' ').toLowerCase().includes(word)));
}
