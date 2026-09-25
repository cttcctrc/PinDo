const test = require('node:test');
const assert = require('node:assert/strict');
const normal = require('../package.json').build;
const candidate = require('../electron-builder.canvas-candidate.cjs');

test('canvas installer cannot share the normal app identity or update feed', () => {
  assert.notEqual(candidate.appId, normal.appId);
  assert.notEqual(candidate.productName, normal.productName);
  assert.equal(candidate.extraMetadata.canvasCandidate, true);
  assert.equal(candidate.publish, null);
  assert.equal(candidate.directories.output, 'release-canvas-candidate');
});
