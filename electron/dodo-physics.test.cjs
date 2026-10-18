const test = require('node:test');
const assert = require('node:assert/strict');
const { createDodoPhysicsHandler } = require('./dodo-physics.cjs');

test('Dodo fall metrics and movement use the monitor containing the pet', () => {
  const displays = [
    { workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
    { workArea: { x: 1920, y: -120, width: 2560, height: 1320 } }
  ];
  const win = {
    bounds: { x: 2300, y: 100, width: 430, height: 760 },
    isDestroyed: () => false,
    getBounds() { return { ...this.bounds }; },
    setPosition(x, y) { this.bounds.x = x; this.bounds.y = y; }
  };
  const screen = { getDisplayMatching: bounds => bounds.x >= 1920 ? displays[1] : displays[0] };
  const handler = createDodoPhysicsHandler({ trustedSender: () => true, getWindow: () => win, screen });
  const metricsEvent = {}; handler(metricsEvent, 'metrics');
  assert.deepEqual(metricsEvent.returnValue.workArea, displays[1].workArea);
  handler({}, 'move', { y: 900 }); assert.equal(win.bounds.y, 900);
  handler({}, 'move', { y: 5000 }); assert.equal(win.bounds.y, 1200);
});

test('Dodo physics rejects untrusted renderer access', () => {
  const event = {};
  createDodoPhysicsHandler({ trustedSender: () => false, getWindow: () => null, screen: {} })(event, 'metrics');
  assert.equal(event.returnValue, null);
});
