const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('settings exposes backup, export and import through a scoped desktop bridge', () => {
  const html = read('dist/index.html'), app = read('dist/app.js'), preload = read('electron/preload.cjs');
  assert.match(html, /id="backupNowButton"/); assert.match(html, /id="exportDataButton"/); assert.match(html, /id="importDataButton"/);
  assert.match(app, /runDataAction\("backup-now"/); assert.match(app, /runDataAction\("export"/); assert.match(app, /runDataAction\("import"/);
  assert.match(preload, /dataAction: \(action, value\) => ipcRenderer\.invoke\('pindo:data-action', action, value\)/);
});

test('main process backs up current data before import and can recover a corrupt state', () => {
  const main = read('electron/main.cjs');
  assert.match(main, /newestValidBackup\(backupPath\(\)\)/);
  assert.match(main, /createBackup\(backupPath\(\), noteStore\.serialize\(\), \{ force: true \}\)/);
  assert.match(main, /ipcMain\.handle\('pindo:data-action'/);
});
