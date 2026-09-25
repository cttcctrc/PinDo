const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readDesktopMode, writeDesktopMode } = require('./desktop-mode.cjs');

test('canvas default can be rolled back and the saved choice wins after updates', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-desktop-mode-'));
  const app = { getPath: () => directory };
  assert.equal(readDesktopMode(app, true).enabled, true);
  writeDesktopMode(app, false);
  assert.equal(readDesktopMode(app, true).enabled, false);
  fs.rmSync(directory, { recursive: true, force: true });
});
