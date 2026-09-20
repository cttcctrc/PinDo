const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'dist', 'app.js'), 'utf8');

test('mood transition releases its priority lock before starting the stable loop', () => {
  assert.match(app, /if\(!step\)\{[\s\S]*priority:-1[\s\S]*settleDodoMood\(desired,token\)/);
});

test('depressed exits through both reverse transitions and settles on idle breathing', () => {
  assert.match(app, /dodoStableMood==="depressed"\)steps\.push\(\{name:"depressed_enter",reverse:true\},\{name:"sad_enter",reverse:true\}\)/);
  assert.match(app, /else \{playDodoAnimation\("idle_breathe",\{priority:0\}\)/);
});
