const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('production update feed targets the public PinDo GitHub repository', () => {
  const config = require('../electron-builder.production.cjs');

  assert.deepEqual(config.publish, [{
    provider: 'github',
    owner: 'cttcctrc',
    repo: 'PinDo',
    releaseType: 'release'
  }]);

  assert.equal(config.extraMetadata.version, '1.1.0-beta.6.10');
  assert.equal(config.directories.output, 'release-public');
});

test('beta clients explicitly accept newer prerelease updates', () => {
  assert.match(
    read('electron/main.cjs'),
    /autoUpdater\.allowPrerelease = true/
  );
});
