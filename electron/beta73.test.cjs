const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('native deletion lets Windows dismiss the confirmation before closing its note', () => {
  const source = read('electron/native-features.cjs');
  assert.match(source, /showMessageBox\(win/);
  assert.match(source, /setTimeout\(resolve,50\)/);
  assert.match(source, /win\.hide\(\)/);
});

test('organizer local targets survive cloud hydration and icons refresh as one batch', () => {
  const cloud = read('electron/cloud-sync.cjs');
  const native = read('electron/native-features.cjs');
  assert.match(cloud, /preserveDeviceLocalFields/);
  assert.match(cloud, /\['path', 'icon', 'iconVersion'\]/);
  assert.match(native, /One atomic renderer update/);
  assert.match(native, /const icon=await readIcon\(file\)/);
});

test('every note edge uses the asynchronous resize preview path', () => {
  const app = read('dist/app.js');
  const gesture = read('electron/window-gesture.cjs');
  for (const edge of ['n','s','e','w','ne','nw','se','sw']) assert.match(app, new RegExp(`data-resize-edge=["']${edge}["']`));
  assert.match(gesture, /\^resize:\(n\|s\|e\|w\|ne\|nw\|se\|sw\)\$/);
});

test('dock preview is temporarily raised above desktop note windows', () => {
  const dock = read('electron/native-dock.cjs');
  assert.match(dock, /setAlwaysOnTop\(Boolean\(active\),'floating'\)/);
  assert.match(dock, /if\(active\)this\.window\.moveTop\(\)/);
});

test('unchanged broadcasts and repeated native bounds no longer repaint surfaces', () => {
  assert.match(read('dist/app.js'), /serialized === lastDesktopState/);
  assert.match(read('electron/note-window-manager.cjs'), /pindoRequestedBoundsKey!==requested/);
  assert.match(read('electron/cloud-sync.cjs'), /remote\.checksum !== localChecksum/);
});
