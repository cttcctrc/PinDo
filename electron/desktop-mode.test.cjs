const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldUseDesktopCanvas } = require('./desktop-mode.cjs');
test('rc.57 compatibility routing avoids a full-screen transparent canvas', () => {
  assert.equal(shouldUseDesktopCanvas({platform:'win32',compatibilityEnabled:true}),false);
  assert.equal(shouldUseDesktopCanvas({platform:'win32',compatibilityEnabled:false}),true);
  assert.equal(shouldUseDesktopCanvas({platform:'linux'}),false);
});
