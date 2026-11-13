import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfile,CHARACTERS} from '../character-sprites.mjs';
test('only supported saved characters can restore a profile',()=>{
  for(const character of CHARACTERS)assert.equal(normalizeProfile({character:character.id}).character,character.id);
  for(const value of [null,{},'girl',{character:'unknown'}])assert.equal(normalizeProfile(value),null);
});
test('nickname is trimmed, length bounded, and defaults when empty',()=>{
  assert.equal(normalizeProfile({character:'boy',nickname:'  Alex  '}).nickname,'Alex');
  assert.equal(normalizeProfile({character:'girl',nickname:'   '}).nickname,'Explorer');
  assert.equal(normalizeProfile({character:'robot',nickname:'x'.repeat(100)}).nickname.length,24);
});
