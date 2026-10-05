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
