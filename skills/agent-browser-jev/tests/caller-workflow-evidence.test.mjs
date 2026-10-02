import test from 'node:test';
import assert from 'node:assert/strict';
import {allResourcesClosed} from './caller-workflow-evidence.mjs';

test('missing and partial cleanup receipts cannot qualify a study', () => {
  const cleanup = {browserClosed: true, serverClosed: true};
  assert.equal(allResourcesClosed([]), false);
  assert.equal(allResourcesClosed([{}]), false);
  assert.equal(allResourcesClosed([{cleanup: {browserClosed: true}}]), false);
  assert.equal(allResourcesClosed([{cleanup}]), true);
  assert.equal(allResourcesClosed([{cleanup}], true), false);
  assert.equal(allResourcesClosed([{cleanup, restored: true, restoredCleanup: cleanup}], true), true);
  assert.equal(allResourcesClosed([{cleanup, restored: true, restoredCleanup: {...cleanup, serverClosed: false}}], true), false);
});
