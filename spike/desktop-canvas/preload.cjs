const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('canvasPreview', Object.freeze({
  load: () => ipcRenderer.invoke('preview:load'),
  save: state => ipcRenderer.invoke('preview:save', state),
  regions: value => ipcRenderer.send('preview:regions', value),
  gesture: active => ipcRenderer.send('preview:gesture', Boolean(active)),
  exit: () => ipcRenderer.send('preview:exit')
}));
