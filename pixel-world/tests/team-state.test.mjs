import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTeamPreviewStore} from '../team-state.mjs';
const fields={name:' Campus crew ',intro:'Build a tool',roles:'Design',capacity:'4'};
test('teams are scoped to opportunities and survive reopening during this page session',()=>{
  const store=createTeamPreviewStore(),team=store.create('one',fields);
  assert.equal(team.name,'Campus crew');assert.equal(team.capacity,4);assert.equal(store.get('one').own,team);assert.equal(store.get('two').own,null);
  assert.throws(()=>store.create('one',fields));
});
test('requests do not grant membership or permit chatting',()=>{
  const store=createTeamPreviewStore();store.request('one');assert.equal(store.get('one').pending,true);assert.equal(store.get('one').own,null);assert.equal(store.message('one','hello'),false);
  store.get('one').pending=false;assert.equal(store.get('one').pending,false);
  store.create('one',fields);assert.throws(()=>store.request('one'));
});
test('invalid capacity and blank fields cannot create a team',()=>{
  for(const values of [{...fields,name:' '},{...fields,intro:' '},{...fields,roles:' '},{...fields,capacity:'1'},{...fields,capacity:'7'},{...fields,capacity:'2.5'}])assert.throws(()=>createTeamPreviewStore().create('one',values));
});
test('messages are bounded, local to their team, and cleared when the team is removed',()=>{
  const store=createTeamPreviewStore();store.create('one',fields);store.create('two',fields);
  assert.equal(store.message('one','  '),false);for(let n=0;n<35;n++)store.message('one','Message '+n);
  assert.equal(store.get('one').messages.length,30);assert.equal(store.get('two').messages.length,0);
  store.get('one').draft='draft';store.remove('one');assert.equal(store.get('one').own,null);assert.deepEqual(store.get('one').messages,[]);assert.equal(store.get('one').draft,'');assert.ok(store.get('two').own);
});
