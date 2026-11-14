import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {normalizeSkills} from './skills.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function createTeamService(path,opportunityIds){
 const db=new DatabaseSync(path);db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS guests(id TEXT PRIMARY KEY,name TEXT NOT NULL,skills TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user TEXT REFERENCES guests(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS teams(id TEXT PRIMARY KEY,opportunity TEXT NOT NULL,captain TEXT REFERENCES guests(id),name TEXT NOT NULL,intro TEXT NOT NULL,roles TEXT NOT NULL,capacity INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS members(team TEXT REFERENCES teams(id) ON DELETE CASCADE,user TEXT REFERENCES guests(id),opportunity TEXT NOT NULL,PRIMARY KEY(team,user),UNIQUE(opportunity,user));
 CREATE TABLE IF NOT EXISTS requests(team TEXT REFERENCES teams(id) ON DELETE CASCADE,user TEXT REFERENCES guests(id),PRIMARY KEY(team,user));
 CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,team TEXT REFERENCES teams(id) ON DELETE CASCADE,user TEXT REFERENCES guests(id),body TEXT NOT NULL,created INTEGER NOT NULL,nonce TEXT NOT NULL,UNIQUE(team,user,nonce));`);
 db.exec('CREATE TABLE IF NOT EXISTS town_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,user TEXT REFERENCES guests(id),body TEXT NOT NULL,created INTEGER NOT NULL,nonce TEXT NOT NULL,UNIQUE(user,nonce))');
 const one=(sql,...args)=>db.prepare(sql).get(...args),all=(sql,...args)=>db.prepare(sql).all(...args),run=(sql,...args)=>db.prepare(sql).run(...args);
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(400,'Check the required fields and length limits.');return value.trim();};
 function authenticate(cookie){const token=cookie?.match(/(?:^|;\s*)qv_session=([a-f0-9]{64})(?:;|$)/)?.[1];return token?one('SELECT user FROM sessions WHERE token=? AND expires>?',hash(token),Date.now())?.user||null:null;}
 function teamView(t,user){
  const members=all('SELECT g.id,g.name,g.skills FROM guests g JOIN members m ON g.id=m.user WHERE m.team=?',t.id);
  return {...t,members:members.map(m=>({id:m.id,name:m.name,skills:JSON.parse(m.skills)})),isCaptain:t.captain===user,isMember:members.some(m=>m.id===user),pending:!!one('SELECT 1 FROM requests WHERE team=? AND user=?',t.id,user),requests:t.captain===user?all('SELECT g.id,g.name FROM guests g JOIN requests r ON g.id=r.user WHERE r.team=?',t.id):[]};
 }
 async function handle(request){
  const url=new URL(request.url);let cookie;
  const response=(data,status=200)=>{const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store'});if(cookie){headers.append('Set-Cookie',cookie);headers.append('Set-Cookie','qv_session=; HttpOnly; SameSite=Strict; Path=/api/teams; Max-Age=0'+(url.protocol==='https:'?'; Secure':''));}return new Response(JSON.stringify(data),{status,headers});};
  try{
   if(request.method!=='GET'){
    if(request.headers.get('x-questvale-client')!=='teams'||request.headers.get('origin')&&request.headers.get('origin')!==url.origin)fail(403,'Same-origin requests only.');
    if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'JSON required.');
   }
   const token=request.headers.get('cookie')?.match(/(?:^|;\s*)qv_session=([a-f0-9]{64})(?:;|$)/)?.[1];
   let session=token?one('SELECT user FROM sessions WHERE token=? AND expires>?',hash(token),Date.now()):null;
   let body={};if(request.method!=='GET'){const raw=await request.text();if(raw.length>4096)fail(413,'Request too large.');try{body=JSON.parse(raw);}catch{fail(400,'Invalid JSON.');}if(!body||typeof body!=='object')fail(400,'Invalid request.');}
   if(url.pathname==='/api/teams/session'&&request.method==='POST'){
    const name=text(body.nickname||'Explorer',24),skills=JSON.stringify(normalizeSkills(body.skills));
    if(!session){const id=randomBytes(16).toString('hex'),secret=randomBytes(32).toString('hex');run('INSERT INTO guests VALUES(?,?,?)',id,name,skills);run('INSERT INTO sessions VALUES(?,?,?)',hash(secret),id,Date.now()+7*86400000);cookie=`qv_session=${secret}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=604800${url.protocol==='https:'?'; Secure':''}`;session={user:id};}
    else run('UPDATE guests SET name=?,skills=? WHERE id=?',name,skills,session.user);
    if(!cookie)cookie=`qv_session=${token}; HttpOnly; SameSite=Strict; Path=/api${url.protocol==='https:'?'; Secure':''}`;
    return response({userId:session.user});
   }
   if(!session)fail(401,'Your guest session expired. Reopen the team panel to reconnect.');
   const user=session.user;
   if(url.pathname==='/api/teams'&&request.method==='GET'){
    const opportunity=url.searchParams.get('opportunity');if(!opportunityIds.has(opportunity))fail(400,'Unknown opportunity.');
    return response({teams:all('SELECT * FROM teams WHERE opportunity=? ORDER BY rowid DESC LIMIT 100',opportunity).map(t=>teamView(t,user))});
   }
   if(url.pathname==='/api/teams'&&request.method==='POST'){
    if(!opportunityIds.has(body.opportunity))fail(400,'Unknown opportunity.');
    const name=text(body.name,48),intro=text(body.intro,240),roles=text(body.roles,80),capacity=Number(body.capacity);
    if(!Number.isInteger(capacity)||capacity<2||capacity>6)fail(400,'Capacity must be between 2 and 6.');
    const id=randomBytes(16).toString('hex');db.exec('BEGIN IMMEDIATE');
    try{if(one('SELECT 1 FROM members WHERE opportunity=? AND user=?',body.opportunity,user))fail(409,'You already belong to a team for this opportunity.');run('INSERT INTO teams VALUES(?,?,?,?,?,?,?)',id,body.opportunity,user,name,intro,roles,capacity);run('INSERT INTO members VALUES(?,?,?)',id,user,body.opportunity);run('DELETE FROM requests WHERE user=? AND team IN (SELECT id FROM teams WHERE opportunity=?)',user,body.opportunity);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
    return response({id},201);
   }
   if(url.pathname==='/api/teams/town/messages'){
    if(request.method==='GET'){
     const before=Number(url.searchParams.get('before')),after=Number(url.searchParams.get('after'));
     if(!Number.isSafeInteger(before)||before<0||!Number.isSafeInteger(after)||after<0)fail(400,'Invalid message cursor.');
     const rows=after>0?all('SELECT m.id,m.body,m.created,g.name FROM town_messages m JOIN guests g ON g.id=m.user WHERE m.id>? ORDER BY m.id LIMIT 50',after):all('SELECT m.id,m.body,m.created,g.name FROM town_messages m JOIN guests g ON g.id=m.user WHERE (?=0 OR m.id<?) ORDER BY m.id DESC LIMIT 50',before,before).reverse();
     return response({messages:rows});
    }
    if(request.method==='POST'){
     const value=text(body.text,500),nonce=text(body.nonce,80);
     if(one('SELECT 1 FROM town_messages WHERE user=? AND nonce=?',user,nonce))return response({ok:true});
     const last=one('SELECT MAX(created) AS time FROM town_messages WHERE user=?',user);if(Date.now()-(last?.time||0)<500)fail(429,'Please wait a moment before sending again.');
     run('INSERT INTO town_messages(user,body,created,nonce) VALUES(?,?,?,?)',user,value,Date.now(),nonce);return response({ok:true},201);
    }
    fail(405,'Method not allowed.');
   }
   const parts=url.pathname.split('/'),id=parts[3],action=parts[4];if(parts[1]!=='api'||parts[2]!=='teams'||parts.length!==5)fail(404,'Not found.');
   const team=one('SELECT * FROM teams WHERE id=?',id);if(!team)fail(404,'Team no longer exists.');
   const member=()=>{if(!one('SELECT 1 FROM members WHERE team=? AND user=?',id,user))fail(403,'Team members only.');};
   const captain=()=>{if(team.captain!==user)fail(403,'Captain only.');};
   if(action==='messages'){
    member();
    if(request.method==='GET'){
     const before=Number(url.searchParams.get('before')),after=Number(url.searchParams.get('after'));
     const rows=after>0?all('SELECT m.id,m.body,m.created,g.name FROM messages m JOIN guests g ON g.id=m.user WHERE m.team=? AND m.id>? ORDER BY m.id LIMIT 50',id,after):all('SELECT m.id,m.body,m.created,g.name FROM messages m JOIN guests g ON g.id=m.user WHERE m.team=? AND (?=0 OR m.id<?) ORDER BY m.id DESC LIMIT 50',id,before||0,before||0).reverse();return response({messages:rows});
    }
    if(request.method==='POST'){
     const value=text(body.text,500),nonce=text(body.nonce,80);
     if(one('SELECT 1 FROM messages WHERE team=? AND user=? AND nonce=?',id,user,nonce))return response({ok:true});
     const last=one('SELECT MAX(created) AS time FROM messages WHERE user=?',user);if(Date.now()-(last?.time||0)<500)fail(429,'Please wait a moment before sending again.');
     run('INSERT INTO messages(team,user,body,created,nonce) VALUES(?,?,?,?,?)',id,user,value,Date.now(),nonce);return response({ok:true},201);
    }
   }
   if(request.method!=='POST')fail(405,'Method not allowed.');
   db.exec('BEGIN IMMEDIATE');try{
    if(action==='request'){
     if(one('SELECT 1 FROM members WHERE opportunity=? AND user=?',team.opportunity,user))fail(409,'You already belong to a team for this opportunity.');
     if(one('SELECT COUNT(*) AS n FROM members WHERE team=?',id).n>=team.capacity)fail(409,'Team is full.');run('INSERT OR IGNORE INTO requests VALUES(?,?)',id,user);
    }else if(action==='withdraw')run('DELETE FROM requests WHERE team=? AND user=?',id,user);
    else if(action==='accept'||action==='reject'){
     captain();const applicant=text(body.userId,64);if(!one('SELECT 1 FROM requests WHERE team=? AND user=?',id,applicant))fail(409,'Request is no longer pending.');
     if(action==='accept'){
      if(one('SELECT COUNT(*) AS n FROM members WHERE team=?',id).n>=team.capacity)fail(409,'Team is full.');
      if(one('SELECT 1 FROM members WHERE opportunity=? AND user=?',team.opportunity,applicant))fail(409,'Applicant already joined a team.');
      run('INSERT INTO members VALUES(?,?,?)',id,applicant,team.opportunity);run('DELETE FROM requests WHERE user=? AND team IN (SELECT id FROM teams WHERE opportunity=?)',applicant,team.opportunity);
     }else run('DELETE FROM requests WHERE team=? AND user=?',id,applicant);
    }else if(action==='leave'){member();if(team.captain===user)fail(409,'Transfer captainship or disband the team first.');run('DELETE FROM members WHERE team=? AND user=?',id,user);}
    else if(action==='transfer'){captain();const next=text(body.userId,64);if(!one('SELECT 1 FROM members WHERE team=? AND user=?',id,next))fail(400,'Choose a current member.');run('UPDATE teams SET captain=? WHERE id=?',next,id);}
    else if(action==='disband'){captain();run('DELETE FROM teams WHERE id=?',id);}
    else fail(404,'Not found.');
    db.exec('COMMIT');return response({ok:true});
   }catch(e){db.exec('ROLLBACK');throw e;}
  }catch(error){return response({error:error.status?error.message:'Team service unavailable.'},error.status||500);}
 }
 return {handle,authenticate,close:()=>db.close()};
}
