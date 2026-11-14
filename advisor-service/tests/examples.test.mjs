import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {start, mockSelection} from './helpers.mjs';

for (const name of ['success', 'needs-information', 'no-recommendations', 'invalid-request']) {
  test(`contract example ${name} matches actual local HTTP behavior`, async t => {
    const example = JSON.parse(await readFile(new URL(`../examples/${name}.json`, import.meta.url), 'utf8'));
    assert.equal(example.testOnly, true);
    const model = mockSelection(example.selectionForTest.opportunityIds);
    const {post} = await start(t, {model, clock: () => new Date(example.asOf)});
    const response = await post(example.request);
    assert.equal(response.status, example.status);
    assert.deepEqual(await response.json(), example.response);
    if (response.status === 400) assert.equal(model.calls.length, 0);
  });
}
