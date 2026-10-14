const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { attachToWindowsDesktop } = require('./windows-desktop-host.cjs');
const { partitionNotes } = require('./canvas-note-routing.cjs');

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

function nativeMessageValue(value) {
  if (!Buffer.isBuffer(value)) return Number.isFinite(Number(value)) ? Number(value) : null;
  if (value.length >= 8) return Number(value.readBigUInt64LE(0));
  if (value.length >= 4) return value.readUInt32LE(0);
  return null;
}

/** Owns only native windows, never the note contents or local data file. */
class NoteWindowManager {
  constructor({ BrowserWindow, screen, indexPath, preloadPath, compatibilityMode = false, canvasMode = false, onClosed = () => {}, onDesktopHostError = () => {}, onDiagnostic = () => {}, desktopHost = attachToWindowsDesktop }) {
    this.BrowserWindow = BrowserWindow; this.screen = screen;
    this.indexPath = indexPath; this.preloadPath = preloadPath; this.onClosed = onClosed;
    this.onDesktopHostError = onDesktopHostError; this.onDiagnostic = onDiagnostic;
    this.desktopHost = desktopHost; this.compatibilityMode = compatibilityMode;
    this.canvasMode = canvasMode;
    this.windows = new Map();
    // modes is the authoritative latest data mode, including bookmark. A
    // BrowserWindow's pindoBaseMode records which native layer it was built for.
    this.modes = new Map();
    this.stateVersions = new Map();
  }

