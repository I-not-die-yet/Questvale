import {test} from 'node:test';
import assert from 'node:assert/strict';
import {teamsForSkills} from '../skills.mjs';
const team=(id,roles,extra={})=>({id,roles,members:[{id:'captain',skills:['Design']}],capacity:3,isMember:false,...extra});
test('only open non-member teams with exact self-reported role overlap are shown',()=>{
 const teams=[team('match','Design, Backend'),team('full','Design',{capacity:1}),team('own','Design',{isMember:true}),team('other','Research'),team('partial','Product Design')];
 assert.deepEqual(teamsForSkills(teams,['Design']),[{team:teams[0],matches:['Design'],openSlots:2}]);
});
test('empty or unsupported skills and empty teams do not fabricate matches',()=>{
 assert.deepEqual(teamsForSkills([team('a','Design')],[]),[]);assert.deepEqual(teamsForSkills([team('a','Design')],['Unknown']),[]);assert.deepEqual(teamsForSkills([],['Design']),[]);
});
test('changing skills updates overlap without sorting or mutating team data',()=>{
 const teams=[team('a','Frontend / Design'),team('b','backend; presentation',{pending:true})],before=JSON.stringify(teams);
 assert.deepEqual(teamsForSkills(teams,['Frontend']).map(x=>x.team.id),['a']);
 assert.deepEqual(teamsForSkills(teams,['Backend','Presentation']).map(x=>x.matches),[['Backend','Presentation']]);
 assert.deepEqual(teamsForSkills(teams,['Design','Backend']).map(x=>x.team.id),['a','b']);assert.equal(JSON.stringify(teams),before);
});
