const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readDesktopMode, writeDesktopMode, shouldUseDesktopCanvas } = require('./desktop-mode.cjs');

test('canvas default can be rolled back and the saved choice wins after updates', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-desktop-mode-'));
  const app = { getPath: () => directory };
  assert.equal(readDesktopMode(app, true).enabled, true);
  writeDesktopMode(app, false);
  assert.equal(readDesktopMode(app, true).enabled, false);
  fs.rmSync(directory, { recursive: true, force: true });
});

test('compatibility mode always falls back to clickable native note windows', () => {
  assert.equal(shouldUseDesktopCanvas({ enabled: true, compatibilityEnabled: false, platform: 'win32' }), true);
  assert.equal(shouldUseDesktopCanvas({ enabled: true, compatibilityEnabled: true, platform: 'win32' }), false);
  assert.equal(shouldUseDesktopCanvas({ enabled: false, compatibilityEnabled: false, platform: 'win32' }), false);
});
