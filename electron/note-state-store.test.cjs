const assert = require('node:assert/strict');
const test = require('node:test');
const { NoteStateStore } = require('./note-state-store.cjs');

const fixture = () => ({ assistant: { tucked: false }, notes: [
  { id: 'a', type: 'quick', title: 'First', content: '' },
  { id: 'b', type: 'todo', title: 'Second', todos: [] }
] });

test('updating a note cannot overwrite another window’s note or assistant data', () => {
  const store = new NoteStateStore(fixture());
  const first = store.snapshot('a');
  first.note.content = 'A new line';
  assert.equal(store.update('a', first.version, first.note).accepted, true);
  assert.equal(store.snapshot('b').note.title, 'Second');
  assert.equal(JSON.parse(store.serialize()).assistant.tucked, false);
});

test('simultaneous edits to one note cannot silently overwrite each other', () => {
  const store = new NoteStateStore(fixture());
  const first = store.snapshot('a');
  const second = store.snapshot('a');
  first.note.title = 'Fresh';
  second.note.title = 'Stale';
  store.update('a', first.version, first.note);
  const conflict = store.update('a', second.version, second.note);
  assert.equal(conflict.accepted, false);
  assert.equal(conflict.reason, 'conflict');
  assert.equal(conflict.current.note.title, 'Fresh');
});

test('control-window updates invalidate only modified note snapshots', () => {
  const store = new NoteStateStore(fixture());
  const noteA = store.snapshot('a');
  const noteB = store.snapshot('b');
  const updated = fixture(); updated.notes[1].title = 'Changed';
  store.setState(updated, store.revision);
  assert.equal(store.snapshot('a').version, noteA.version);
  assert.equal(store.snapshot('b').version, noteB.version + 1);
});

test('a stale whole-app write cannot erase a newer edit from an independent note window', () => {
  const store = new NoteStateStore(fixture());
  const old = store.fullSnapshot();
  const first = store.snapshot('a');
  first.note.content = 'Draft saved in note window';
  assert.equal(store.update('a', first.version, first.note).accepted, true);
  old.state.assistant.tucked = true;
  const stale = store.setState(old.state, old.revision);
  assert.equal(stale.accepted, false);
  assert.equal(stale.current.state.notes[0].content, 'Draft saved in note window');
  assert.equal(store.fullSnapshot().state.assistant.tucked, false);
});

test('a fresh whole-app write keeps changes from other windows and rejects duplicate ids', () => {
  const store = new NoteStateStore(fixture());
  const snapshot = store.fullSnapshot();
  snapshot.state.assistant.tucked = true;
  assert.equal(store.setState(snapshot.state, snapshot.revision).accepted, true);
  assert.equal(store.fullSnapshot().state.assistant.tucked, true);
  assert.throws(() => store.setState({ notes: [{ id: 'a', type: 'quick' }, { id: 'a', type: 'todo' }] }), /Duplicate/);
  assert.equal(store.fullSnapshot().state.notes.length, 2);
});

test('a whole-app write without a revision cannot silently replace newer state', () => {
  const store = new NoteStateStore(fixture());
  const changed = fixture(); changed.notes[0].title = 'No version supplied';
  assert.equal(store.setState(changed).reason, 'conflict');
  assert.equal(store.snapshot('a').note.title, 'First');
});
