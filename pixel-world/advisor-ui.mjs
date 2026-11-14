import {advisorContext,requestAdvisor} from './advisor-client.mjs';
import {loadOpportunityData} from './opportunity-data.mjs';
import {ensureGuest} from './team-client.mjs';
export function createAdvisorUI(root,host,{onBusy,onStatus}){
  let busy=false,generation=0,controller=null,nextAllowed=0;
  host.innerHTML='<details class="advisor-conditions"><summary>Your conditions (optional)</summary><p>Leave unknown conditions blank.</p><div class="advisor-fields"></div></details><p class="advisor-disclosure">Your message and conditions may be sent to the AI provider.</p><div class="advisor-result" aria-live="polite"></div>';
  const fields=host.querySelector('.advisor-fields'),result=host.querySelector('.advisor-result');
  function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node;}
  for(const [key,label,min,max,step]of [['age','Age',0,120,1],['teamSize','Team size (including you)',1,100,1],['studentYear','Study year',1,6,1],['hoursPerWeek','Hours per week (not assessed yet)',0,168,'any']]){
    const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='number';input.name=key;input.min=min;input.max=max;input.step=step;input.placeholder='Not provided';wrap.append(input);fields.append(wrap);
  }
  for(const [key,label,options]of [['isStudent','Currently a student?',[['','Not provided'],['yes','Yes'],['no','No']]],['category','Preferred category',[['','Any category'],['hackathon','Hackathon'],['business','Business'],['startup','Startup'],['research','Research']]]]){
    const wrap=el('label',label),select=document.createElement('select');select.name=key;for(const [value,text]of options){const option=el('option',text);option.value=value;select.append(option);}wrap.append(select);fields.append(wrap);
  }
  function cancel(){if(!busy)return;generation++;controller?.abort();busy=false;onBusy(false);onStatus('Request cancelled · send again manually.');}
  async function submit(message){
    if(busy)return false;
    if(Date.now()<nextAllowed){onStatus('Please wait '+Math.ceil((nextAllowed-Date.now())/1000)+' seconds before sending again.');return false;}
    for(const field of fields.querySelectorAll('input'))if(!field.checkValidity()){field.reportValidity();return false;}
    const values=Object.fromEntries([...fields.querySelectorAll('input,select')].map(n=>[n.name,n.value]));
    const context=advisorContext(values),id=++generation;controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),17000);
    busy=true;onBusy(true);onStatus('Checking recorded opportunities…');result.replaceChildren(el('p','Waiting for Advisor…'));
    try{
      await ensureGuest(root);if(id!==generation)return false;controller.signal.throwIfAborted();
      const response=await requestAdvisor(message,context,{signal:controller.signal});
      let items=[];try{items=await loadOpportunityData();}catch{}
      if(id!==generation)return false;
      result.replaceChildren(el('p','You: '+message),el('p',response.message));
      const list=(title,values)=>{if(!values?.length)return;result.append(el('strong',title));const ul=document.createElement('ul');for(const value of values)ul.append(el('li',String(value)));result.append(ul);};
      if(response.uncertainties.length){const notes=el('details');notes.append(el('summary','Assessment notes'));const ul=el('ul');for(const note of response.uncertainties)ul.append(el('li',String(note)));notes.append(ul);result.append(notes);}list('Please confirm',response.followUpQuestions);
      if(response.missingFields.length&&!response.followUpQuestions.length)list('Missing conditions',response.missingFields);
      if(!response.recommendations.length)result.append(el('p','No shortlist returned. This does not mean no suitable opportunities exist.'));
      for(const rec of response.recommendations){
        const item=items.find(i=>i.id===rec.opportunityId),section=document.createElement('section');section.className='advisor-recommendation';section.append(el('h3',item?.title||'Opportunity unavailable in the current frontend data'));
        section.append(el('p','Availability: '+(rec.availability?.status==='listed_open'?'Listed open in draft':'Needs confirmation')),el('p','Eligibility: '+(rec.eligibility?.status==='ineligible'?'Does not meet checked conditions':'Needs confirmation · not fully verified')));
        const evidence=el('details');evidence.append(el('summary','Evidence and limits'));
        const ul=document.createElement('ul');for(const reason of [...(rec.reasons||[]),...(rec.availability?.reasons||[]),...(rec.eligibility?.reasons||[]),...(rec.uncertainties||[])])ul.append(el('li',String(reason)));evidence.append(ul);section.append(evidence);
        if(item)for(const [label,teams]of [['View opportunity',false],['Find a team',true]]){const b=el('button',label);b.type='button';b.className='op-back';b.addEventListener('click',()=>root.dispatchEvent(new CustomEvent('qv-open-opportunity',{detail:{id:item.id,category:item.category,teams}})));section.append(b);}
        result.append(section);
      }
      onStatus('Result received · review source limitations.');return true;
    }catch(error){if(id!==generation)return false;nextAllowed=Date.now()+(error.retryAfter||0)*1000;result.replaceChildren(el('p',error.name==='AbortError'?'Advisor timed out. Your draft is kept; retry manually.':error.message));onStatus((error.code?error.code+' · ':'')+(error.retryAfter?'Wait '+error.retryAfter+' seconds; then retry manually.':'Not connected or request failed · draft kept.'));return false;}
    finally{clearTimeout(timeout);if(id===generation){busy=false;onBusy(false);}}
  }
  return {submit,cancel};
}
