const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'dist', 'app.js'), 'utf8');

test('V2 state changes clear overlays before starting one primary animation', () => {
  const controller = fs.readFileSync(path.join(__dirname, '..', 'dist', 'dodo-v2-controller.cjs'), 'utf8');
  assert.match(controller, /this\.timers\.clearAll\(\); this\.stopOverlay\(\)/);
  assert.match(controller, /await this\.player\.play\(state, spec/);
});

test('V2 negative emotion is explicit and returns through approved forward assets', () => {
  const controller = fs.readFileSync(path.join(__dirname, '..', 'dist', 'dodo-v2-controller.cjs'), 'utf8');
  assert.match(controller, /disappointed\(payload = \{\}\)/);
  assert.match(controller, /melt_to_stand/);
  assert.match(controller, /emotion\.complete/);
});
