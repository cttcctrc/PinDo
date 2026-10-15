const assert = require('node:assert/strict');
const test = require('node:test');
const { analyzeBitmap, captureWindowSurface } = require('./surface-capture-diagnostics.cjs');

test('surface diagnostics report only aggregate pixels and a short digest', () => {
  const sample = analyzeBitmap(Buffer.from([
    0, 0, 0, 0,
    0, 0, 0, 255,
    30, 20, 10, 255,
    255, 255, 255, 255
  ]), { width: 2, height: 2 });
  assert.deepEqual({ ...sample, pixelDigest: undefined }, {
    width: 2, height: 2, pixelCount: 4, empty: false,
    transparentRatio: 0.25, opaqueRatio: 0.75, nearBlackRatio: 0.25,
    pixelDigest: undefined
  });
  assert.match(sample.pixelDigest, /^[a-f0-9]{16}$/);
  assert.equal(Object.values(sample).some(value => typeof value === 'string' && value.includes('note')), false);
});

test('window capture never retains encoded image bytes', async () => {
  const result = await captureWindowSurface({ webContents: { capturePage: async () => ({
    toBitmap: () => Buffer.from([1, 2, 3, 255]), getSize: () => ({ width: 1, height: 1 })
  }) } });
  assert.equal(result.pixelCount, 1);
  assert.equal('bitmap' in result, false);
  assert.equal('image' in result, false);
});
