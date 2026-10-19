const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');

test('V2 sleep uses dedicated forward transition, loop and wake assets', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'dist/assets/dodo/v2/dodo_animation_state_machine.json'), 'utf8'));
  assert.equal(config.states.doze_to_sleep.next, 'sleep_loop');
  assert.equal(config.states.sleep_loop.loop, true);
  assert.equal(config.states.sleep_to_stand.next, 'idle_stand');
  assert.match(app, /dodoController(?:\?\.)?\.wake|dodoController\.wake/);
});

test('approved V2 sleep loop asset is present while the legacy path remains unused', () => {
  assert.ok(fs.statSync(path.join(root, 'dist/assets/dodo/v2/assets/idle/dodo_sleep_loop.webp')).size > 1_000_000);
  assert.doesNotMatch(app, /assets\/dodo\/animations\/sleep_loop\.webp/);
});