  anonymousId(id) { return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 12); }

  _snapshot(id, win) {
    return {
      mode: this.modes.get(id) || null,
      visible: Boolean(win?.pindoVisible), parked: Boolean(win?.pindoParked),
      active: Boolean(win?.pindoActive), promoted: Boolean(win?.pindoPromoted),
      topMost: Boolean(win?.pindoTop), hostBusy: Boolean(win?.pindoLayerBusy)
    };
  }

  _record(id, win, event, reason, before, extra = {}) {
    this.onDiagnostic(event, {
      noteId: this.anonymousId(id), windowId: Number(win?.id) || null,
      reason: String(reason || 'unspecified').slice(0, 80),
      stateVersion: this.stateVersions.get(id) || 0,
      before: before || null, after: this._snapshot(id, win), ...extra
    });
  }

  diagnostic(id, event, detail = {}) {
    const allowed = new Set(['editor-mounted', 'editor-unmounted', 'composition-start', 'composition-end', 'renderer-reload']);
    if (!allowed.has(event)) return;
    const safe = {};
    for (const key of ['editorType', 'reason']) if (typeof detail[key] === 'string') safe[key] = detail[key].slice(0, 80);
    this._record(id, this.windows.get(id), event, safe.reason || 'renderer', null, safe);
  }

  _setMode(id, win, mode, reason) {
    const previous = this.modes.get(id);
    if (previous === mode) return this.stateVersions.get(id) || 0;
    const before = this._snapshot(id, win);
    const version = (this.stateVersions.get(id) || 0) + 1;
    this.stateVersions.set(id, version); this.modes.set(id, mode);
    this._record(id, win, 'note-mode-changed', reason, before, { previousMode: previous || null, nextMode: mode });
    return version;
  }

  _setTop(id, win, top, reason) {
    top = Boolean(top);
    if (win.pindoTop === top) return;
    const before = this._snapshot(id, win);
    win.setAlwaysOnTop(top, 'floating'); win.pindoTop = top;
    this._record(id, win, 'topmost-changed', reason, before);
  }

  _hide(id, win, reason, force = false) {
    if (!force && !win.pindoVisible && !win.isVisible?.()) return;
    const before = this._snapshot(id, win);
    win.hide(); win.pindoVisible = false;
    this._record(id, win, 'window-hide', reason, before);
  }

  _show(id, win, reason) {
    if (win.pindoVisible || win.isVisible?.()) { win.pindoVisible = true; return; }
    const before = this._snapshot(id, win);
    win.showInactive(); win.pindoVisible = true;
    this._record(id, win, 'window-show', reason, before);
  }

  _applyVisibility(id, reason) {
    const win = this.windows.get(id);
    if (!win || win.isDestroyed()) return;
    const mode = this.modes.get(id);
    if (mode === 'bookmark') {
      const before = this._snapshot(id, win);
      const wasParked = Boolean(win.pindoParked);
      win.pindoParked = true; win.pindoParkedAt ||= Date.now(); win.pindoActive = false;
      win.pindoLayerDesired = false; win.pindoHostInvalidated = win.pindoBaseMode === 'desktop';
      this._hide(id, win, reason, !wasParked); this._setTop(id, win, false, reason);
      if (!wasParked) this._record(id, win, 'note-parked', reason, before);
      return;
    }
    if (mode === 'top') this._setTop(id, win, true, reason);
    if (!win.pindoReady) return;
    if (mode === 'desktop') {
      // Desktop notes stay inside Explorer while they are edited. Promoting a
      // transparent Chromium child to a Top-Level window on every focus, then
      // parenting it back on blur, visibly tears the surface on LTSC 17763.
      // `top` mode is the explicit authority for a Top-Level note.
      const desired = false;
      if (!win.pindoHostFailed && (win.pindoLayerBusy || win.pindoHostInvalidated || win.pindoPromoted !== desired)) {
        this._requestLayer(id, desired, `${reason}:visibility`);
        return;
      }
    }
    if (win.pindoParked) {
      const before = this._snapshot(id, win);
      win.pindoParked = false; win.pindoParkedAt = 0;
      this._record(id, win, 'note-unparked', reason, before);
    }
    this._setTop(id, win, mode === 'top', reason);
    this._show(id, win, reason);
  }

  _requestLayer(id, promote, reason, force = false) {
    const win = this.windows.get(id);
    if (!win || win.isDestroyed() || win.pindoBaseMode !== 'desktop') return Promise.resolve();
    win.pindoLayerDesired = Boolean(promote);
    if (force) win.pindoHostInvalidated = true;
    if (win.pindoLayerPromise) return win.pindoLayerPromise;
    if (this.modes.get(id) !== 'desktop' || (!win.pindoHostInvalidated && win.pindoPromoted === win.pindoLayerDesired)) return Promise.resolve();
    win.pindoLayerPromise = (async () => {
      win.pindoLayerBusy = true;
      try {
        while (!win.isDestroyed() && this.windows.get(id) === win) {
          if (this.modes.get(id) !== 'desktop') break;
          const target = Boolean(win.pindoLayerDesired);
          if (!win.pindoHostInvalidated && win.pindoPromoted === target) break;
          const before = this._snapshot(id, win);
          const operationVersion = this.stateVersions.get(id) || 0;
          win.pindoHostInvalidated = false;
          this._record(id, win, target ? 'host-promote-start' : 'host-attach-start', reason, before);
          const result = await this.desktopHost(win, { promote: target });
          if (win.isDestroyed() || this.windows.get(id) !== win) break;
          if (!result.attached) {
            win.pindoHostFailed = true;
            this.onDesktopHostError(id, result.reason);
            this._record(id, win, 'host-attach-failed', reason, before, { target: target ? 'top' : 'desktop' });
            break;
          }
          win.pindoHostFailed = false;
          win.pindoPromoted = target;
          win.pindoWindowProfile = { ...(win.pindoWindowProfile || {}), host: target ? 'top-level' : 'explorer-desktop' };
          this._record(id, win, target ? 'host-promoted' : 'host-attached', reason, before, { operationVersion });
          if (this.modes.get(id) !== 'desktop' || (this.stateVersions.get(id) || 0) !== operationVersion) continue;
          this._setTop(id, win, target, reason);
          if (target) win.moveTop?.();
        }
      } finally {
        win.pindoLayerBusy = false; win.pindoLayerPromise = null;
        this._applyVisibility(id, `${reason}:settled`);
      }
    })();
    return win.pindoLayerPromise;
  }

  _create(view) {
    const id = view.id;
    const win = new this.BrowserWindow({
      ...view.bounds, minWidth: 280, minHeight: 210,
      frame: false, transparent: true, show: false, skipTaskbar: true,
      resizable: false, backgroundColor: '#00000000', hasShadow: false,
      webPreferences: { preload: this.preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false }
    });
    win.pindoBaseMode = view.mode; win.pindoPromoted = view.mode === 'top';
    win.pindoLayerDesired = win.pindoPromoted; win.pindoHostInvalidated = view.mode === 'desktop';
    win.pindoReady = false; win.pindoVisible = false; win.pindoNoteType = view.type;
    win.pindoWindowProfile = { role: 'native-note', transparent: true, backgroundColor: '#00000000', host: view.mode === 'top' ? 'top-level' : 'pending' };
    win.pindoRequestedBoundsKey = JSON.stringify(view.bounds);
    this.windows.set(id, win);
    this._record(id, win, 'window-created', 'sync:create', null);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => {
      const expected = pathToFileURL(this.indexPath).href;
      if (new URL(url).origin !== 'null' || url.split('?')[0] !== expected) event.preventDefault();
    });
    win.webContents.on('did-start-loading', () => {
      if (win.pindoReady) this._record(id, win, 'renderer-reload', 'did-start-loading', this._snapshot(id, win));
    });
    win.webContents.on('render-process-gone', (_event, detail) => {
      win.pindoReady = false;
      this._record(id, win, 'renderer-crash', detail?.reason || 'render-process-gone', this._snapshot(id, win));
    });
    win.on('focus', () => {
      const before = this._snapshot(id, win); this._record(id, win, 'window-focus', 'native-event', before);
      if (!win.pindoLayerBusy) this.activate(id, 'window-focus');
    });
    win.on('blur', () => {
      const before = this._snapshot(id, win); win.webContents.send?.('pindo:window-blur');
      this._record(id, win, 'window-blur', 'native-event', before);
      if (!win.pindoLayerBusy) this.setActive(id, false, 'window-blur');
    });
    win.on('minimize', () => {
      if (this.modes.get(id) !== 'desktop') return;
      const before = this._snapshot(id, win);
      win.pindoActive = false; win.pindoLayerDesired = false; win.pindoHostInvalidated = true; win.pindoHostFailed = false;
      this._record(id, win, 'window-minimized', 'show-desktop-or-system', before);
      void this._requestLayer(id, false, 'window-minimized', true);
    });
    if (typeof win.hookWindowMessage === 'function') {
      const messages = new Map([
        [0x0018, 'wm-showwindow'],
        [0x0005, 'wm-size'],
        [0x001a, 'wm-settingchange'],
        [0x007e, 'wm-displaychange'],
        [0x007d, 'wm-stylechanged'],
        [0x031e, 'wm-dwmcompositionchanged']
      ]);
      for (const [message, reason] of messages) win.hookWindowMessage(message, wParam => {
        this._record(id, win, 'native-window-message', reason, this._snapshot(id, win), {
          message: `0x${message.toString(16).padStart(4, '0')}`,
          wParam: nativeMessageValue(wParam)
        });
      });
    }
    win.on('restore', () => this._record(id, win, 'window-restored', 'native-event', this._snapshot(id, win)));
    win.on('closed', () => {
      if (!win.pindoDestroyRecorded) this._record(id, win, 'window-destroyed', 'native-event', this._snapshot(id, win));
      if (this.windows.get(id) === win) this.windows.delete(id);
      this.onClosed(id);
    });
    win.loadFile(this.indexPath, { query: { noteWindow: id, compatibility: this.compatibilityMode ? '1' : '0' } });
    win.webContents.once('did-finish-load', () => {
      if (win.isDestroyed() || this.windows.get(id) !== win) return;
      win.pindoReady = true;
      this._record(id, win, 'renderer-loaded', 'did-finish-load', null);
      if (this.modes.get(id) === 'desktop') void this._requestLayer(id, false, 'renderer-ready', true);
      else this._applyVisibility(id, 'renderer-ready');
    });
    return win;
  }

  sync(notes) {
    const target = new Map();
    const known = new Map();
    const routed = this.canvasMode ? partitionNotes(notes) : null;
    const candidates = routed ? [...routed.native, ...routed.parked] : notes;
    for (const note of Array.isArray(candidates) ? candidates : []) {
      const view = nativeNoteView(note, this.screen.getAllDisplays());
      if (!view) continue;
      known.set(view.id, view);
      if (view.mode !== 'bookmark') target.set(view.id, view);
    }
    for (const [id] of this.windows) if (!known.has(id)) this.close(id, 'sync:removed');
    for (const view of known.values()) {
      const win = this.windows.get(view.id);
      this._setMode(view.id, win, view.mode, 'sync');
      if (view.mode === 'bookmark' && win && !win.isDestroyed()) this._applyVisibility(view.id, 'sync:bookmark');
    }
    const parked = [...this.windows.entries()].filter(([, win]) => win.pindoParked && !win.isDestroyed()).sort((a, b) => b[1].pindoParkedAt - a[1].pindoParkedAt);
    for (const [id] of parked.slice(8)) this.close(id, 'park-cache-limit');
    for (const view of target.values()) {
      let win = this.windows.get(view.id);
      if (win && win.pindoBaseMode !== view.mode) { this.close(view.id, 'sync:layer-change'); win = null; }
      if (!win || win.isDestroyed()) {
        this._setMode(view.id, null, view.mode, 'sync:create');
        win = this._create(view);
      }
      else if (!win.pindoGestureActive && !win.pindoGroupMoving) {
        const requested = JSON.stringify(view.bounds);
        if (win.pindoRequestedBoundsKey!==requested) {
          const before = this._snapshot(view.id, win);
          win.pindoRequestedBoundsKey = requested;
          if (JSON.stringify(win.getBounds()) !== requested) {
            const oldBounds = win.getBounds(); win.setBounds(view.bounds);
            this._record(view.id, win, 'bounds-changed', 'sync', before, { oldBounds, newBounds: view.bounds });
          }
        }
      }
      this._applyVisibility(view.id, 'sync:target');
    }
  }

  activate(id, reason = 'command') {
    const selected = this.windows.get(id);
    if (!selected || selected.isDestroyed() || this.modes.get(id) === 'bookmark') return;
    if(selected.pindoNoteType==='organizer'){
      this.setActive(id, false, reason);
      if(!selected.isFocused?.()) { selected.focus?.(); selected.webContents.focus?.(); }
      return;
    }
    if (selected.pindoActive && (this.modes.get(id) !== 'desktop' || (!selected.pindoHostInvalidated && !selected.pindoPromoted))) return;
    for (const [other, win] of this.windows) if (other !== id && win.pindoActive) this.setActive(other, false, 'activate-other');
    this.setActive(id, true, reason);
  }

  setActive(id, active, reason = 'set-active') {
    const win = this.windows.get(id);
    if (!win || win.isDestroyed() || this.modes.get(id) === 'bookmark') return;
    if (win.pindoNoteType === 'organizer') active = false;
    active = Boolean(active);
    if (win.pindoActive === active) {
      if (this.modes.get(id) === 'desktop' && (win.pindoHostInvalidated || win.pindoPromoted)) void this._requestLayer(id, false, `${reason}:reconcile`);
      return;
    }
    const before = this._snapshot(id, win);
    win.pindoActive = active;
    win.pindoHostFailed = false;
    this._record(id, win, 'active-changed', reason, before);
    if (this.modes.get(id) !== 'desktop') { this._setTop(id, win, true, reason); return; }
    win.pindoLayerDesired = false;
    this._setTop(id, win, false, reason);
    if (win.pindoHostInvalidated || win.pindoPromoted) void this._requestLayer(id, false, reason);
  }

  setBounds(id, bounds) {
    const win = this.windows.get(id);
    if (!win || win.isDestroyed() || !bounds || !Object.values(bounds).every(Number.isFinite)) return { accepted: false, reason: 'missing' };
    const next = nativeNoteView({ id, type: 'quick', mode: this.modes.get(id) || 'desktop', x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height }, this.screen.getAllDisplays())?.bounds;
    if (!next) return { accepted: false, reason: 'invalid' };
    const requested = JSON.stringify(next);
    if (win.pindoRequestedBoundsKey !== requested || JSON.stringify(win.getBounds()) !== requested) {
      const before = this._snapshot(id, win), oldBounds = win.getBounds();
      win.setBounds(next); win.pindoRequestedBoundsKey = requested;
      this._record(id, win, 'bounds-changed', 'renderer-request', before, { oldBounds, newBounds: next });
    }
    return { accepted: true, bounds: next };
  }

  close(id, reason = 'close') {
    const win = this.windows.get(id);
    if (win && !win.isDestroyed()) { this._record(id, win, 'window-destroyed', reason, this._snapshot(id, win)); win.pindoDestroyRecorded = true; }
    this.windows.delete(id); this.modes.delete(id); this.stateVersions.delete(id);
    if (win && !win.isDestroyed()) win.destroy();
  }
  closeAll() { for (const id of [...this.windows.keys()]) this.close(id, 'close-all'); }
}

module.exports = { NoteWindowManager, nativeNoteView };
