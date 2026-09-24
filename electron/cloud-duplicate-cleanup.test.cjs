const test = require('node:test');
const assert = require('node:assert/strict');
const { redundantConflictIds, moveRedundantConflictsToRecycleBin } = require('./cloud-duplicate-cleanup.cjs');

test('only exact generated copies are offered for recovery, preserving edited copies', () => {
  const original = { id: 'a', type: 'quick', title: '计划', content: '内容', x: 10, y: 20, z: 1 };
  const identical = { ...original, id: 'a-conflict-1790138880051-abcdef', title: '计划（同步冲突副本）', x: 34, y: 44, z: 2 };
  const nested = { ...identical, id: `${identical.id}-conflict-1790138880052-fedcba`, title: `${identical.title}（同步冲突副本）` };
  const edited = { ...identical, id: 'a-conflict-1790138880053-123abc', content: '我改过的内容' };
  const state = { notes: [original, identical, nested, edited], recycleBin: [], attachments: [{ parentId: 'a', childId: identical.id }] };
  const ids = redundantConflictIds(state);
  assert.deepEqual(ids, [identical.id, nested.id]);
  const cleaned = moveRedundantConflictsToRecycleBin(state, ids);
  assert.deepEqual(cleaned.notes.map(note => note.id), ['a', edited.id]);
  assert.deepEqual(cleaned.recycleBin.map(note => note.id), ids);
  assert.deepEqual(cleaned.attachments, []);
  assert.deepEqual(redundantConflictIds(cleaned), []);
  assert.equal(state.notes.length, 4);
});

test('keep one surviving copy when the source note is missing', () => {
  const a = { id: 'x-conflict-1790138880051-abcdef', type: 'todo', title: '提醒（同步冲突副本）', todos: [{ text: '待办' }] };
  const b = { ...a, id: 'x-conflict-1790138880052-abcdef' };
  assert.deepEqual(redundantConflictIds({ notes: [a, b] }), [b.id]);
});

test('organizer paths omitted by cloud sync do not hide identical copies', () => {
  const original = { id: 'o', type: 'organizer', title: '文件', desktopItems: [{ id: 'file', name: 'A', path: 'C:/A', icon: 'data:asset' }] };
  const copy = { ...original, id: 'o-conflict-1790138880051-abcdef', title: '文件（同步冲突副本）', desktopItems: [{ id: 'file', name: 'A' }] };
  assert.deepEqual(redundantConflictIds({ notes: [original, copy] }), [copy.id]);
});
