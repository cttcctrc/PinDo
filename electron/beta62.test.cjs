const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('Dodo hit regions tolerate absent transient animation elements', () => {
  const app = read('dist/app.js');
  assert.match(app, /elements\.filter\(el => el && !el\.hidden/);
});

test('Dodo mood changes use real forward and reverse sprite transitions', () => {
  const app = read('dist/app.js');
  for (const asset of ['sad_enter.webp', 'sad_loop.webp', 'depressed_enter.webp', 'sleep_enter.webp']) {
    assert.ok(fs.statSync(path.join(root, 'dist/assets/dodo/animations', asset)).size > 10_000, asset);
    assert.match(app, new RegExp(asset.replace('.', '\\.')));
  }
  assert.match(app, /options\.reverse \? 17 - elapsedFrame : elapsedFrame/);
  assert.match(app, /depressed_enter",reverse:true.*sad_enter",reverse:true/);
  assert.doesNotMatch(app, /setDodoSleeping/);
});

test('official PinDo logo is wired to executable, window and tray surfaces', () => {
  const pkg = JSON.parse(read('package.json'));
  const main = read('electron/main.cjs');
  assert.equal(pkg.build.win.icon, 'dist/assets/pindo-logo.ico');
  assert.equal(pkg.build.extraResources[0].to, 'pindo-logo.png');
  assert.match(main, /pindo-logo\.png/);
  assert.ok(fs.existsSync(path.join(root, 'dist/assets/pindo-logo.ico')));
});

test('hovered desktop dock is raised with its detail preview', () => {
  assert.match(read('dist/native-dock.js'), /command\('dock-hover',true\)/);
  assert.match(read('electron/native-features.cjs'), /action==='dock-hover'/);
  assert.match(read('electron/native-dock.cjs'), /setHovered\(active\)/);
});
