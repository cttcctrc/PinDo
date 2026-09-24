const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, screen, Tray } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { attachToWindowsDesktop } = require('../../electron/windows-desktop-host.cjs');
const { createCanvasHitTest } = require('./hit-test.cjs');
const { loadState, saveState, starter } = require('./state.cjs');

app.setName('PinDo Canvas Preview');
if (process.platform === 'win32') app.setAppUserModelId('com.pindo.canvas-preview');
const previewDirectory = path.join(app.getPath('appData'), 'PinDo Canvas Preview');
fs.mkdirSync(previewDirectory, { recursive: true });
app.setPath('userData', previewDirectory);

let canvas, tray, hitTest, timer, quitting = false;
const page = path.join(__dirname, 'canvas.html');
const authorized = event => event.sender === canvas?.webContents && event.senderFrame?.url?.split('?')[0] === pathToFileURL(page).href;

function stop() {
  if (quitting) return;
  quitting = true;
  clearInterval(timer);
  if (canvas && !canvas.isDestroyed()) canvas.destroy();
  app.quit();
}

function createTray() {
  const iconPath = path.join(__dirname, '..', '..', 'dist', 'assets', 'pindo-logo.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (!icon.isEmpty()) icon = icon.resize({ width: 32, height: 32 });
  tray = new Tray(icon);
  tray.setToolTip('PinDo 画布技术验证版');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 / 隐藏便签画布', click: () => { if (canvas?.isVisible()) { canvas.hide(); hitTest.clear(); } else { canvas?.showInactive(); canvas?.webContents.send('preview:refresh-regions'); } } },
    { label: '重置样例便签', click: () => { saveState(previewDirectory, starter()); canvas?.webContents.send('preview:reset', starter()); } },
    { type: 'separator' },
    { label: '退出技术验证版', click: stop }
  ]));
  tray.on('double-click', () => { canvas?.showInactive(); canvas?.webContents.send('preview:refresh-regions'); });
}

async function createCanvas() {
  const bounds = screen.getPrimaryDisplay().bounds;
  canvas = new BrowserWindow({
    ...bounds, frame: false, transparent: true, backgroundColor: '#00000000',
    hasShadow: false, resizable: false, show: false, skipTaskbar: true,
    title: 'PinDo 画布技术验证版',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  hitTest = createCanvasHitTest(canvas, screen);
  hitTest.update([]);
  timer = setInterval(() => { if (canvas?.isVisible()) hitTest.refresh(); }, 16);
  timer.unref();
  canvas.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  canvas.webContents.on('will-navigate', (event, url) => { if (url.split('?')[0] !== pathToFileURL(page).href) event.preventDefault(); });
  canvas.webContents.on('did-start-loading', () => hitTest.clear());
  canvas.on('close', event => { if (!quitting) { event.preventDefault(); canvas.hide(); hitTest.clear(); } });
  canvas.on('closed', () => { clearInterval(timer); canvas = null; });
  canvas.webContents.once('did-finish-load', async () => {
    const result = await attachToWindowsDesktop(canvas);
    if (canvas?.isDestroyed()) return;
    if (!result.attached) {
      const error = `无法把验证画布挂载到 Windows 桌面：${result.reason}`;
      if (process.env.PINDO_CANVAS_SMOKE === '1') { console.error(error); process.exitCode = 1; stop(); }
      else dialog.showErrorBox('PinDo 画布验证失败', `${error}\n正式版未受影响。`);
      return;
    }
    if (canvas?.isDestroyed()) return;
    canvas.showInactive();
    canvas.webContents.send('preview:refresh-regions');
    if (process.env.PINDO_CANVAS_SMOKE === '1') {
      setTimeout(async () => {
        try {
          const result = await canvas.webContents.executeJavaScript('window.canvasSmokeCheck()');
          const output = process.env.PINDO_CANVAS_SMOKE_OUTPUT || path.join(previewDirectory, 'smoke');
          fs.mkdirSync(output, { recursive: true });
          fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ ...result, attached: true, transparent: true }, null, 2));
          const image = await canvas.capturePage();
          fs.writeFileSync(path.join(output, 'canvas.png'), image.toPNG());
          console.log(JSON.stringify(result));
          process.exitCode = result.passed ? 0 : 1;
        } catch (error) { console.error(error); process.exitCode = 1; }
        stop();
      }, 1700);
    }
  });
  await canvas.loadFile(page);
}

if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(() => {
  ipcMain.handle('preview:load', event => authorized(event) ? loadState(previewDirectory) : null);
  ipcMain.handle('preview:save', (event, state) => {
    if (!authorized(event)) return false;
    try { saveState(previewDirectory, state); return true; } catch { return false; }
  });
  ipcMain.on('preview:regions', (event, regions) => { if (authorized(event)) hitTest?.update(regions); });
  ipcMain.on('preview:gesture', (event, active) => { if (authorized(event)) hitTest?.setDragging(active); });
  ipcMain.on('preview:exit', event => { if (authorized(event)) stop(); });
  createTray();
  void createCanvas().catch(error => { console.error(error); dialog.showErrorBox('PinDo 画布验证失败', String(error)); stop(); });
  screen.on('display-metrics-changed', () => { if (canvas && !canvas.isDestroyed()) { canvas.setBounds(screen.getPrimaryDisplay().bounds); canvas.webContents.send('preview:refresh-regions'); } });
});
app.on('before-quit', () => { quitting = true; clearInterval(timer); if (canvas && !canvas.isDestroyed()) canvas.destroy(); });
