const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('todo drop commits the visible dashed placeholder position', () => {
  const app = read('dist/app.js');
  assert.match(app, /function todoDropSlot\(/);
  assert.match(app, /placeholderPreviousTodoId/);
  assert.match(app, /placeholderNextTodoId/);
  assert.match(app, /const placement = todoDropSlot\(/);
});

test('dock hover preview cannot create scrollbars and uses the dark translucent surface', () => {
  const css = read('dist/native-dock.css');
  assert.match(css, /#preview[^}]*overflow:hidden/);
  assert.match(css, /#preview[^}]*background:rgba\(20,22,27,/);
  assert.match(css, /#preview[^}]*color:#fff/);
});

test('Dodo reminder counter owns an explicit high-contrast red style', () => {
  const css = read('dist/styles.css');
  assert.match(css, /\.dodo-nudge \.dodo-message-count[^}]*background:\s*#e5483f\s*!important/);
  assert.match(css, /\.dodo-nudge \.dodo-message-count[^}]*color:\s*#fff\s*!important/);
});
