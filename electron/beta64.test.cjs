const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('edge preview owns its fixed instruction instead of a cursor-following renderer hint', () => {
  const preview = read('electron/edge-preview.cjs');
  const native = read('electron/native-features.cjs');
  const app = read('dist/app.js');
  assert.match(preview, /松开收纳/);
  assert.match(native, /edgePreview\.show\([^\n]+松开隐藏 Dodo/);
  assert.doesNotMatch(native, /pindo:edge-hint/);
  assert.doesNotMatch(app, /native-edge-hint/);
});

test('Dodo V2 loads only the standing asset at startup and bounds the main cache', () => {
  const app = read('dist/app.js'), controller = read('dist/dodo-v2-controller.cjs');
  assert.match(app, /await dodoController\.start\(\)/);
  assert.doesNotMatch(app, /forEach\(loadDodoImage\)/);
  assert.match(controller, /new AssetStore\(options\.assetBase, 2/);
  assert.match(controller, /result\.image\.duration/);
});

test('all local CSS asset URLs resolve after unused-asset cleanup', () => {
  const css = read('dist/styles.css');
  const refs = [...css.matchAll(/url\(["']?(\.\/assets\/[^"')]+)["']?\)/g)].map(match => match[1]);
  for (const ref of refs) assert.equal(fs.existsSync(path.join(root, 'dist', ref)), true, ref);
  for (const removed of ['walk.webp','tuck_in.webp','tuck_out.webp','sleep_stretch.webp','depressed.png'])
    assert.equal(fs.existsSync(path.join(root, 'dist/assets/dodo/animations', removed)), false, removed);
  for (const removed of ['character-sheet.png','peeking-right.png'])
    assert.equal(fs.existsSync(path.join(root, 'dist/assets/dodo', removed)), false, removed);
});

test('side-tab expansion parks and reuses native note renderers', () => {
  const manager = read('electron/note-window-manager.cjs');
  assert.match(manager, /win\.pindoParked = true/);
  assert.match(manager, /win\.hide\(\)/);
  assert.match(manager, /win\.showInactive\(\)/);
});
