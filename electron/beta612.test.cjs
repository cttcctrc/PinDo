const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { findSnap } = require('./native-groups.cjs');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('rich text controls use reversible editor commands', () => {
  const app = read('dist/app.js');
  assert.match(app, /toggleSelectedFormat\("bold"\)/);
  assert.match(app, /toggleSelectedFormat\("italic"\)/);
  assert.match(app, /toggleSelectedFormat\("underline"\)/);
  assert.match(app, /toggleSelectedFormat\("strikeThrough"\)/);
});

test('desktop organizer has an explicit edit mode, removal controls and reveal action', () => {
  const app = read('dist/app.js');
  const native = read('electron/native-features.cjs');
  assert.match(app, /data-action="organizer-edit"/);
  assert.match(app, /class="organizer-remove"/);
  assert.match(app, /data-reveal-organizer-item/);
  assert.match(native, /shell\.showItemInFolder\(item\.path\)/);
  assert.doesNotMatch(app, /reorderReady|holdTimer/);
});

test('desktop organizer participates in vertical snapping', () => {
  const state = { notes: [
    { id: 'top', type: 'organizer', mode: 'desktop', x: 10, y: 10, w: 360, h: 260 },
    { id: 'bottom', type: 'quick', mode: 'desktop', x: 12, y: 500, w: 360, h: 260 }
  ], attachments: [] };
  assert.equal(findSnap(state, 'bottom', { x: 12, y: 270, width: 360, height: 260 }, ['bottom']).parentId, 'top');
});

test('native note no longer reserves a transparent black strip above the card', () => {
  const css = read('dist/styles.css');
  assert.match(css, /body\.note-window-mode \.note \{ top: 0 !important; height: 100% !important; overflow: hidden; \}/);
  assert.doesNotMatch(css, /height: calc\(100% - 32px\)/);
});

test('Dodo menus are mutually exclusive and Today supports temporary expansion', () => {
  const app = read('dist/app.js');
  assert.match(app, /settingsModal\.hidden = true;[\s\S]*const opening = assistantPanel\.hidden/);
  assert.match(app, /data-toggle-today/);
  assert.match(app, /todayExpanded = false/);
});

test('organizer refreshes its body without rebuilding the entire native note', () => {
  const app = read('dist/app.js');
  assert.match(app, /function refreshOrganizer\(note\)/);
  assert.match(app, /renderOrganizer\(el\.querySelector\("\.note-body"\), note\)/);
  assert.match(app, /note\.organizerItemSize = next; refreshOrganizer\(note\)/);
});
