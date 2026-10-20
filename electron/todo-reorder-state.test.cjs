const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyTodoDrop,
  autoScrollDelta,
  createDropCommit,
  slotFromGeometry
} = require('../dist/todo-reorder.cjs');

const ids = items => items.map(item => item.id);
const items = () => ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, quadrant: '' }));

test('todo reorder moves upward and downward using the visible placeholder slot', () => {
  assert.deepEqual(ids(applyTodoDrop(items(), 'd', { nextId: 'b', quadrant: '' }).items), ['a', 'd', 'b', 'c', 'e']);
  assert.deepEqual(ids(applyTodoDrop(items(), 'b', { previousId: 'd', nextId: 'e', quadrant: '' }).items), ['a', 'c', 'd', 'b', 'e']);
});

test('continuous and rapid cross-item movement resolves from stable row centers', () => {
  const rows = [
    { id: 'a', top: 0, bottom: 40 },
    { id: 'c', top: 48, bottom: 88 },
    { id: 'd', top: 96, bottom: 136 },
    { id: 'e', top: 144, bottom: 184 }
  ];
  assert.deepEqual(slotFromGeometry(rows, 12), { previousId: '', nextId: 'a' });
  assert.deepEqual(slotFromGeometry(rows, 72), { previousId: 'c', nextId: 'd' });
  assert.deepEqual(slotFromGeometry(rows, 180), { previousId: 'e', nextId: '' });
});

test('cancel performs no commit and pointer-up commits exactly once', () => {
  let commits = 0;
  const cancelled = createDropCommit(() => commits++);
  cancelled.cancel();
  assert.equal(cancelled.finish(), false);
  assert.equal(commits, 0);
  const commit = createDropCommit(() => commits++);
  assert.equal(commit.finish(), true);
  assert.equal(commit.finish(), false);
  assert.equal(commits, 1);
});

test('todo auto-scroll is bounded and restart preserves the committed order', () => {
  assert.equal(autoScrollDelta(95, 100, 500), -18);
  assert.equal(autoScrollDelta(300, 100, 500), 0);
  assert.equal(autoScrollDelta(495, 100, 500), 16);
  const reordered = applyTodoDrop(items(), 'e', { nextId: 'b', quadrant: '' }).items;
  assert.deepEqual(ids(JSON.parse(JSON.stringify(reordered))), ['a', 'e', 'b', 'c', 'd']);
});

