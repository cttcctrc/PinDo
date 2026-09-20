const assert = require('node:assert/strict');
const test = require('node:test');
const { missingDesktopIntegrationFromSources } = require('./check-desktop-ready.cjs');

test('blocks release when the application still uses one full-screen window', () => {
  const missing = missingDesktopIntegrationFromSources('createWindow();', 'render();');
  assert.ok(missing.includes('主程序接入独立便签窗口'));
  assert.ok(missing.includes('主程序控制窗口与便签窗口分离'));
  assert.ok(missing.includes('便签窗口只渲染自己的内容'));
});

test('does not block a renderer and main process with separate note paths', () => {
  assert.deepEqual(missingDesktopIntegrationFromSources("new NoteWindowManager(); noteWindowManager.sync([]); mainWindow.loadFile(indexPath, { query: { controlWindow: '1' } });", 'noteWindowId; writeNote({});'), []);
});
