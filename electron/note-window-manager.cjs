const { pathToFileURL } = require('node:url');
const { attachToWindowsDesktop } = require('./windows-desktop-host.cjs');

const VALID_MODES = new Set(['desktop', 'top', 'bookmark']);
const VALID_TYPES = new Set(['quick', 'todo', 'timeline', 'organizer']);

function nativeNoteView(note, displays) {
  if (!note || typeof note.id !== 'string' || !note.id || !VALID_MODES.has(note.mode) || !VALID_TYPES.has(note.type)) return null;
  if (!Array.isArray(displays) || !displays.length) return null;
  const bounds = { x: note.x, y: note.y, width: note.w, height: note.h };
  if (!Object.values(bounds).every(Number.isFinite) || bounds.width < 1 || bounds.height < 1) return null;
  const area = displays.map(display => {
    const r = display.workArea || display.bounds;
    const left = Math.max(bounds.x, r.x), top = Math.max(bounds.y, r.y);
    const dx = Math.max(r.x - (bounds.x + bounds.width), 0, bounds.x - (r.x + r.width));
    const dy = Math.max(r.y - (bounds.y + bounds.height), 0, bounds.y - (r.y + r.height));
    return { display, distance: dx * dx + dy * dy, overlap: Math.max(0, Math.min(bounds.x + bounds.width, r.x + r.width) - left) * Math.max(0, Math.min(bounds.y + bounds.height, r.y + r.height) - top) };
  }).sort((a, b) => b.overlap - a.overlap || a.distance - b.distance)[0].display;
  const work = area.workArea || area.bounds;
  const width = Math.min(Math.max(Math.round(bounds.width), 280), work.width);
  const height = Math.min(Math.max(Math.round(bounds.height), 210), work.height);
  return {
    id: note.id, mode: note.mode, type: note.type,
    bounds: {
      x: Math.max(work.x, Math.min(Math.round(bounds.x), work.x + work.width - width)),
      y: Math.max(work.y, Math.min(Math.round(bounds.y), work.y + work.height - height)),
      width, height
    }
  };
}

/** Owns only native windows, never the note contents or local data file. */
class NoteWindowManager {
  constructor({ BrowserWindow, screen, indexPath, preloadPath, onClosed = () => {}, onDesktopHostError = () => {}, desktopHost = attachToWindowsDesktop }) {
    this.BrowserWindow = BrowserWindow; this.screen = screen;
    this.indexPath = indexPath; this.preloadPath = preloadPath; this.onClosed = onClosed;
    this.onDesktopHostError = onDesktopHostError; this.desktopHost = desktopHost;
    this.windows = new Map();
    this.modes = new Map();
  }

