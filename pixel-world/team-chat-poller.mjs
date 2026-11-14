// One in-flight poll; responses and failures belong to one chat visit only.
export function createTeamChatPoller({request,alive,after,onRows,onError,schedule=setTimeout,cancel=clearTimeout}){
  let generation=0,team=null,timer=null,polling=false,failures=0;
  function capture(){const version=generation,id=team;return {id,valid:()=>id!==null&&team===id&&version===generation&&alive()};}
  function stop(){generation++;team=null;cancel(timer);timer=null;}
  async function poll(){
    cancel(timer);timer=null;const visit=capture();if(!visit.valid()||polling||failures>=3)return;
    polling=true;
    try{
      const cursor=after();const data=await request('/'+visit.id+'/messages'+(cursor?'?after='+cursor:''));
      if(!visit.valid())return;onRows(data.messages);failures=0;
    }catch(error){if(visit.valid()){failures++;onError(error,failures>=3);}}
    finally{
      polling=false;
      if(capture().valid()&&failures<3)timer=schedule(poll,visit.valid()?3000:0);
    }
  }
  function start(id){stop();team=id;failures=0;return poll();}
  return {start,stop,poll,capture};
}
