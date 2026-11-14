import {updateProfileSkills} from './profile-skills.mjs';
import {SKILLS,normalizeSkills,roleCoverage} from './skills.mjs';
import {teamRequest,ensureGuest} from './team-client.mjs';
export function mountTeamPanel(host,item,onBack){
  const root=host.closest('.town');
  let skills=[];try{skills=normalizeSkills(JSON.parse(root?.dataset.skills||'[]'));}catch{}
  const state={draft:''};let currentUser=null,teams=[],view='list',selected=null,busy=false,failures=0,stopped=false,timer=null,messages=[],pendingMessage=null;
  const own=()=>teams.find(team=>team.isMember);
  const alive=()=>!stopped&&host.isConnected&&!host.hidden&&host.closest('dialog')?.open;
  async function refresh(){const result=await teamRequest('?opportunity='+encodeURIComponent(item.id));teams=result.teams;if(selected)selected=teams.find(team=>team.id===selected.id)||null;if(!selected&&(view==='team'||view==='chat'))view='list';if(selected&&!selected.isMember&&view==='chat'){view='team';messages=[];}}
  async function act(fn,next){if(busy)return;busy=true;try{await fn();await refresh();if(next)view=next;if(alive())render();}catch(error){if(alive())notice(error.message);}finally{busy=false;}}
  function notice(text){let node=host.querySelector('.team-service-status');if(!node){node=el('p',undefined,'team-service-status');node.setAttribute('role','status');host.append(node);}node.textContent=text;}
  async function load(){try{const session=await ensureGuest(root);currentUser=session.userId;await refresh();if(!alive())return;render();poll();}catch(error){if(!alive())return;host.replaceChildren();heading('Team connection unavailable');notice(error.message);button(host,'Try again',load);button(host,'Back to opportunity',onBack);}}
  async function poll(){
    clearTimeout(timer);if(!alive())return;
    try{
      if(view==='chat'&&selected){
        const data=await teamRequest('/'+selected.id+'/messages'+(messages.length?'?after='+messages.at(-1).id:''));
        if(!alive())return;
        for(const message of data.messages)if(!messages.some(m=>m.id===message.id))messages.push(message);
        if(messages.length>200)messages=messages.slice(-200);paintMessages();
      }
      failures=0;
    }catch(error){failures++;notice(error.message);if(failures>=3){button(host,'Reconnect',()=>{failures=0;load();});return;}}
    if(alive())timer=setTimeout(poll,3000);
  }
  function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
  function add(tag,text,cls){const node=el(tag,text,cls);host.append(node);return node;}
  function button(parent,text,fn,primary=false){const b=el('button',text,primary?'primary':'op-back');b.type='button';b.addEventListener('click',fn);parent.append(b);return b;}
  function go(next){view=next;render();if(next==='chat'){messages=[];paintMessages();poll();}}
  function actions(){return add('div',undefined,'team-actions');}
  function heading(text){const h=add('h2',text);h.id='op-detail-title';h.tabIndex=-1;h.focus();}
  function coverage(parent,team,track=true){
    if(track){const node=el('div');parent.append(node);coverageNodes.push({node,team});parent=node;}
    const covered=[...new Set(team.members.flatMap(member=>member.id===currentUser?skills:member.skills))];
    parent.append(el('p','Covered: '+(covered.length?covered.join(' · '):'Not specified'),'op-meta'),el('p','Wanted: '+team.roles,'op-meta'));
    const matches=roleCoverage(skills,team.roles);
    parent.append(el('p',team.isMember?'Covered roles reflect members’ self-reported skills.':matches.length?'You could contribute: '+matches.join(' · '):skills.length?'No exact skill overlap listed. You can still read the team pitch.':'Select your skills above to see role overlap.',matches.length?'team-fit':'op-meta'));
  }
  function skillPicker(){
    const group=add('fieldset',undefined,'team-skill-picker');group.append(el('legend','Your skills (optional)'));
    const buttons=el('div',undefined,'team-skill-buttons'),status=el('p',skills.length?'Self-reported skills · recruitment preferences only.':'No skills selected. You can skip this.','op-meta');status.setAttribute('role','status');group.append(buttons,status);
    for(const skill of SKILLS){const b=button(buttons,skill,()=>{
      const next=skills.includes(skill)?skills.filter(s=>s!==skill):[...skills,skill];
      const result=updateProfileSkills(host.closest('.town'),next);skills=result.profile.skills;
      // Refresh only role hints, not forms, navigation, search or team/chat state.
      for(const node of buttons.children)node.setAttribute('aria-pressed',String(skills.includes(node.textContent)));
      teamRequest('/session',{nickname:root.dataset.nickname||'Explorer',skills}).catch(error=>notice(error.message));
      for(const entry of coverageNodes){entry.node.replaceChildren();coverage(entry.node,entry.team,false);}
      status.textContent=(skills.length?'Self-reported skills · recruitment preferences only.':'No skills selected. You can skip this.')+(result.persisted?'':' Changes last for this visit; browser storage is unavailable.');
    });b.setAttribute('aria-pressed',String(skills.includes(skill)));}
  }
  const coverageNodes=[];
  function requirements(){
    const section=add('section',undefined,'team-requirements');section.append(el('h3','Event requirements'),el('p','Team size rule: '+(item.teamSizeRule||'Not confirmed')),el('p',item.eligibility||'Eligibility not confirmed.'),el('p','Source-draft requirements · check official information. Skill overlap and recruitment capacity do not establish eligibility.','op-source'));
  }
  function render(){
    coverageNodes.length=0;host.replaceChildren();
    button(host,view==='list'?'← Opportunity':'← Teams',()=>view==='list'?(()=>{stopped=true;clearTimeout(timer);observer.disconnect();onBack();})():go('list'));
    add('p',item.title,'op-category');
    if(view==='list'){
      heading('Find a team');skillPicker();
      button(actions(),'Refresh teams',()=>act(async()=>{}));
      if(!teams.length)add('p','No teams yet. Start one for this opportunity.','op-meta');
      for(const team of teams){
        const row=add('section',undefined,'team-row');row.append(el('h3',team.name),el('p',team.intro),el('p',team.members.length+' / '+team.capacity+' members · Looking for: '+team.roles,'op-meta'));
        coverage(row,team);
        button(row,team.isMember?'Manage team':'View team',()=>{selected=team;go('team');});
      }
      requirements();
      button(actions(),own()?'My team':'Create a team',()=>{if(own()){selected=own();go('team');}else go('create');},true);
    }else if(view==='create'){
      heading('Start a team');
      const form=add('form');form.innerHTML='<label for="team-name">Team name</label><input id="team-name" name="name" maxlength="48" required placeholder="Give your team a name"><label for="team-intro">What would you like to build?</label><textarea id="team-intro" name="intro" maxlength="240" required></textarea><div class="team-fields"><div><label for="team-roles">Skills you are looking for</label><input id="team-roles" name="roles" maxlength="80" required placeholder="Design, frontend…"></div><div><label for="team-capacity">Total team capacity</label><select id="team-capacity" name="capacity"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option></select></div></div>';
      const error=el('p');error.setAttribute('role','alert');form.append(error);
      const submit=el('button','Create team','primary');submit.type='submit';form.append(submit);
      form.addEventListener('submit',e=>{e.preventDefault();if(busy)return;submit.disabled=true;act(async()=>{const result=await teamRequest('',{...Object.fromEntries(new FormData(form)),opportunity:item.id});await refresh();selected=teams.find(team=>team.id===result.id);},'team').finally(()=>{submit.disabled=false;});});
    }else if(view==='team'){
      heading(selected.name);skillPicker();add('p',selected.intro);add('p','Looking for: '+selected.roles);add('h3','Members · '+selected.members.length+' / '+selected.capacity);
      const members=add('ul');for(const member of selected.members)members.append(el('li',member.name+(member.id===selected.captain?' · captain':'')));
      coverage(host,selected);requirements();
      if(selected.isCaptain){
        const requests=add('section',undefined,'team-row');requests.append(el('h3','Join requests'));
        if(!selected.requests.length)requests.append(el('p','No pending requests.','op-meta'));
        for(const applicant of selected.requests){const row=el('div');row.append(el('p',applicant.name));for(const action of ['accept','reject'])button(row,action==='accept'?'Accept':'Reject',()=>act(()=>teamRequest('/'+selected.id+'/'+action,{userId:applicant.id})));requests.append(row);}
        button(actions(),'Disband team',()=>{if(confirm('Disband this team and remove its messages?'))act(()=>teamRequest('/'+selected.id+'/disband',{}),'list');});
        for(const member of selected.members.filter(m=>m.id!==selected.captain))button(actions(),'Make '+member.name+' captain',()=>act(()=>teamRequest('/'+selected.id+'/transfer',{userId:member.id})));
      }
      if(selected.isMember){button(actions(),'Open Team Chat',()=>go('chat'),true);if(!selected.isCaptain)button(actions(),'Leave team',()=>act(()=>teamRequest('/'+selected.id+'/leave',{}),'list'));}
      else{if(selected.pending)add('p','Request pending','team-pending');const b=button(actions(),selected.pending?'Withdraw request':'Request to join',()=>act(()=>teamRequest('/'+selected.id+'/'+(selected.pending?'withdraw':'request'),{})),true);b.disabled=!!own();}
      button(actions(),'Refresh team',()=>act(async()=>{}));
    }else if(view==='chat'){
      heading('Team Chat');add('p',selected.name,'op-category');
      const log=add('div',undefined,'team-log');log.setAttribute('role','log');log.setAttribute('aria-label','Team messages');paintMessages();
      button(actions(),'Load earlier messages',()=>act(async()=>{const data=await teamRequest('/'+selected.id+'/messages'+(messages.length?'?before='+messages[0].id:''));messages=[...data.messages.filter(m=>!messages.some(old=>old.id===m.id)),...messages];},'chat'));
      const form=add('form'),label=el('label','Message your team');label.htmlFor='team-message';const input=el('textarea');input.id='team-message';input.maxLength=500;input.value=state.draft;input.placeholder='Type a message…';
      const send=el('button','Send','primary');send.type='submit';send.disabled=!state.draft.trim();form.append(label,input,send);
      input.addEventListener('input',()=>{state.draft=input.value;send.disabled=!input.value.trim();});
      form.addEventListener('submit',async e=>{e.preventDefault();const text=input.value.trim();if(!text||send.disabled)return;send.disabled=true;if(!pendingMessage||pendingMessage.text!==text)pendingMessage={text,nonce:crypto.randomUUID()};const {nonce}=pendingMessage;try{await teamRequest('/'+selected.id+'/messages',{text,nonce});pendingMessage=null;state.draft='';input.value='';await poll();}catch(error){notice(error.message);}finally{send.disabled=!input.value.trim();}});
    }
    add('p','Shared on this server · guest identity lasts 7 days in this browser. Recruitment capacity does not confirm event eligibility.','op-source team-disclosure');
  }
  function paintMessages(){const log=host.querySelector('.team-log');if(!log)return;log.replaceChildren();if(!messages.length)log.append(el('p','No messages yet.'));for(const message of messages){const p=el('p');p.append(el('strong',message.name),el('br'),document.createTextNode(message.body));log.append(p);}}
  const observer=new MutationObserver(()=>{if(!alive()){stopped=true;clearTimeout(timer);observer.disconnect();}});
  host.replaceChildren();heading('Connecting to teams…');observer.observe(host.closest('.town'),{attributes:true,subtree:true,attributeFilter:['hidden','open']});load();
}
