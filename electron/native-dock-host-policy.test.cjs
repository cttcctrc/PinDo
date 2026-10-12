const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveNativeDockHost } = require('./native-dock-host-policy.cjs');

test('CF-07 falls back only for LTSC 2019 without ANGLE and DirectComposition', () => {
  const result = resolveNativeDockHost({
    platform: 'win32',
    osRelease: '10.0.17763',
    gpuInfo: { auxAttributes: { glImplementationParts: '(gl=none,angle=none)', directComposition: false } }
  });
  assert.deepEqual(result, { host: 'top', reason: 'win10-17763-no-transparent-compositor' });
});

test('CF-07 keeps Explorer hosting on normal Windows and incomplete evidence', () => {
  assert.equal(resolveNativeDockHost({
    platform: 'win32', osRelease: '10.0.22631',
    gpuInfo: { auxAttributes: { glImplementationParts: '(gl=egl-angle,angle=d3d11)', directComposition: true } }
  }).host, 'desktop');
  assert.equal(resolveNativeDockHost({
    platform: 'win32', osRelease: '10.0.17763',
    gpuInfo: { auxAttributes: { glImplementationParts: '(gl=egl-angle,angle=d3d11)', directComposition: false } }
  }).host, 'desktop');
  assert.equal(resolveNativeDockHost({ platform: 'linux', osRelease: '10.0.17763', gpuInfo: {} }).host, 'desktop');
});
