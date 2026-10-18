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

test('Dodo V2 uses explicit emotion and sleep transitions from the packaged state machine', () => {
  const controller = read('dist/dodo-v2-controller.cjs');
  const config = JSON.parse(read('dist/assets/dodo/v2/dodo_animation_state_machine.json'));
  for (const state of ['disappointed','disappointed_to_melt','melt_loop','doze_to_sleep','sleep_loop','sleep_to_stand'])
    assert.ok(config.states[state], state);
  assert.match(controller, /emotion\.disappointed/);
  assert.match(controller, /idle\.doze_timeout/);
  assert.doesNotMatch(controller, /reverse:true/);
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
