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

test('desktop canvas leaves bookmark tabs to the native dock', () => {
  const app = read('dist/app.js');
  const styles = read('dist/styles.css');
  assert.match(app, /if \(!canvasWindow\) \{\s*bookmarks\.slice\(0, visibleLimit\)\.forEach\(renderBookmark\)/);
  assert.doesNotMatch(app, /const selector = '[^']*\.bookmark/);
  assert.match(styles, /body\.canvas-window-mode \.bookmark-dock/);
});

test('canvas hover paint is stable on legacy Windows compositors', () => {
  const styles = read('dist/styles.css');
  const hitTest = read('electron/canvas-hit-test.cjs');
  assert.match(styles, /body\.canvas-window-mode \.note:hover/);
  assert.match(styles, /body\.canvas-window-mode \.note-controls \{ opacity: 1 !important/);
  assert.match(hitTest, /ignored === false \? 6 : 0/);
});

test('settings no longer exposes competing desktop rendering modes', () => {
  const html = read('dist/index.html');
  const app = read('dist/app.js');
  assert.doesNotMatch(html, /compatibilityButton|desktopModeButton/);
  assert.doesNotMatch(app, /showCompatibilityStatus|showDesktopModeStatus/);
});
