const assert = require('node:assert/strict');
const test = require('node:test');
const { mergeDraft, shouldDeferSnapshot } = require('../dist/editor-stability.cjs');

test('an active local draft keeps text while accepting the latest canonical window shell', () => {
  const latest = { id: 'n', type: 'quick', content: 'remote', x: 90, y: 80, w: 360, h: 250, mode: 'bookmark', locked: true };
  const draft = { id: 'n', type: 'quick', content: 'local IME draft', x: 1, y: 2, w: 300, h: 210, mode: 'desktop', locked: false };
  assert.deepEqual(mergeDraft(latest, draft), { ...draft, x: 90, y: 80, w: 360, h: 250, mode: 'bookmark', locked: true });
});

test('native snapshots are deferred only while a native editor or IME composition owns the draft', () => {
  assert.equal(shouldDeferSnapshot({ noteWindowId: 'n', compositionDepth: 1, editorActive: false }), true);
  assert.equal(shouldDeferSnapshot({ noteWindowId: 'n', compositionDepth: 0, editorActive: true }), true);
  assert.equal(shouldDeferSnapshot({ noteWindowId: 'n', compositionDepth: 0, editorActive: false }), false);
  assert.equal(shouldDeferSnapshot({ noteWindowId: '', compositionDepth: 1, editorActive: true }), false);
});
