const electron = require('electron');
const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, nativeImage, screen, safeStorage } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { NoteStateStore } = require('./note-state-store.cjs');
const { NoteWindowManager } = require('./note-window-manager.cjs');
const { registerNativeFeatures } = require('./native-features.cjs');
const { registerNoteIpc } = require('./note-ipc.cjs');
const { createControlHitTest } = require('./control-pointer.cjs');
const { registerWindowGesture } = require('./window-gesture.cjs');
const { ResizePreview } = require('./resize-preview.cjs');
const { parseState, createBackup, newestValidBackup, listBackups } = require('./state-backup.cjs');
const { CloudSyncManager } = require('./cloud-sync.cjs');

app.setName('PinDo');
if (process.platform === 'win32') app.setAppUserModelId('com.pindo.notes');

let mainWindow;
let tray;
let quitting = false;
let pendingState;
let saveTimer;
let checkingUpdate = false;
let manualUpdate = false;
let updateReady = false;
let updaterAvailable = false;
let noteStore;
let noteWindowManager;
let nativeFeatures;
let resizePreview;
let cloudSync;

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
const indexUrl = pathToFileURL(indexPath).href;
const statePath = () => path.join(app.getPath('userData'), 'notes.json');
const backupPath = () => path.join(app.getPath('userData'), 'backups');

function flushState() {
  clearTimeout(saveTimer);
  if (pendingState === undefined) return;
  const filename = statePath();
  const tmp = `${filename}.tmp`;
  try {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(tmp, pendingState, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, filename);
    createBackup(backupPath(), pendingState);
    pendingState = undefined;
  } catch (error) {
    console.error('PinDo could not save local state:', error);
    dialog.showErrorBox('无法保存便签', `请检查磁盘空间和文件权限。数据文件：${filename}`);
  }
}

function trustedSender(event) {
  return event.sender === mainWindow?.webContents && event.senderFrame?.url?.split('?')[0] === indexUrl;
}

function readStateFile() {
  try {
    const raw = fs.readFileSync(statePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.notes)) noteStore = new NoteStateStore(parsed);
    return raw;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('PinDo could not load local state:', error);
      const recovered = newestValidBackup(backupPath());
      if (recovered) {
        try {
          const broken = `${statePath()}.corrupt-${Date.now()}`;
          fs.renameSync(statePath(), broken);
          noteStore = new NoteStateStore(parseState(recovered.serialized));
          fs.writeFileSync(statePath(), noteStore.serialize(), { encoding: 'utf8', mode: 0o600 });
          return noteStore.serialize();
        } catch (recoveryError) { console.error('PinDo backup recovery failed:', recoveryError); }
      }
    }
    return null;
  }
}

async function exportData() {
  if (!noteStore) return { accepted: false, error: '当前没有可导出的数据' };
  flushState();
  const name = `PinDo-data-${new Date().toISOString().slice(0, 10)}.json`;
  const result = await dialog.showSaveDialog(mainWindow, { title: '导出 PinDo 数据', defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'PinDo 数据', extensions: ['json'] }] });
  if (result.canceled || !result.filePath) return { accepted: false, cancelled: true };
  try { fs.writeFileSync(result.filePath, noteStore.serialize(), { encoding: 'utf8', mode: 0o600 }); return { accepted: true, filePath: result.filePath }; }
  catch (error) { return { accepted: false, error: `导出失败：${error.message}` }; }
}

async function importData() {
  const result = await dialog.showOpenDialog(mainWindow, { title: '导入 PinDo 数据', properties: ['openFile'], filters: [{ name: 'PinDo 数据', extensions: ['json'] }] });
  if (result.canceled || !result.filePaths[0]) return { accepted: false, cancelled: true };
  try {
    const serialized = fs.readFileSync(result.filePaths[0], 'utf8');
    const imported = new NoteStateStore(parseState(serialized));
    if (noteStore) createBackup(backupPath(), noteStore.serialize(), { force: true });
    noteStore = imported;
    pendingState = noteStore.serialize(); flushState(); broadcastState();
    return { accepted: true, notes: noteStore.state.notes.length };
  } catch { return { accepted: false, error: '导入失败：文件不是有效的 PinDo 数据，现有数据未改变。' }; }
}

function saveCanonicalState(serialized) {
  pendingState = serialized;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushState, 400);
  cloudSync?.schedule();
}

