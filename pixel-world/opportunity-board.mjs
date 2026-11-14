import {summarizeOpportunities,STATUS_LABELS} from './opportunity-summary.mjs';
import {mountTeamPanel} from './team-panel.mjs';
import {REGIONS} from './contract.mjs';
import {DEMO_ITEMS,filterOpportunities} from './opportunity-preview.mjs';
import {createOpportunityComparison,comparisonFacts,comparisonSources} from './opportunity-compare.mjs';
import {sortOpportunities} from './list-sorting.mjs';

// Supply adapted items here when the backend contract is agreed; no requests are made.
export function mountOpportunityBoard(content,{items=DEMO_ITEMS,initialCategory='all',status='ready',onRetry}={}){
  const demo=items===DEMO_ITEMS;
  let category=initialCategory==='all'||REGIONS.some(region=>region.category===initialCategory)?initialCategory:'all';
  content.innerHTML='<h1 id="panel-title">All opportunities</h1><p class="op-disclosure">Demo preview · fictional examples, not open opportunities.</p><div class="op-list-view"><label class="op-search-label" for="op-search">Search opportunities</label><input id="op-search" class="op-search" type="search" maxlength="160" placeholder="Search titles, topics or places…"><div class="op-filters" role="group" aria-label="Filter by category"></div><details class="op-status"><summary>Status</summary><div class="op-status-values"></div></details><p class="op-count" role="status" aria-live="polite"></p><div class="op-results"></div></div><section class="op-detail" aria-labelledby="op-detail-title" hidden></section>';
  content.querySelector('.op-disclosure').hidden=!demo;
  const search=content.querySelector('input'),filters=content.querySelector('.op-filters'),results=content.querySelector('.op-results'),count=content.querySelector('.op-count'),list=content.querySelector('.op-list-view'),detail=content.querySelector('.op-detail');
  const statusPanel=content.querySelector('.op-status');statusPanel.open=matchMedia('(min-width:651px)').matches;
  const sortLabel=document.createElement('label');sortLabel.className='op-sort';sortLabel.textContent='Sort by';
  const sort=document.createElement('select');sort.setAttribute('aria-label','Sort opportunities');
  for(const [value,text]of [['default','Original order'],['deadline','Deadline date — soonest first']]){const option=document.createElement('option');option.value=value;option.textContent=text;sort.append(option);}sortLabel.append(sort);filters.after(sortLabel);
  sort.addEventListener('change',render);
  const comparison=createOpportunityComparison(),tray=document.createElement('details');tray.className='op-compare';content.querySelector('.op-disclosure').after(tray);
  function compareButton(item){
    const b=el('button','Compare','op-back op-compare-select');b.type='button';b.dataset.compareId=item.id;
    b.addEventListener('click',()=>{comparison.toggle(item);renderComparison();});return b;
  }
  function renderComparison(){
    const wasOpen=tray.open,chosen=comparison.items();tray.replaceChildren();
    tray.append(el('summary','Compare · '+chosen.length+' / 2'));
    tray.append(el('p','Choose up to two opportunities.','op-source'));
    const clear=el('button','Clear','op-back');clear.type='button';clear.disabled=!chosen.length;clear.addEventListener('click',()=>{comparison.clear();renderComparison();tray.querySelector('summary').focus();});tray.append(clear);
    if(chosen.length<2)tray.append(el('p',chosen.length?'Choose one more opportunity from the results.':'Use Compare on an opportunity to begin.','op-meta'));
    const grid=el('div',undefined,'op-compare-grid');
    for(const item of chosen){
      const card=el('section',undefined,'op-compare-card');card.append(el('h3',item.title));
      const remove=el('button','Remove','op-back');remove.type='button';remove.setAttribute('aria-label','Remove '+item.title+' from comparison');remove.addEventListener('click',()=>{comparison.toggle(item);renderComparison();tray.querySelector('summary').focus();});card.append(remove);
      const facts=document.createElement('dl');for(const [name,value]of comparisonFacts(item))facts.append(el('dt',name),el('dd',value));card.append(facts);
      const sources=comparisonSources(item);for(const [label,url]of sources){const link=el('a',label,'op-source-link');link.href=url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
      if(!sources.length)card.append(el('p','No source link available. Review source notes above.','op-source'));
      grid.append(card);
    }
    tray.append(grid);tray.open=wasOpen;
    for(const b of content.querySelectorAll('[data-compare-id]')){const selected=comparison.has(b.dataset.compareId);b.textContent=selected?'Remove comparison':'Compare';b.setAttribute('aria-pressed',String(selected));b.disabled=!selected&&chosen.length===2;}
  }
  const dialog=content.closest('dialog');dialog?.addEventListener('close',()=>{comparison.clear();renderComparison();},{once:true});
  function setState(next){
    if(!['ready','loading','error'].includes(next.status))throw new TypeError('Unsupported opportunity state');
    status=next.status;if(next.items!==undefined)items=next.items;
    detail.hidden=true;list.hidden=false;render();
  }
  const label=value=>REGIONS.find(r=>r.category===value)?.label||value;
  function el(tag,text,className){const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;}
  function teamButton(item,origin,compact=false){
    const button=el('button',undefined,'op-team-action'+(compact?' op-team-compact':''));button.type='button';
    button.setAttribute('aria-label','Find a team for '+item.title);button.title='Find a team';
    const icon=document.createElement('img');icon.src='assets/find-team-icon.png';icon.alt='';icon.width=36;icon.height=36;
    button.append(icon,el('span','Find a team','op-team-label'));
    button.addEventListener('click',()=>{list.hidden=true;detail.hidden=false;mountTeamPanel(detail,item,()=>showDetail(item,origin));});
    return button;
  }
  function showDetail(item,origin){
    detail.replaceChildren();
    const back=el('button','← Back to results','op-back');back.type='button';
    back.addEventListener('click',()=>{detail.hidden=true;list.hidden=false;origin.focus();});
    const title=el('h2',item.title);title.id='op-detail-title';title.tabIndex=-1;
    detail.append(back,el('p',label(item.category),'op-category'),title,teamButton(item,origin),compareButton(item),el('p',item.description));
    if(item.nextSteps?.length){
      const steps=el('section',undefined,'op-next-steps');steps.append(el('h3','Next steps'));
      for(const step of item.nextSteps){const p=el('p',step.reason+' ');if(step.url){const link=el('a',step.label);link.href=step.url;link.target='_blank';link.rel='noopener noreferrer';p.append(link);}else p.append(el('span',step.label+'.'));steps.append(p);}detail.append(steps);
    }
    const facts=document.createElement('dl');
    for(const [name,value]of [['Organizer',item.organizer],['Availability',item.availability],['Deadline',item.deadline],['Event dates',item.eventDates],['Location',item.location],['Eligibility (public source)',item.eligibility],['Fee',item.fee]])facts.append(el('dt',name),el('dd',value||'Not confirmed'));
    detail.append(facts);
    if(demo){
      const apply=el('button','Application unavailable · demo','primary');apply.type='button';apply.disabled=true;
      detail.append(el('p','Source: not connected.','op-source'),apply);
    }else{
      const source=el('details',undefined,'op-source-details');source.append(el('summary','Source details'),el('p',item.evidence,'op-source'),el('p','Recorded source check: '+item.sourceCheck,'op-source'),el('p',item.notes,'op-source'));detail.append(source);
      for(const [text,url]of [['View official information',item.officialUrl],['View recorded source',item.sourceUrl]])if(url){
        const link=el('a',text,'op-source-link');link.href=url;link.target='_blank';link.rel='noopener noreferrer';source.append(link);
      }
      if(!item.officialUrl&&!item.sourceUrl)detail.append(el('p','Source link not available.','op-source'));
    }
    list.hidden=true;detail.hidden=false;renderComparison();title.focus();
  }
  function render(){
    content.querySelector('#panel-title').textContent=category==='all'?'All opportunities':label(category)+' opportunities';
    for(const button of filters.children)button.setAttribute('aria-pressed',String(button.dataset.category===category));
    statusPanel.hidden=status!=='ready'||demo;
    const summary=summarizeOpportunities(filterOpportunities(items,category,search.value)),values=statusPanel.querySelector('.op-status-values');values.replaceChildren();
    for(const [key,label]of Object.entries(STATUS_LABELS)){if(summary.statuses[key])values.append(el('span',label+': '+summary.statuses[key]));}
    if(!summary.total)values.append(el('span','No records in this view'));
    results.replaceChildren();results.setAttribute('aria-busy',String(status==='loading'));
    search.disabled=status!=='ready';sort.disabled=status!=='ready';for(const button of filters.children)button.disabled=status!=='ready';
    if(status==='loading'){
      count.textContent='Loading opportunities…';results.append(el('p','Please wait while the noticeboard is updated.','op-state-message'));return;
    }
    if(status==='error'){
      count.textContent='Opportunities could not be loaded.';
      const error=el('div','','op-empty');error.append(el('h2','The noticeboard is unavailable'),el('p','Please try again. Your search and category have been kept.'));
      const retry=el('button',demo?'Retry demo':'Try again','op-back');retry.type='button';
      retry.addEventListener('click',()=>{
        setState({status:'loading'});
        if(demo){setState({status:'ready',items:DEMO_ITEMS});search.focus();}
        else if(onRetry){try{Promise.resolve(onRetry()).catch(()=>setState({status:'error'}));}catch{setState({status:'error'});}}
        else setState({status:'error'});
      });
      retry.disabled=!demo&&!onRetry;error.append(retry);results.append(error);return;
    }
    if(!items.length){count.textContent='0 opportunities';const empty=el('div','','op-empty');empty.append(el('h2','No opportunities available yet'),el('p','There are no listings to display. Please check back later.'));results.append(empty);return;}
    const matches=sortOpportunities(filterOpportunities(items,category,search.value),sort.value);count.textContent=matches.length+(demo?' demo ':' ')+(matches.length===1?'opportunity':'opportunities');results.replaceChildren();
    if(!matches.length){
      const empty=el('div','','op-empty');empty.append(el('h2','No matching opportunities'),el('p','Try a different keyword or category.'));
      const reset=el('button','Clear search and filters','op-back');reset.type='button';reset.addEventListener('click',()=>{category='all';search.value='';render();search.focus();});empty.append(reset);results.append(empty);return;
    }
    for(const item of matches){
      const row=document.createElement('article');row.className='op-row';
      const title=document.createElement('h2'),open=el('button',item.title,'op-open');open.type='button';open.addEventListener('click',()=>showDetail(item,open));title.append(open);
      const info=document.createElement('div');info.className='op-row-info';
      info.append(el('span',label(item.category),'op-category'),title,el('p',item.availability||'Demo example','op-availability'),el('p',item.location,'op-meta'),el('p','Deadline: '+(item.deadline||'Not confirmed'),'op-meta'));
      const actions=el('div',undefined,'op-row-actions');actions.append(teamButton(item,open,true),compareButton(item));row.append(info,actions);results.append(row);
    }
    renderComparison();
  }
  for(const option of [{category:'all',label:'All'},...REGIONS]){
    const button=el('button',option.label);button.type='button';button.dataset.category=option.category;
    button.addEventListener('click',()=>{category=option.category;render();});filters.append(button);
  }
  search.addEventListener('input',render);renderComparison();setState({status});
  return {setState,openItem(id,{teams=false}={}){
    const item=items.find(row=>row.id===id);if(!item)return false;
    const origin=search;showDetail(item,origin);
    if(teams)mountTeamPanel(detail,item,()=>showDetail(item,origin));return true;
  }};
}
