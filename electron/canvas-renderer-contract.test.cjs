const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('canvas renderer declares screen/local geometry and explicit edit lifecycle bridges', () => {
  const app = read('dist/app.js');
  const preload = read('electron/preload.cjs');
  assert.match(app, /canvasOriginX/);
  assert.match(app, /canvasLocalX/);
  assert.match(app, /endCanvasEdit/);
  assert.match(preload, /pindo:canvas-end-edit/);
});

test('canvas gesture cleanup covers cancellation blur visibility and page teardown', () => {
  const app = read('dist/app.js');
  assert.match(app, /lostpointercapture/);
  assert.match(app, /pagehide/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /setCanvasGesture\(false\)/);
});

test('canvas regions use acknowledged IPC and retry rejected publications', () => {
  const app = read('dist/app.js');
  const preload = read('electron/preload.cjs');
  assert.match(preload, /invoke\('pindo:canvas-regions'/);
  assert.match(app, /if \(result\?\.accepted\) acceptedRegions = serialized/);
  assert.match(app, /catch \{\s*acceptedRegions = "";/);
});

test('desktop canvas renders bookmark tabs and includes them in native hit regions', () => {
  const app = read('dist/app.js');
  assert.match(app, /bookmarks\.slice\(0, visibleLimit\)\.forEach\(renderBookmark\)/);
  assert.match(app, /\.note, \.bookmark, \.bookmark-overflow/);
});