  sync(notes) {
    const target = new Map();
    const known = new Map();
    for (const note of Array.isArray(notes) ? notes : []) {
      const view = nativeNoteView(note, this.screen.getAllDisplays());
      if (!view) continue;
      known.set(view.id, view);
      if (view.mode !== 'bookmark') target.set(view.id, view);
    }
    // A collapsed note is parked instead of destroyed. Reusing its renderer
    // makes side-tab expansion immediate and avoids decoding fonts/assets for
    // every collapse/expand cycle.
    for (const [id, win] of this.windows) {
      if (!known.has(id)) { this.close(id); continue; }
      if (known.get(id).mode === 'bookmark' && !win.isDestroyed()) {
        win.pindoParked = true;
        win.pindoParkedAt ||= Date.now();
        win.hide();
      }
    }
    const parked = [...this.windows.entries()].filter(([, win]) => win.pindoParked && !win.isDestroyed()).sort((a, b) => b[1].pindoParkedAt - a[1].pindoParkedAt);
    for (const [id] of parked.slice(8)) this.close(id);
    for (const view of target.values()) {
      // A child of Explorer cannot become a true top-level TopMost window by
      // changing z-order alone; crossing layers requires a fresh OS window.
      if (this.modes.has(view.id) && this.modes.get(view.id) !== view.mode) this.close(view.id);
      let win = this.windows.get(view.id);
      if (!win || win.isDestroyed()) {
        win = new this.BrowserWindow({
          ...view.bounds, minWidth: 280, minHeight: 210,
          frame: false, transparent: true, show: false, skipTaskbar: true,
          backgroundColor: '#00000000', hasShadow: false,
          webPreferences: { preload: this.preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false }
        });
        const id = view.id;
        win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        win.webContents.on('will-navigate', (event, url) => {
          const expected = pathToFileURL(this.indexPath).href;
          if (new URL(url).origin !== 'null' || url.split('?')[0] !== expected) event.preventDefault();
        });
        win.on('focus', () => this.activate(id));
        win.on('blur', () => { win.webContents.send('pindo:window-blur'); this.setActive(id,false); });
        win.on('closed', () => { if (this.windows.get(id) === win) this.windows.delete(id); this.onClosed(id); });
        win.pindoPromoted=false; win.pindoNoteType=view.type;
        this.windows.set(id, win);
        this.modes.set(id, view.mode);
        win.loadFile(this.indexPath, { query: { noteWindow: id } });
        win.webContents.once('did-finish-load', async () => {
          if (win.isDestroyed() || this.windows.get(id) !== win) return;
          if (view.mode === 'desktop') {
            win.pindoLayerBusy=true;
            const result = await this.desktopHost(win);
            win.pindoLayerBusy=false;win.pindoPromoted=false;
            if(win.pindoActive)this.setActive(id,true);
            if (!result.attached) this.onDesktopHostError(id, result.reason);
          }
          // Even if Explorer is unavailable, keep the user's note accessible.
          if (!win.isDestroyed()) win.showInactive();
        });
      } else if (!win.pindoGestureActive && !win.pindoGroupMoving && JSON.stringify(win.getBounds()) !== JSON.stringify(view.bounds)) win.setBounds(view.bounds);
      if (win.pindoParked) { win.pindoParked = false; win.pindoParkedAt = 0; win.showInactive(); }
      const top=view.mode==='top'||Boolean(win.pindoActive);
      if(win.pindoTop!==top){win.setAlwaysOnTop(top,'floating');win.pindoTop=top;}
    }
  }

  activate(id) {
    const selected=this.windows.get(id);
    if(selected?.pindoNoteType==='organizer'){this.setActive(id,false);return;}
    for(const [other,win] of this.windows)if(other!==id && win.pindoActive)this.setActive(other,false);
    this.setActive(id,true);
    const win=this.windows.get(id);if(win&&!win.isDestroyed())win.moveTop();
  }
  setActive(id,active) {
    const win=this.windows.get(id);if(!win||win.isDestroyed())return;
    if(win.pindoNoteType==='organizer')active=false;
    win.pindoActive=active;
    if(this.modes.get(id)!=='desktop'){win.setAlwaysOnTop(true,'floating');return;}
    if(win.pindoLayerBusy)return;
    // Serialize reparenting so a slow blur cannot undo a newer focus request.
    win.pindoLayerBusy=true;
    const reconcile=async()=>{
      try{
        while(!win.isDestroyed() && win.pindoPromoted!==Boolean(win.pindoActive)){
          const target=Boolean(win.pindoActive);
          const result=await this.desktopHost(win,{promote:target});
          if(win.isDestroyed())break;
          if(!result.attached){this.onDesktopHostError(id,result.reason);break;}
          win.pindoPromoted=target;
          win.setAlwaysOnTop(target,'floating');win.pindoTop=target;if(target)win.moveTop();
        }
      }finally{win.pindoLayerBusy=false;}
    };void reconcile();
  }

  setBounds(id, bounds) {
    const win = this.windows.get(id);
    if (!win || win.isDestroyed() || !bounds || !Object.values(bounds).every(Number.isFinite)) return { accepted: false, reason: 'missing' };
    const next = nativeNoteView({ id, type: 'quick', mode: this.modes.get(id) || 'desktop', x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height }, this.screen.getAllDisplays())?.bounds;
    if (!next) return { accepted: false, reason: 'invalid' };
    win.setBounds(next);
    return { accepted: true, bounds: next };
  }

  close(id) { const win = this.windows.get(id); this.windows.delete(id); this.modes.delete(id); if (win && !win.isDestroyed()) win.destroy(); }
  closeAll() { for (const id of [...this.windows.keys()]) this.close(id); }
}

module.exports = { NoteWindowManager, nativeNoteView };
