const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('beta 7 account UI uses a scoped main-process cloud bridge', () => {
  const html = read('dist/index.html'); const preload = read('electron/preload.cjs'); const main = read('electron/main.cjs');
  assert.match(html, /id="cloudEmail"/); assert.match(html, /id="cloudSyncButton"/);
  assert.match(preload, /cloudAction: \(action, value\) => ipcRenderer\.invoke\('pindo:cloud-action'/);
  assert.match(main, /new CloudSyncManager/); assert.match(main, /safeStorage/);
  assert.match(main, /cloudSync\.sync\('startup'\)/);
  assert.match(main, /cloudSync\.sync\('periodic'\)/);
  assert.match(html, /id="exportDiagnosticsButton"/);
  assert.match(html, /id="resetWindowsButton"/);
  assert.match(main, /prepareCompatibility\(app\)/);
  assert.doesNotMatch(read('electron/diagnostics.cjs'), /app\.disableHardwareAcceleration\(\)/);
  assert.match(read('dist/styles.css'), /body\.compatibility-mode \.note/);
});

test('beta 7 release workflow and production metadata agree', () => {
  const workflow = read('.github/workflows/windows-release.yml');
  const config = require('../electron-builder.production.cjs');
  assert.equal(config.extraMetadata.version, '1.1.0-beta.7.3');
  assert.match(workflow, /v1\.1\.0-beta\.7\.3/);
  assert.match(workflow, /PINDO_RELEASE_VERSION: 1\.1\.0-beta\.7\.3/);
});

test('Supabase direct sync is protected by RLS and reserves admin controls', () => {
  const cloud = read('electron/cloud-sync.cjs'); const sql = read('supabase/pindo-cloud.sql');
  assert.match(cloud, /\/rest\/v1\/rpc\/pindo_push_sync/);
  assert.match(cloud, /\/auth\/v1\/token\?grant_type=password/);
  assert.doesNotMatch(cloud, /pindo-cloud-sync\.cttcctrc/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /pindo_admin_list_users/);
  assert.match(sql, /pindo_admin_set_user_status/);
  assert.match(sql, /account_status text not null default 'active'/);
});