function noteContext(id) {
  const note = noteStore?.state.notes.find(n=>n.id===id);
  const link = noteStore?.state.attachments?.find(l=>l.childId===id);
  return { parentId: link?.parentId || null, locked: Boolean(note?.locked), settings: noteStore?.state.settings };
}
function broadcastState(sourceId) {
  const normalized = nativeFeatures?.normalize();
  if (noteWindowManager && noteStore) noteWindowManager.sync(noteStore.state.notes);
  nativeFeatures?.sync();
  if (noteStore && noteWindowManager) for (const [id,win] of noteWindowManager.windows) {
    if (win.pindoGestureActive || win.pindoGroupMoving || (id === sourceId && !normalized)) continue;
    const snapshot = noteStore.snapshot(id);
    const key = JSON.stringify([snapshot?.version,noteContext(id)]);
    if (snapshot && !win.isDestroyed() && win.pindoSnapshotKey !== key) {
      win.pindoSnapshotKey = key; win.webContents.send('pindo:note-state', {...snapshot,context:noteContext(id)});
    }
  }
  if (mainWindow && !mainWindow.isDestroyed() && noteStore) {
    mainWindow.webContents.send('pindo:state-changed', noteStore.serialize(), noteStore.revision);
  }
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.focus();
}

function displayMessage(message) {
  if (mainWindow && !mainWindow.isDestroyed()) dialog.showMessageBox(mainWindow, message);
  else dialog.showMessageBox(message);
}

async function checkUpdate(manual = false) {
  if (updateReady) {
    const response = await dialog.showMessageBox({
      type: 'info', title: 'PinDo 更新', message: '新版已经下载完成，要现在安装吗？',
      buttons: ['现在安装', '稍后'], defaultId: 0
    });
    if (response.response === 0) { quitting = true; flushState(); autoUpdater.quitAndInstall(); }
    return;
  }
  if (checkingUpdate) {
    if (manual) displayMessage({ type: 'info', message: '正在检查或下载更新，请稍候。' });
    return;
  }
  if (!app.isPackaged) {
    if (manual) displayMessage({ type: 'info', message: '更新检查只在正式安装的 PinDo 中可用。' });
    return;
  }
  if (!updaterAvailable) {
    if (manual) displayMessage({ type: 'info', message: '当前版本未配置更新地址，暂时无法联网检查。' });
    return;
  }
  checkingUpdate = true;
  manualUpdate = manual;
  try { await autoUpdater.checkForUpdates(); }
  catch (error) {
    checkingUpdate = false;
    if (manualUpdate) displayMessage({ type: 'error', message: '检查更新失败，请稍后再试。', detail: String(error.message || error) });
    manualUpdate = false;
    console.error('PinDo update check failed:', error);
  }
}

