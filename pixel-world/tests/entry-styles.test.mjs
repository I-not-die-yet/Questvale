import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
for(const entry of ['town.html','rpg.html'])test(entry+' loads the shared board/chat/guide skin and joystick',()=>{
 const html=readFileSync(new URL('../'+entry,import.meta.url),'utf8');
 for(const css of ['approved.css','explore.css','town-ui.css','rpg-ui.css','entry.css','guide.css','opportunity-board.css']){
  assert.ok(html.includes('href="'+css+'"'),entry+' missing '+css);assert.ok(existsSync(new URL('../'+css,import.meta.url)));
 }
 assert.match(html,/<body class="rpg">/);assert.match(html,/touch-joystick/);assert.doesNotMatch(html,/controls-help/);
});
