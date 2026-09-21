const { pathToFileURL } = require('node:url');

/** Narrow IPC bridge for one note per native window; do not expose full-state writes. */
function registerNoteIpc({ ipcMain, manager, store, getStore = () => store, indexPath, persist, onUpdated = () => {}, context = () => ({}) }) {
  const baseUrl = pathToFileURL(indexPath).href;
  const identity = event => {
    if (!event?.sender || event.senderFrame !== event.sender.mainFrame) return null;
    const url = event.senderFrame.url;
    if (typeof url !== 'string' || url.split('?')[0] !== baseUrl) return null;
    for (const [id, win] of manager.windows) {
      if (!win.isDestroyed() && win.webContents === event.sender && new URL(url).searchParams.get('noteWindow') === id) return id;
    }
    return null;
  };

  const readSnapshot = event => {
    const id = identity(event);
    const currentStore = getStore();
    if (!id || !currentStore) return null;
    const snapshot = currentStore.snapshot(id);
    return snapshot ? { id, ...snapshot, context: context(id) } : null;
  };
  const updateSnapshot = (event, version, proposed) => {
    const id = identity(event);
    const currentStore = getStore();
    if (!id || !currentStore) return { accepted: false, reason: 'unauthorized' };
    let size;
    try { size = JSON.stringify(proposed).length; }
    catch { return { accepted: false, reason: 'invalid' }; }
    if (size > 2_000_000) return { accepted: false, reason: 'too-large' };
    const result = currentStore.update(id, version, proposed);
    if (result.accepted) {
      if (proposed?.mode === 'bookmark') {
        const win = manager.windows.get(id);
        if (win && !win.isDestroyed()) { win.pindoParked = true; win.pindoParkedAt = Date.now(); win.hide(); }
      }
      persist(currentStore.serialize());
      setImmediate(() => onUpdated(id, result.current));
    }
    return result;
  };
  ipcMain.on('pindo:note-snapshot', (event) => { event.returnValue = readSnapshot(event); });
  ipcMain.on('pindo:note-update', (event, version, proposed) => { event.returnValue = updateSnapshot(event, version, proposed); });
  ipcMain.on('pindo:note-set-bounds', (event, bounds) => {
    const id = identity(event);
    event.returnValue = id ? manager.setBounds(id, bounds) : { accepted: false, reason: 'unauthorized' };
  });
  return identity;
}

module.exports = { registerNoteIpc };
