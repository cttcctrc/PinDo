const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = require('../package.json');

test('baseline installer contains a local generic updater feed and validates its artifacts', () => {
  assert.deepEqual(pkg.build.publish, [{ provider: 'generic', url: 'http://127.0.0.1:8787/', channel: 'latest' }]);
  assert.match(pkg.scripts['build:windows'], /check-update-artifacts\.cjs release 1\.1\.0-beta\.6\.8/);
  assert.match(read('electron/main.cjs'), /app-update\.yml/);
});

test('update test build changes only packaged metadata and uses a separate directory', () => {
  const config = require('../electron-builder.update-test.cjs');
  assert.equal(config.extraMetadata.version, '1.1.0-beta.6.9');
  assert.equal(config.directories.output, 'release-update');
  assert.equal(pkg.version, '1.1.0-beta.6.8');
});

test('local updater is loopback-only, uncached and supports ranged downloads', () => {
  const server = read('scripts/local-update-server.cjs');
  assert.match(server, /server\.listen\(port, '127\.0\.0\.1'/);
  assert.match(server, /'Cache-Control': 'no-store'/);
  assert.match(server, /'Accept-Ranges': 'bytes'/);
  assert.match(server, /response\.writeHead\(206/);
});
