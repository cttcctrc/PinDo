const assert = require('node:assert/strict');
const test = require('node:test');
const { pathToFileURL } = require('node:url');
const { registerNoteIpc } = require('./note-ipc.cjs');
const { NoteStateStore } = require('./note-state-store.cjs');

function fixture() {
  const handlers = new Map(), writes = [], notifications = [];
  const ipcMain = { on: (name, fn) => handlers.set(name, fn) };
  const store = new NoteStateStore({ notes: [
    { id: 'alpha', type: 'quick', content: '' },
    { id: 'beta', type: 'quick', content: '' }
  ] });
  const indexPath = '/tmp/pindo/index.html';
  const frame = { url: `${pathToFileURL(indexPath).href}?noteWindow=alpha` };
  const contents = { mainFrame: frame };
  const fakeWin = { webContents: contents, isDestroyed: () => false, hideCalled: 0, hide() { this.hideCalled += 1; } };
  const manager = { windows: new Map([['alpha', fakeWin]]), setBounds: (id, bounds) => ({ accepted: id === 'alpha', bounds }) };
  registerNoteIpc({ ipcMain, manager, store, indexPath,
    persist: serialized => writes.push(serialized), onUpdated: (...args) => notifications.push(args) });
  return { handlers, writes, notifications, store, fakeWin, event: { sender: contents, senderFrame: frame } };
}

test('a note window may read only its own note and update only that note', async () => {
  const { handlers, writes, notifications, store, event } = fixture();
  const read = () => { const reply = {}; handlers.get('pindo:note-snapshot')({ ...event, returnValue: null, set returnValue(value) { reply.value = value; } }); return reply.value; };
  const update = (version, note) => { const reply = {}; handlers.get('pindo:note-update')({ ...event, returnValue: null, set returnValue(value) { reply.value = value; } }, version, note); return reply.value; };
  const snapshot = read();
  assert.equal(snapshot.id, 'alpha');
  assert.equal(snapshot.note.id, 'alpha');
  snapshot.note.content = 'Private entry';
  const result = update(snapshot.version, snapshot.note);
  assert.equal(result.accepted, true);
  assert.equal(store.snapshot('beta').note.content, '');
  assert.equal(writes.length, 1);
  assert.equal(notifications.length, 0); // Do not destroy a sender before its synchronous reply.
  await new Promise(setImmediate);
  assert.equal(notifications.length, 1);
});

test('forged note ids, fake frames, stale versions and oversized content do not persist', () => {
  const { handlers, writes, event } = fixture();
  const read = () => { const reply = {}; handlers.get('pindo:note-snapshot')({ ...event, returnValue: null, set returnValue(value) { reply.value = value; } }); return reply.value; };
  const update = (version, note) => { const reply = {}; handlers.get('pindo:note-update')({ ...event, returnValue: null, set returnValue(value) { reply.value = value; } }, version, note); return reply.value; };
  const snapshot = read();
  snapshot.note.id = 'beta';
  assert.equal(update(snapshot.version, snapshot.note).accepted, false);
  const fakeEvent = { sender: event.sender, senderFrame: { url: event.senderFrame.url } }; let fakeReply;
  handlers.get('pindo:note-snapshot')({ ...fakeEvent, set returnValue(value) { fakeReply = value; } }); assert.equal(fakeReply, null);
  handlers.get('pindo:note-snapshot')({ sender: event.sender, senderFrame: { url: 'https://evil.test' }, set returnValue(value) { fakeReply = value; } }); assert.equal(fakeReply, null);
  snapshot.note.id = 'alpha';
  assert.equal(update(snapshot.version, snapshot.note).accepted, true);
  assert.equal(update(snapshot.version, snapshot.note).reason, 'conflict');
  snapshot.note.content = 'x'.repeat(2_000_000);
  assert.equal(update(1, snapshot.note).reason, 'too-large');
  assert.equal(writes.length, 1);
});

test('native bounds changes use the verified note-window identity', () => {
  const { handlers, event } = fixture(); const reply = {};
  handlers.get('pindo:note-set-bounds')({ ...event, set returnValue(value) { reply.value = value; } }, { x: 12, y: 24, width: 300, height: 220 });
  assert.equal(reply.value.accepted, true);
  const forged = {}; handlers.get('pindo:note-set-bounds')({ sender: event.sender, senderFrame: { url: 'https://evil.test' }, set returnValue(value) { forged.value = value; } }, { x: 1, y: 2, width: 3, height: 4 });
  assert.equal(forged.value.accepted, false);
});

test('archiving hides the native note synchronously so no ghost window remains', () => {
  const { handlers, store, fakeWin, event } = fixture();
  const snapshot = store.snapshot('alpha'); snapshot.note.mode = 'bookmark';
  let result;
  handlers.get('pindo:note-update')({ ...event, set returnValue(value) { result = value; } }, snapshot.version, snapshot.note);
  assert.equal(result.accepted, true);
  assert.equal(fakeWin.hideCalled, 1);
  assert.equal(fakeWin.pindoParked, true);
  assert.equal(store.snapshot('alpha').note.mode, 'bookmark');
});
