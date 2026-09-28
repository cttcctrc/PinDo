const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('all editable note bodies use the same saved font-size token', () => {
  const app = read('dist/app.js');
  const styles = read('dist/styles.css');

  assert.match(app, /--note-content-font-size:\$\{note\.fontSize\}px/);
  assert.match(styles, /\.quick-editor \{ font-size: var\(--note-content-font-size, 18px\)/);
  assert.match(styles, /\.todo-text, \.timeline-text\[role="textbox"\].*font-size: var\(--note-content-font-size, 17px\)/);
  assert.doesNotMatch(styles, /\.todo-text, \.timeline-text\[role="textbox"\].*font-size: 20px/);
});

test('authored text sizes are independent from system UI scale', () => {
  const styles = read('dist/styles.css');

  assert.match(styles, /\.quick-editor,\.todo-text,\.timeline-text\[role="textbox"\],\.note-title\{zoom:1\}/);
  assert.doesNotMatch(styles, /\.quick-editor,\.todo-text,\.timeline-text\[role="textbox"\],\.note-title\{zoom:var\(--ui-zoom\)\}/);
});

test('saved note sizes are numeric and constrained to the toolbar range', () => {
  const app = read('dist/app.js');

  assert.match(app, /note\.fontSize = clamp\(Number\(note\.fontSize\).*10, 56\)/);
  assert.match(app, /applySelectedStyle\(\{ fontSize: `\$\{event\.target\.value\}px` \}\)/);
});
