const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldUseDesktopCanvas } = require('./desktop-mode.cjs');

test('Windows always uses the single desktop canvas authority', () => {
  assert.equal(shouldUseDesktopCanvas({ enabled: true, compatibilityEnabled: false, platform: 'win32' }), true);
  assert.equal(shouldUseDesktopCanvas({ enabled: true, compatibilityEnabled: true, platform: 'win32' }), true);
  assert.equal(shouldUseDesktopCanvas({ enabled: false, compatibilityEnabled: true, platform: 'win32' }), true);
  assert.equal(shouldUseDesktopCanvas({ enabled: false, compatibilityEnabled: false, platform: 'win32' }), true);
  assert.equal(shouldUseDesktopCanvas({ enabled: true, compatibilityEnabled: true, platform: 'linux' }), false);
});
