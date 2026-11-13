import {REGIONS} from './contract.mjs';
import {DEMO_ITEMS,filterOpportunities} from './opportunity-preview.mjs';

// Supply adapted items here when the backend contract is agreed; no requests are made.
export function mountOpportunityBoard(content,{items=DEMO_ITEMS,initialCategory='all',status='ready',onRetry}={}){
  const demo=items===DEMO_ITEMS;
  let category=initialCategory==='all'||REGIONS.some(region=>region.category===initialCategory)?initialCategory:'all';
  content.innerHTML='<h1 id="panel-title">All opportunities</h1><p class="op-disclosure">Demo preview · fictional examples, not open opportunities.</p><div class="op-list-view"><label class="op-search-label" for="op-search">Search opportunities</label><input id="op-search" class="op-search" type="search" maxlength="160" placeholder="Search titles, topics or places…"><div class="op-filters" role="group" aria-label="Filter by category"></div><p class="op-count" role="status" aria-live="polite"></p><div class="op-results"></div></div><section class="op-detail" aria-labelledby="op-detail-title" hidden></section>';
  const search=content.querySelector('input'),filters=content.querySelector('.op-filters'),results=content.querySelector('.op-results'),count=content.querySelector('.op-count'),list=content.querySelector('.op-list-view'),detail=content.querySelector('.op-detail');
  function setState(next){
    if(!['ready','loading','error'].includes(next.status))throw new TypeError('Unsupported opportunity state');
    status=next.status;if(next.items!==undefined)items=next.items;
    detail.hidden=true;list.hidden=false;render();
  }
  const label=value=>REGIONS.find(r=>r.category===value)?.label||value;
  function el(tag,text,className){const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;}
  function showDetail(item,origin){
    detail.replaceChildren();
    const back=el('button','← Back to results','op-back');back.type='button';
    back.addEventListener('click',()=>{detail.hidden=true;list.hidden=false;origin.focus();});
    const title=el('h2',item.title);title.id='op-detail-title';title.tabIndex=-1;
    detail.append(back,el('p',label(item.category),'op-category'),title,el('p',item.description));
    const facts=document.createElement('dl');
    for(const [name,value]of [['Deadline',item.deadline],['Location',item.location],['Eligibility',item.eligibility],['Fee',item.fee]])facts.append(el('dt',name),el('dd',value||'Not confirmed'));
    const apply=el('button','Application unavailable · demo','primary');apply.type='button';apply.disabled=true;
    detail.append(facts,el('p','Source: not connected. Check the official source when live data becomes available.','op-source'),apply);
    list.hidden=true;detail.hidden=false;title.focus();
  }
  function render(){
    content.querySelector('#panel-title').textContent=category==='all'?'All opportunities':label(category)+' opportunities';
    for(const button of filters.children)button.setAttribute('aria-pressed',String(button.dataset.category===category));
    results.replaceChildren();results.setAttribute('aria-busy',String(status==='loading'));
    search.disabled=status!=='ready';for(const button of filters.children)button.disabled=status!=='ready';
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
    const matches=filterOpportunities(items,category,search.value);count.textContent=matches.length+' demo '+(matches.length===1?'opportunity':'opportunities');results.replaceChildren();
    if(!matches.length){
      const empty=el('div','','op-empty');empty.append(el('h2','No matching opportunities'),el('p','Try a different keyword or category.'));
      const reset=el('button','Clear search and filters','op-back');reset.type='button';reset.addEventListener('click',()=>{category='all';search.value='';render();search.focus();});empty.append(reset);results.append(empty);return;
    }
    for(const item of matches){
      const row=document.createElement('article');row.className='op-row';
      const title=document.createElement('h2'),open=el('button',item.title,'op-open');open.type='button';open.addEventListener('click',()=>showDetail(item,open));title.append(open);
      row.append(el('span',label(item.category),'op-category'),title,el('p',item.location,'op-meta'),el('p','Deadline: '+(item.deadline||'Not confirmed'),'op-meta'));results.append(row);
    }
  }
  for(const option of [{category:'all',label:'All'},...REGIONS]){
    const button=el('button',option.label);button.type='button';button.dataset.category=option.category;
    button.addEventListener('click',()=>{category=option.category;render();});filters.append(button);
  }
  search.addEventListener('input',render);setState({status});
  return {setState};
}
