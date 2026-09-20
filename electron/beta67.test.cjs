const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'dist/styles.css'), 'utf8');

test('timeline dock preview uses inclusive calendar-day range instead of elapsed hours', () => {
  assert.match(app, /delta >= -days && delta <= days/);
  assert.match(app, /filter\(item => isWithinCalendarDays\(item\.time, 7\)\)/);
  assert.match(app, /前后7天要进行/);
});

test('unfinished timeline nodes dated today join the Dodo and Today item aggregate', () => {
  assert.match(app, /note\.type === "timeline"/);
  assert.match(app, /!item\.done && item\.text\?\.trim\(\) && datePart\(item\.time\) === today/);
  assert.match(app, /type: "timeline", note, item/);
  assert.match(app, /count:todayItems\(\)\.length/);
});

test('Today navigation targets todo or timeline rows and flashes either three times', () => {
  assert.match(app, /data-jump-type="\$\{type\}"/);
  assert.match(app, /detail\?\.type === "timeline" \? `\[data-event-id=/);
  assert.match(css, /\.todo-row\.pindo-attention,\.timeline-row\.pindo-attention/);
  assert.match(css, /animation:pindoAttention \.42s ease 3/);
});

test('timeline due scanner remains wired for automatic reminders', () => {
  assert.match(app, /key = `timeline:\$\{note\.id\}:\$\{item\.id\}:\$\{toDateTimeLocal\(item\.time\)\}`/);
  assert.match(app, /setInterval\(checkDueReminders, 30000\)/);
});
