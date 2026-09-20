const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');

test('sleep holds the final transition frame and wakes by reversing the same sheet', () => {
  assert.match(app, /sleep_hold:\s*\{ file: "sleep_enter\.webp"[^}]*staticFrame: 17/);
  assert.match(app, /mood==="sleep"\)playDodoAnimation\("sleep_hold"/);
  assert.match(app, /dodoStableMood==="sleep"\)steps\.push\(\{name:"sleep_enter",reverse:true\}\)/);
  assert.doesNotMatch(app, /sleep_loop/);
});

test('obsolete sleep loop asset is absent', () => {
  assert.equal(fs.existsSync(path.join(root, 'dist/assets/dodo/animations/sleep_loop.webp')), false);
});
