const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('pindoDesktop', Object.freeze({
  setControlRegions: regions => ipcRenderer.send('pindo:control-regions', regions),
  readState: () => ipcRenderer.sendSync('pindo:read-state'),
  readRevision: () => ipcRenderer.sendSync('pindo:read-revision'),
  writeState: (serialized, revision) => ipcRenderer.sendSync('pindo:write-state', serialized, revision),
  dataAction: action => ipcRenderer.invoke('pindo:data-action', action),
  cloudAction: (action, value) => ipcRenderer.invoke('pindo:cloud-action', action, value),
  onCloudStatus: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('pindo:cloud-status', listener);
    return () => ipcRenderer.removeListener('pindo:cloud-status', listener);
  },
  onStateChanged: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, serialized, revision) => callback(serialized, revision);
    ipcRenderer.on('pindo:state-changed', listener);
    return () => ipcRenderer.removeListener('pindo:state-changed', listener);
  }
}));

// This API is intentionally scoped to the native window verified by note-ipc.
// Do not add general filesystem access or a full-app write method here.
contextBridge.exposeInMainWorld('pindoNote', Object.freeze({
  readNote: () => ipcRenderer.sendSync('pindo:note-snapshot'),
  writeNote: (version, note) => ipcRenderer.sendSync('pindo:note-update', version, note),
  setBounds: bounds => ipcRenderer.sendSync('pindo:note-set-bounds', bounds)
}));

contextBridge.exposeInMainWorld("pindoWindow", Object.freeze({
  // Pointer-move updates must never block the renderer on a synchronous IPC
  // round trip. Begin/end still return exact native bounds.
  gesture: (action, kind) => {
    if (action === 'update') { ipcRenderer.send("pindo:window-gesture", action, kind); return null; }
    return ipcRenderer.sendSync("pindo:window-gesture", action, kind);
  }
}));

contextBridge.exposeInMainWorld('pindoNative', Object.freeze({
  command: (action, value) => ipcRenderer.invoke('pindo:native-command', action, value),
  pathForFile: file => webUtils.getPathForFile(file),
  describeFile: file => ipcRenderer.invoke('pindo:native-command', 'describe-file', webUtils.getPathForFile(file)),
  captureSelection: value => ipcRenderer.send('pindo:capture-selection', value),
  on: (name, callback) => {
    if (!['note-state','snap','dock-state','dodo-docked','capture-image','window-blur','dock-settings','pointer-outside','highlight-item'].includes(name) || typeof callback !== 'function') return () => {};
    const listener = (_event,value) => callback(value); ipcRenderer.on('pindo:'+name,listener);
    return () => ipcRenderer.removeListener('pindo:'+name,listener);
  }
}));
