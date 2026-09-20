const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerWindowGesture } = require('./window-gesture.cjs');
test('native movement uses immutable screen origin, and cancel stops stale updates', () => {
  let handler, cursor = { x: 400, y: 300 }, bounds = { x: 200, y: 100, width: 320, height: 240 };
  const preview = { shown: [], updated: [], hidden: 0, show(b) { this.shown.push({...b}); }, update(b) { this.updated.push({...b}); }, hide() { this.hidden++; } };
  const sender = {}, win = { isDestroyed: () => false, getBounds: () => ({ ...bounds }), setBounds: b => { bounds = b; } };
  registerWindowGesture({ ipcMain: { on: (_, fn) => { handler = fn; } }, screen: { getCursorScreenPoint: () => cursor }, resizePreview: preview, resolveWindow: e => e.sender === sender ? win : null });
  const call = (action, kind) => { const event = { sender }; handler(event, action, kind); return event.returnValue; };
  call('begin', 'move');
  cursor = { x: 450, y: 330 }; call('update');
  assert.equal(bounds.x, 250);
  call('update'); assert.equal(bounds.x, 250); // No feedback accumulation.
  cursor = { x: 470, y: 340 }; call('end');
  assert.equal(bounds.x, 270); assert.equal(bounds.y, 140);
  assert.equal(call('update'), null);
  call('begin', 'resize'); cursor = { x: -500, y: -500 }; call('update');
  assert.equal(bounds.width, 320); assert.equal(bounds.height, 240); // Preview only while dragging.
  assert.equal(preview.updated.at(-1).width, 280); assert.equal(preview.updated.at(-1).height, 210);
  call('cancel'); assert.equal(call('update'), null);
  assert.equal(bounds.width, 320); assert.equal(preview.hidden, 1);
  const forged = { sender: {} }; handler(forged, 'begin', 'move'); assert.equal(forged.returnValue, null);
});

test('resize commits native bounds and group updates only once on release', () => {
  let handler, cursor = { x: 100, y: 100 }, bounds = { x: 20, y: 30, width: 300, height: 220 }, updates = 0;
  const sender = {}, preview = { show() {}, update() {}, hide() {} };
  const win = { isDestroyed: () => false, getBounds: () => ({...bounds}), setBounds: next => { bounds = next; } };
  registerWindowGesture({ ipcMain: { on: (_, fn) => { handler = fn; } }, screen: { getCursorScreenPoint: () => cursor }, resizePreview: preview, hooks: { update: () => updates++ }, resolveWindow: e => e.sender === sender ? win : null });
  const call = action => { const event = { sender }; handler(event, action, 'resize'); return event.returnValue; };
  call('begin'); cursor = { x: 180, y: 150 }; call('update'); cursor = { x: 220, y: 190 }; call('update');
  assert.deepEqual(bounds, { x: 20, y: 30, width: 300, height: 220 }); assert.equal(updates, 0);
  call('end');
  assert.deepEqual(bounds, { x: 20, y: 30, width: 420, height: 310 }); assert.equal(updates, 1);
});
