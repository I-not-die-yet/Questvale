import { validateProps, REGIONS } from './contract.mjs';
const root=document.querySelector('.town');
const dialog=root.querySelector('dialog');
const content=root.querySelector('.panel-content');
let restoreFocus=null;
// This preview host owns the provisional selection. There is no opportunity dataset.
let activeRegion=null;
const highlightedRegions=[];
function onRegionSelect(category) {
  activeRegion=category;
  root.dataset.activeRegion=category??'all';
  document.querySelector('#selection-status').textContent=category?'Selected: '+REGIONS.find(r=>r.category===category).label+'.':'Selected: All opportunities.';
}
validateProps({activeRegion,highlightedRegions,onRegionSelect});
export function show(kind) {
  restoreFocus=document.activeElement;
  if(kind==='advisor') {
    content.innerHTML='<p class="subtitle">Your opportunity guide</p><h1 id="panel-title">What would you like to explore?</h1><p>Tell your advisor what interests you, what you’ve tried, or where you want to go next.</p><label for="advisor-message">Your interests and goals</label><textarea id="advisor-message" placeholder="I’m a first-year student curious about hackathons, but I haven’t coded before…"></textarea><p class="note">Preview only. AI is not connected. Nothing you type is sent or saved.</p><button class="primary" disabled>Analysis available after integration</button>';
  } else {
    const all=kind==='all';
    const region=REGIONS.find(r=>r.category===kind);
    if(!all&&!region)throw new TypeError('Unsupported category');
    onRegionSelect(all?null:kind);
    content.innerHTML='<p class="subtitle">'+(all?'The public noticeboard':region.place)+'</p><h1 id="panel-title">'+(all?'All opportunities':region.label)+'</h1><div class="empty"><h2>'+(all?'Every path starts with a possibility.':'Explore your next opportunity.')+'</h2><p>The town interface is ready for the team’s opportunity cards. No live listings or recommendations are connected to this art preview.</p></div><button class="primary back">Back to exploring</button>';
    content.querySelector('.back').addEventListener('click',()=>dialog.close());
  }
  dialog.showModal();
  (kind==='advisor'?content.querySelector('textarea'):root.querySelector('.close')).focus();
}
root.querySelector('.advisor')?.addEventListener('click',()=>show('advisor'));
for(const selector of ['.workshop','.entrance','.interaction'])root.querySelector(selector).addEventListener('click',()=>show('hackathon'));
root.querySelector('.board').addEventListener('click',()=>show('all'));
root.querySelector('.close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{
  const target=restoreFocus?.isConnected&&!restoreFocus.hidden?restoreFocus:root.querySelector('canvas')||root.querySelector('.advisor');
  target.focus();
});
document.addEventListener('keydown',e=>{
  if(root.dataset.mode==='explore')return;
  if(dialog.open||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();show('hackathon');}
});
for(const button of root.querySelectorAll('[data-action]'))button.addEventListener('click',()=>show(button.dataset.action));
