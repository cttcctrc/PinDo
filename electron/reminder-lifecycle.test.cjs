const test = require('node:test');
const assert = require('node:assert/strict');
const { NoteStateStore } = require('./note-state-store.cjs');

function state(todoOverrides = {}) {
  const todo = { id: 'task', text: '提交报告', due: '2026-10-12', dueTime: '18:00', reminder: 'same', ...todoOverrides };
  const key = 'todo:note:task:2026-10-12:18:00:same';
  return {
    notes: [{ id: 'note', type: 'todo', todos: [todo], history: [] }],
    recycleBin: [], attachments: [],
    reminderState: {
      activeItems: [{ key, type: 'todo', noteId: 'note', itemId: 'task', text: todo.text }],
      handled: {}, emailQueue: [{ key, text: todo.text }]
    }
  };
}

test('changing reminder time atomically withdraws the old popup and queued task', () => {
  const store = new NoteStateStore(state());
  const proposed = structuredClone(store.state.notes[0]);
  proposed.todos[0].dueTime = '20:30';
  assert.equal(store.update('note', 0, proposed).accepted, true);
  assert.deepEqual(store.state.reminderState.activeItems, []);
  assert.deepEqual(store.state.reminderState.emailQueue, []);
  assert.equal(store.state.reminderState.handled['todo:note:task:2026-10-12:18:00:same'], true);
  assert.equal(store.state.reminderState.handled['todo:note:task:2026-10-12:20:30:same'], undefined);
});

test('completion, deletion and a stale async write cannot restore an obsolete reminder', () => {
  const store = new NoteStateStore(state());
  const completed = structuredClone(store.state.notes[0]);
  completed.history.push({ ...completed.todos.shift(), completedAt: '2026-10-12 12:00' });
  assert.equal(store.update('note', 0, completed).accepted, true);
  assert.deepEqual(store.state.reminderState.activeItems, []);

  const stale = structuredClone(store.state);
  stale.reminderState.activeItems.push({ key: 'todo:note:task:2026-10-12:18:00:same', type: 'todo', noteId: 'note', itemId: 'task' });
  assert.equal(store.setState(stale, store.revision).accepted, true);
  assert.deepEqual(store.state.reminderState.activeItems, []);

  const removed = structuredClone(store.state);
  removed.notes = [];
  assert.equal(store.setState(removed, store.revision).accepted, true);
  assert.deepEqual(store.state.reminderState.activeItems, []);
});

test('changing or completing a timeline event withdraws its old reminder', () => {
  const key = 'timeline:timeline-note:event:2026-10-12T18:00';
  const initial = {
    notes: [{ id: 'timeline-note', type: 'timeline', events: [{ id: 'event', text: '评审', time: '2026-10-12 18:00', done: false }] }],
    recycleBin: [], attachments: [],
    reminderState: { activeItems: [{ key, type: 'timeline', noteId: 'timeline-note', itemId: 'event' }], handled: {}, emailQueue: [{ key, text: '评审' }] }
  };
  const store = new NoteStateStore(initial);
  const changed = structuredClone(store.state.notes[0]);
  changed.events[0].time = '2026-10-12 20:30';
  assert.equal(store.update('timeline-note', 0, changed).accepted, true);
  assert.deepEqual(store.state.reminderState.activeItems, []);
  assert.deepEqual(store.state.reminderState.emailQueue, []);
  assert.equal(store.state.reminderState.handled[key], true);

  const current = structuredClone(store.state.notes[0]);
  current.events[0].done = true;
  assert.equal(store.update('timeline-note', 1, current).accepted, true);
  assert.deepEqual(store.state.reminderState.activeItems, []);
});

