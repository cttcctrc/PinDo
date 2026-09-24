const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CloudSyncManager, cloudSafeState, mergeStates, checksum, preserveDeviceLocalFields } = require('./cloud-sync.cjs');
test('cloud sync removes local-only paths and assets', () => {
  const state = cloudSafeState({ notes: [{ id: 'o', type: 'organizer', desktopItems: [{ id: 'x', name: 'App', path: 'C:/secret.exe', icon: 'data:image/png;base64,x', kind: 'file' }] }, { id: 'q', captureImage: 'data:image/png;base64,y' }], customPets: [{ data: 'large' }] });
  assert.equal(state.notes[0].desktopItems[0].path, undefined); assert.equal(state.notes[0].desktopItems[0].icon, undefined); assert.equal(state.notes[1].captureImage, undefined); assert.equal(state.customPets, undefined);
});
test('remote changes keep the note ID and do not create conflict copies', () => {
  const local = { notes: [{ id: 'a', title: 'old' }, { id: 'b', title: 'local only' }] };
  const remote = { notes: [{ id: 'a', title: 'remote' }] };
  const baseline = { a: checksum(local.notes[0]) };
  const merged = mergeStates(local, remote, baseline);
  assert.deepEqual(merged.notes, [remote.notes[0], local.notes[1]]);
  assert.deepEqual(mergeStates(merged, remote, { a: checksum(remote.notes[0]) }).notes, merged.notes);
});
test('a local edit since the last sync retains the original ID', () => {
  const local = { notes: [{ id: 'a', title: 'local edit' }] };
  const remote = { notes: [{ id: 'a', title: 'remote edit' }] };
  assert.deepEqual(mergeStates(local, remote, { a: checksum({ id: 'a', title: 'original' }) }).notes, local.notes);
});
test('locally recycled notes stay deleted after a newer remote revision', () => {
  const copy = { id: 'a-conflict-1790138880051-abcdef', type: 'quick', title: 'A（同步冲突副本）' };
  const local = { notes: [], recycleBin: [{ ...copy, deletedAt: 'now' }] };
  const remote = { notes: [copy], recycleBin: [], attachments: [{ parentId: copy.id, childId: 'b' }] };
  const merged = mergeStates(local, remote, { [copy.id]: checksum(copy) });
  assert.deepEqual(merged.notes, []);
  assert.deepEqual(merged.recycleBin, local.recycleBin);
  assert.deepEqual(merged.attachments, []);
});
test('a remote deletion stays deleted when the local note has not changed', () => {
  const note = { id: 'a', type: 'quick', title: 'A' };
  assert.deepEqual(mergeStates({ notes: [note] }, { notes: [] }, { a: checksum(note) }).notes, []);
});
test('repeated cloud revisions do not multiply notes', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-cloud-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let state = { notes: [{ id: 'a', type: 'quick', title: 'old' }] };
  const manager = new CloudSyncManager({ app: { getPath: () => directory }, safeStorage: { isEncryptionAvailable: () => false }, getState: () => state, applyState: value => { state = value; } });
  manager.session = { access_token: 'test' };
  manager.meta.lastSyncedNotes = { a: checksum(state.notes[0]) };
  let revision = 1;
  manager.request = async route => route.includes('pindo_sync_documents')
    ? { data: [{ revision, payload: { notes: [{ id: 'a', type: 'quick', title: 'remote' }] }, checksum: checksum({ notes: [{ id: 'a', type: 'quick', title: 'remote' }] }) }] }
    : { data: { revision: ++revision } };
  await manager.sync();
  await manager.sync();
  assert.deepEqual(state.notes, [{ id: 'a', type: 'quick', title: 'remote' }]);
  assert.equal(revision, 1);
});
test('racing cloud updates stop retrying rather than creating notes indefinitely', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-cloud-race-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let state = { notes: [{ id: 'a', type: 'quick', title: 'local' }] };
  const manager = new CloudSyncManager({ app: { getPath: () => directory }, safeStorage: { isEncryptionAvailable: () => false }, getState: () => state, applyState: value => { state = value; } });
  manager.session = { access_token: 'test' };
  let revision = 1, pushes = 0;
  manager.request = async route => route.includes('pindo_sync_documents')
    ? { data: [{ revision, payload: { notes: [{ id: 'a', type: 'quick', title: 'remote' }] }, checksum: 'changed' }] }
    : (pushes++, { data: { conflict: true, current: { revision: ++revision, state: { notes: [{ id: 'a', type: 'quick', title: 'remote' }] } } } });
  await assert.rejects(manager.sync(), /连续修改/);
  assert.ok(pushes <= 4);
  assert.deepEqual(state.notes.map(note => note.id), ['a']);
});
test('cloud checksum is deterministic', () => assert.equal(checksum({ a: 1 }), checksum({ a: 1 })));
test('cloud payloads preserve this device organizer targets and icons', () => {
  const remote={notes:[{id:'o',type:'organizer',desktopItems:[{id:'x',name:'Chrome',kind:'app'}]}]};
  const local={notes:[{id:'o',type:'organizer',desktopItems:[{id:'x',name:'Chrome',kind:'app',path:'C:/Chrome.lnk',icon:'data:image/png;base64,abc',iconVersion:5}]}]};
  const hydrated=preserveDeviceLocalFields(remote,local);
  assert.equal(hydrated.notes[0].desktopItems[0].path,'C:/Chrome.lnk');
  assert.equal(hydrated.notes[0].desktopItems[0].icon,'data:image/png;base64,abc');
});
