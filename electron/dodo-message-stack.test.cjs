const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('collapsed Dodo reminders show one action card, two previews and a remainder', () => {
  const app = read('dist/app.js');
  assert.match(app, /visible\.slice\(0, 3\)/);
  assert.match(app, /index > 0.*is-preview/);
  assert.match(app, /还有 \$\{remaining\} 条消息/);
  assert.match(app, /data-promote-reminder/);
});

test('the message center is bounded and toggled by the reminder count', () => {
  const app = read('dist/app.js');
  const styles = read('dist/styles.css');
  assert.match(app, /data-toggle-message-center/);
  assert.match(app, /dodoMessageCenterExpanded = !dodoMessageCenterExpanded/);
  assert.match(styles, /message-center-expanded \.dodo-message-stack[\s\S]*max-height:[^;]+; overflow-y: auto/);
});

test('active reminders are merged by source item before rendering', () => {
  const app = read('dist/app.js');
  assert.match(app, /function coalesceActiveReminders/);
  assert.match(app, /const identity = `\$\{item\.type\}:\$\{item\.noteId\}:\$\{item\.itemId\}`/);
  assert.match(app, /activeItems = coalesceActiveReminders/);
});
