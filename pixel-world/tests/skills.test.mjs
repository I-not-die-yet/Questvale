import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSkills,roleCoverage} from '../skills.mjs';
import {normalizeProfile} from '../character-sprites.mjs';
test('old profiles remain valid and unsupported skill values are removed',()=>{
 assert.deepEqual(normalizeProfile({character:'boy'}).skills,[]);
 assert.deepEqual(normalizeSkills(['Design','Design','Unknown','Backend']),['Design','Backend']);
 assert.deepEqual(normalizeSkills('Design'),[]);
 assert.deepEqual(normalizeProfile({character:'robot',skills:['Research']}).skills,['Research']);
});
test('role overlap uses explicit skills rather than inferred eligibility or vague substrings',()=>{
 assert.deepEqual(roleCoverage(['Design','Frontend'],'Design / frontend'),['Design','Frontend']);
 assert.deepEqual(roleCoverage(['Backend'],'Frontend'),[]);
 assert.deepEqual(roleCoverage(['Design'],'Design experience required'),[]);
 assert.deepEqual(roleCoverage([], 'Research'),[]);
});
