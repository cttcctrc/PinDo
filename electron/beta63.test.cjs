const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('transparent control hit testing never shapes Windows into black rectangles', () => {
  const source = read('electron/control-pointer.cjs');
  assert.doesNotMatch(source, /\.setShape\s*\(/);
  assert.match(source, /setIgnoreMouseEvents/);
});

test('native resize updates use an asynchronous lightweight preview and commit on release', () => {
  const preload = read('electron/preload.cjs');
  const app = read('dist/app.js');
  const gesture = read('electron/window-gesture.cjs');
  assert.match(preload, /action === 'update'.*ipcRenderer\.send/s);
  assert.match(app, /updateFrame = requestAnimationFrame/);
  assert.match(gesture, /session\.kind === 'resize'\) resizePreview\?\.update\(bounds\)/);
  assert.match(gesture, /if \(action === 'end'\)[\s\S]*win\.setBounds\(bounds\)/);
  assert.doesNotMatch(preload, /gesture:\s*\(action, kind\)\s*=>\s*ipcRenderer\.sendSync/);
});

test('settings keeps Dodo in the visible native control regions', () => {
  const app = read('dist/app.js');
  assert.match(app, /\[settingsDialog,assistantMascot,dodoCanvas,sleepVisual,ghost\]/);
});

test('native note host is transparent, shadowless, and uses only an inner edge', () => {
  const manager = read('electron/note-window-manager.cjs');
  const css = read('dist/styles.css');
  assert.match(manager, /backgroundColor:\s*'#00000000', hasShadow:\s*false/);
  assert.match(css, /html:has\(body\.note-window-mode\)/);
  assert.match(css, /body\.note-window-mode \.note\.is-resizing[\s\S]*box-shadow: inset/);
});
