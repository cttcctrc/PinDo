const test = require('node:test');
const assert = require('node:assert/strict');
const { cloudSafeState, mergeStates, checksum, preserveDeviceLocalFields } = require('./cloud-sync.cjs');
test('cloud sync removes local-only paths and assets', () => {
  const state = cloudSafeState({ notes: [{ id: 'o', type: 'organizer', desktopItems: [{ id: 'x', name: 'App', path: 'C:/secret.exe', icon: 'data:image/png;base64,x', kind: 'file' }] }, { id: 'q', captureImage: 'data:image/png;base64,y' }], customPets: [{ data: 'large' }] });
  assert.equal(state.notes[0].desktopItems[0].path, undefined); assert.equal(state.notes[0].desktopItems[0].icon, undefined); assert.equal(state.notes[1].captureImage, undefined); assert.equal(state.customPets, undefined);
});
test('cloud conflicts preserve local work as a duplicate', () => {
  const merged = mergeStates({ notes: [{ id: 'a', title: 'local' }] }, { notes: [{ id: 'a', title: 'remote' }] });
  assert.equal(merged.notes.length, 2); assert.match(merged.notes[1].title, /同步冲突副本/); assert.notEqual(merged.notes[1].id, 'a');
});
test('cloud checksum is deterministic', () => assert.equal(checksum({ a: 1 }), checksum({ a: 1 })));
test('cloud payloads preserve this device organizer targets and icons', () => {
  const remote={notes:[{id:'o',type:'organizer',desktopItems:[{id:'x',name:'Chrome',kind:'app'}]}]};
  const local={notes:[{id:'o',type:'organizer',desktopItems:[{id:'x',name:'Chrome',kind:'app',path:'C:/Chrome.lnk',icon:'data:image/png;base64,abc',iconVersion:5}]}]};
  const hydrated=preserveDeviceLocalFields(remote,local);
  assert.equal(hydrated.notes[0].desktopItems[0].path,'C:/Chrome.lnk');
  assert.equal(hydrated.notes[0].desktopItems[0].icon,'data:image/png;base64,abc');
});
