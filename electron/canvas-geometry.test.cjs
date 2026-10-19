const test = require('node:test');
const assert = require('node:assert/strict');
const { virtualDesktopBounds, screenToCanvasPoint, canvasToScreenPoint } = require('./canvas-geometry.cjs');

test('virtual desktop includes secondary displays and negative coordinates', () => {
  const displays = [
    { bounds: { x: -1920, y: 0, width: 1920, height: 1080 } },
    { bounds: { x: 0, y: -240, width: 2560, height: 1440 } },
    { bounds: { x: 2560, y: 120, width: 1280, height: 1024 } }
  ];
  assert.deepEqual(virtualDesktopBounds(displays), { x: -1920, y: -240, width: 5760, height: 1440 });
});

test('screen and canvas coordinates round-trip across a negative-origin desktop', () => {
  const bounds = { x: -1920, y: -240, width: 4480, height: 1440 };
  const screenPoint = { x: -400, y: 700 };
  const local = screenToCanvasPoint(screenPoint, bounds);
  assert.deepEqual(local, { x: 1520, y: 940 });
  assert.deepEqual(canvasToScreenPoint(local, bounds), screenPoint);
});

