const test = require('node:test');
const assert = require('node:assert/strict');
const { createCanvasHitTest } = require('./hit-test.cjs');

test('desktop icons receive empty-area clicks while notes retain editing and drag input', () => {
  const calls = [];
  const cursor = { x: 120, y: 130 };
  const window = { isDestroyed: () => false, getBounds: () => ({ x: 100, y: 100 }), setIgnoreMouseEvents: (...args) => calls.push(args) };
  const hit = createCanvasHitTest(window, { getCursorScreenPoint: () => cursor });
  hit.update([{ x: 200, y: 200, width: 240, height: 180 }]);
  assert.deepEqual(calls.at(-1), [true, { forward: true }]);
  cursor.x = 315; cursor.y = 325; hit.refresh();
  assert.deepEqual(calls.at(-1), [false, { forward: true }]);
  hit.setDragging(true); cursor.x = 120; cursor.y = 130; hit.refresh();
  assert.equal(hit.ignored, false, 'dragging past a note edge keeps pointer input');
  hit.setDragging(false);
  assert.equal(hit.ignored, true, 'empty area returns input to desktop immediately');
});

test('invalid region reports cannot turn the full desktop into a click target', () => {
  const window = { isDestroyed: () => false, getBounds: () => ({ x: 0, y: 0 }), setIgnoreMouseEvents() {} };
  const hit = createCanvasHitTest(window, { getCursorScreenPoint: () => ({ x: 20, y: 20 }) });
  assert.equal(hit.update([{ x: 0, y: 0, width: 0, height: 100 }]), false);
  assert.equal(hit.update(Array(65).fill({ x: 0, y: 0, width: 20, height: 20 })), false);
  assert.equal(hit.ignored, undefined);
  hit.update([]);
  assert.equal(hit.ignored, true);
});