function createTray() {
  const source = app.isPackaged
    ? path.join(process.resourcesPath, 'pindo-logo.png')
    : path.join(__dirname, '..', 'dist', 'assets', 'pindo-logo.png');
  let icon = nativeImage.createFromPath(source);
  if (!icon.isEmpty()) icon = icon.resize({ width: 32, height: 32, quality: 'best' });
  tray = new Tray(icon);
  tray.setToolTip('PinDo · Dodo');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '更新软件', click: () => { void checkUpdate(true); } },
    { label: '关闭软件', click: () => { quitting = true; flushState(); app.quit(); } }
  ]));
  tray.on('double-click', showWindow);
  tray.on('click', showWindow);
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workArea;
  const controlWidth = 430;
  const controlHeight = 760;
  mainWindow = new BrowserWindow({
    x: Math.max(workArea.x, workArea.x + workArea.width - controlWidth - 28),
    y: Math.max(workArea.y, workArea.y + workArea.height - controlHeight - 28),
    width: controlWidth, height: controlHeight, minWidth: 380, minHeight: 620,
    show: false, frame: false, transparent: true, resizable: false, skipTaskbar: true, alwaysOnTop: true,
    title: 'PinDo · Dodo', backgroundColor: '#00000000', hasShadow: false,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'pindo-logo.png')
      : path.join(__dirname, '..', 'dist', 'assets', 'pindo-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false
    }
  });
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.on('focus', () => { for(const [id,w] of noteWindowManager?.windows||[])if(w.pindoActive)noteWindowManager.setActive(id,false); mainWindow.setAlwaysOnTop(true, 'floating'); mainWindow.moveTop(); });
  mainWindow.on('blur', () => mainWindow.webContents.send('pindo:window-blur'));
  const hitTest = createControlHitTest(mainWindow, screen);
  const onRegions = (event, regions) => { if (trustedSender(event)) hitTest.update(regions); };
  ipcMain.on('pindo:control-regions', onRegions);
  const hitTimer = setInterval(() => { if (mainWindow?.isVisible()) hitTest.refresh(); }, 16);
  hitTimer.unref();
  mainWindow.on('closed', () => { clearInterval(hitTimer); ipcMain.removeListener('pindo:control-regions', onRegions); });
  mainWindow.webContents.on('did-start-loading', () => hitTest.update([]));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== indexUrl) event.preventDefault();
  });
  mainWindow.on('ready-to-show', showWindow);
  mainWindow.on('close', event => {
    if (!quitting) { event.preventDefault(); mainWindow.hide(); }
    else flushState();
  });
  // This renderer is only the Dodo/control surface. Notes are created as
  // independent native windows by NoteWindowManager, so no duplicate
  // full-screen note canvas is shown here.
  mainWindow.loadFile(indexPath, { query: { controlWindow: '1' } });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', showWindow);
  app.whenReady().then(() => {
    readStateFile();
    if(process.platform==='win32' && app.isPackaged){
      const flag=path.join(app.getPath('userData'),'login-default-v1');
      if(!fs.existsSync(flag)){try{app.setLoginItemSettings({openAtLogin:true,path:process.execPath});fs.mkdirSync(path.dirname(flag),{recursive:true});fs.writeFileSync(flag,'enabled');}catch(error){console.error('PinDo login startup:',error);}}
    }
    ipcMain.on('pindo:read-state', event => {
      if (!trustedSender(event)) { event.returnValue = null; return; }
      event.returnValue = noteStore?.serialize() || readStateFile();
    });
    ipcMain.on('pindo:read-revision', event => { event.returnValue = trustedSender(event) ? (noteStore?.revision || 0) : null; });
    ipcMain.on('pindo:write-state', (event, serialized, revision) => {
      if (!trustedSender(event) || typeof serialized !== 'string' || serialized.length > 20_000_000) { event.returnValue = { accepted: false, reason: 'invalid' }; return; }
      let parsed;
      try { parsed = JSON.parse(serialized); } catch { event.returnValue = { accepted: false, reason: 'invalid-json' }; return; }
      if (!noteStore) {
        try { noteStore = new NoteStateStore(parsed); }
        catch { event.returnValue = { accepted: false, reason: 'invalid-state' }; return; }
      } else {
        const result = noteStore.setState(parsed, revision);
        if (!result.accepted) { event.returnValue = result; return; }
      }
      saveCanonicalState(noteStore.serialize());
      // Creating or reopening native note windows may load a renderer. Defer
      // that work until after the synchronous state acknowledgement so the
      // clicked control responds immediately.
      setImmediate(broadcastState);
      event.returnValue = { accepted: true, revision: noteStore.revision };
    });
    ipcMain.handle('pindo:data-action', async (event, action) => {
      if (!trustedSender(event)) return { accepted: false, error: 'unauthorized' };
      if (action === 'export') return exportData();
      if (action === 'import') return importData();
      if (action === 'backup-now') {
        if (!noteStore) return { accepted: false, error: '当前没有可备份的数据' };
        flushState(); createBackup(backupPath(), noteStore.serialize(), { force: true });
        return { accepted: true, count: listBackups(backupPath()).length };
      }
      return { accepted: false, error: 'unsupported-action' };
    });
    cloudSync = new CloudSyncManager({
      app, safeStorage,
      getState: () => noteStore?.state || { notes: [] },
      applyState: state => {
        if (noteStore) createBackup(backupPath(), noteStore.serialize(), { force: true });
        noteStore = new NoteStateStore(state);
        pendingState = noteStore.serialize(); flushState(); broadcastState();
      },
      onStatus: status => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('pindo:cloud-status', status); }
    });
    if (cloudSync.status().loggedIn) {
      const initialCloudSync = setTimeout(() => {
        void cloudSync.registerDevice().then(() => cloudSync.sync('startup')).catch(error => {
          console.error('PinDo startup sync failed:', error);
          cloudSync.onStatus(cloudSync.status({ error: error.message }));
        });
      }, 5000);
      initialCloudSync.unref();
    }
    const periodicCloudSync = setInterval(() => {
      if (cloudSync.status().loggedIn) void cloudSync.sync('periodic').catch(error => console.error('PinDo periodic sync failed:', error));
    }, 5 * 60 * 1000);
    periodicCloudSync.unref();
    ipcMain.handle('pindo:cloud-action', async (event, action, value) => {
      if (!trustedSender(event)) return { accepted: false, error: 'unauthorized' };
      try {
        if (action === 'status') return { accepted: true, ...cloudSync.status() };
        if (action === 'login' || action === 'signup') return { accepted: true, ...(await cloudSync.auth(action, value || {})) };
        if (action === 'reset') { await cloudSync.auth('reset', value || {}); return { accepted: true }; }
        if (action === 'sync') return { accepted: true, ...(await cloudSync.sync('manual')) };
        if (action === 'logout') return { accepted: true, ...cloudSync.logout() };
        return { accepted: false, error: 'unsupported-action' };
      } catch (error) { return { accepted: false, error: String(error.message || error) }; }
    });
    createWindow();
    noteWindowManager = new NoteWindowManager({ BrowserWindow, screen, indexPath, preloadPath: path.join(__dirname, 'preload.cjs'), onDesktopHostError: (id, reason) => console.error(`PinDo note ${id} desktop host failed:`, reason) });
    const noteIdentity = registerNoteIpc({ ipcMain, manager: noteWindowManager, getStore: () => noteStore, indexPath, persist: saveCanonicalState, onUpdated: broadcastState, context: noteContext });
    nativeFeatures = registerNativeFeatures({electron,mainWindow,manager:noteWindowManager,noteIdentity,getStore:()=>noteStore,persist:saveCanonicalState,broadcast:broadcastState,indexPath,preloadPath:path.join(__dirname,'preload.cjs')});
    resizePreview = new ResizePreview({ BrowserWindow });
    resizePreview.warm();
    registerWindowGesture({ ipcMain, screen, hooks: nativeFeatures.gestureHooks, resizePreview, resolveWindow: event => trustedSender(event) ? mainWindow : noteWindowManager.windows.get(noteIdentity(event)) });
    if (noteStore) broadcastState();
    createTray();
    screen.on('display-metrics-changed', () => broadcastState());
    screen.on('display-removed', () => broadcastState());

    updaterAvailable = fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'));
    // PinDo is currently distributed as beta builds. Explicitly allow a newer
    // prerelease from GitHub Releases; change this to false for the first stable release.
    autoUpdater.allowPrerelease = true;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-not-available', () => {
      checkingUpdate = false;
      if (manualUpdate) displayMessage({ type: 'info', message: '当前已是最新版本。' });
      manualUpdate = false;
    });
    autoUpdater.on('update-downloaded', async () => {
      checkingUpdate = false;
      updateReady = true;
      const { response } = await dialog.showMessageBox({
        type: 'info', title: 'PinDo 更新', message: '新版 PinDo 已下载，可以现在安装。',
        detail: '选择“稍后”后，下次关闭 PinDo 时会自动安装。',
        buttons: ['现在安装', '稍后'], defaultId: 0
      });
      if (response === 0) { quitting = true; flushState(); autoUpdater.quitAndInstall(); }
    });
    autoUpdater.on('error', error => {
      checkingUpdate = false;
      if (manualUpdate) displayMessage({ type: 'error', message: '更新失败，请稍后重试。', detail: String(error.message || error) });
      manualUpdate = false;
      console.error('PinDo update failed:', error);
    });
    if (updaterAvailable) {
      setTimeout(() => { void checkUpdate(); }, 8000);
      setInterval(() => { void checkUpdate(); }, 6 * 60 * 60 * 1000);
    }
  });
  app.on('before-quit', () => {
    quitting = true;
    // Destroy child note windows before Electron tears down Chromium. This
    // avoids leaving orphaned Explorer-hosted HWNDs during an update or quit.
    nativeFeatures?.close();
    resizePreview?.close();
    noteWindowManager?.closeAll();
    flushState();
  });
  app.on('window-all-closed', () => { /* Keep running in the Windows tray. */ });
  app.on('activate', showWindow);
}
