const { attachToWindowsDesktop } = require('./windows-desktop-host.cjs');
const { createCanvasHitTest } = require('./canvas-hit-test.cjs');
const { virtualDesktopBounds } = require('./canvas-geometry.cjs');

/** Owns the single, desktop-hosted surface. Never owns or serializes note data. */
class DesktopCanvasManager {
  constructor({ BrowserWindow, screen, indexPath, preloadPath, onReady = () => {}, onError = () => {}, desktopHost = attachToWindowsDesktop, diagnostic = null, onDiagnostic = () => {}, compatibilityMode = false }) {
    Object.assign(this, { BrowserWindow, screen, indexPath, preloadPath, onReady, onError, desktopHost, diagnostic, onDiagnostic, compatibilityMode });
    this.window = null;
    this.hitTest = null;
    this.timer = null;
    this.active = false;
    this.editing = false;
    this.fallbackReason = null;
    this.regionUpdateCount = 0;
    this.regionRejectedCount = 0;
    this.regionLastUpdatedAt = null;
    this.regionLastNonEmptyAt = null;
    this.rendererReadyAt = null;
    this.regionLastComputedAt = null;
    this.regionLastSentAt = null;
    this.regionLastReceivedAt = null;
    this.lastRegionError = null;
    this.recovering = null;
    this.recoveryQueued = null;
    this.recoveryRequestCount = 0;
    this.recoveryRunCount = 0;
    this.recoveryReattachCount = 0;
    this.recoveryLastDurationMs = null;
    this.lifecycleReady = false;
    this.closing = false;
  }

  async open() {
    if (this.window && !this.window.isDestroyed()) return;
    const canvasBounds = virtualDesktopBounds(this.screen.getAllDisplays());
    const window = new this.BrowserWindow({
      ...canvasBounds,
      frame: false, transparent: true, backgroundColor: '#00000000',
      resizable: false, hasShadow: false, skipTaskbar: true, focusable: false, show: false,
      webPreferences: { preload: this.preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false }
    });
    window.pindoWindowProfile = { role: 'desktop-canvas', transparent: true, backgroundColor: '#00000000', host: 'desktop-pending' };
    this.window = window;
    this.hitTest = createCanvasHitTest(window, this.screen);
    this.hitTest.update([]);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => {
      if (url.split('?')[0] !== require('node:url').pathToFileURL(this.indexPath).href) event.preventDefault();
    });
    window.webContents.on('did-start-loading', () => this.hitTest?.clear());
    window.webContents.on('did-finish-load', () => { this.rendererReadyAt = Date.now(); this.onDiagnostic('canvas-renderer-ready', { windowId: window.id, at: this.rendererReadyAt }); });
    window.webContents.on('render-process-gone', (_event, detail) => this.fail(new Error(`Canvas renderer ${detail?.reason || 'failed'} (${detail?.exitCode ?? 'unknown'})`)));
    window.on('blur', () => this.endEdit('window-blur'));
    window.on('hide', () => this.resetInteraction('window-hidden'));
    window.on('closed', () => {
      clearInterval(this.timer);
      if (this.window !== window) return;
      const unexpected = this.active && !this.closing;
      this.window = null; this.active = false; this.hitTest = null;
      if (unexpected) { this.fallbackReason = 'Canvas window closed after Explorer lifecycle change'; this.onError(new Error(this.fallbackReason)); }
    });
    try {
      await window.loadFile(this.indexPath, { query: { canvasWindow: '1', canvasOriginX: String(canvasBounds.x), canvasOriginY: String(canvasBounds.y), compatibility: this.compatibilityMode ? '1' : '0' } });
      const result = await this.desktopHost(window);
      if (window.isDestroyed()) return;
      if (!result.attached) throw new Error(result.reason || 'Explorer did not accept the canvas');
      window.pindoWindowProfile.host = 'explorer-desktop';
      window.pindoWindowProfile.hostReason = null;
      this.active = true;
      this.installLifecycleHooks(window);
      if (this.diagnostic?.canvasVisible === false) window.hide?.(); else window.showInactive();
      this.lifecycleReady = true;
      this.timer = setInterval(() => { if (this.active && window.isVisible() && !this.editing) this.hitTest?.refresh(); }, 32);
      this.timer.unref?.();
      window.webContents.send('pindo:canvas-refresh-regions');
      this.onReady();
    } catch (error) {
      this.fail(error);
    }
  }

  installLifecycleHooks(window) {
    if (typeof window?.hookWindowMessage !== 'function') return;
    const messages = new Map([
      [0x0018, 'show-desktop'],
      [0x001a, 'desktop-settings'],
      [0x007e, 'display-change'],
      [0x031e, 'dwm-composition-change']
    ]);
    for (const [message, reason] of messages) window.hookWindowMessage(message, wParam => {
      if (!this.lifecycleReady || !this.active || this.closing) return;
      if (message === 0x0018 && Buffer.isBuffer(wParam) && wParam.length >= 4 && wParam.readUInt32LE(0) === 0) {
        this.resetInteraction('desktop-hidden'); return;
      }
      void this.queueDesktopRecovery(reason);
    });
    window.on?.('restore', () => { if (this.lifecycleReady) void this.queueDesktopRecovery('window-restore'); });
  }

  queueDesktopRecovery(reason = 'desktop-lifecycle') {
    this.recoveryRequestCount += 1;
    if (this.recoveryQueued) return this.recoveryQueued;
    this.recoveryQueued = Promise.resolve().then(() => this.recoverDesktopHost(reason)).finally(() => { this.recoveryQueued = null; });
    return this.recoveryQueued;
  }

  async recoverDesktopHost(reason = 'desktop-lifecycle') {
    if (!this.active || !this.window || this.window.isDestroyed() || this.closing) return false;
    if (this.recovering) return this.recovering;
    const window = this.window;
    this.recovering = (async () => {
      const startedAt = Date.now();
      this.recoveryRunCount += 1;
      this.resetInteraction(reason);
      const result = await this.desktopHost(window);
      if (this.window !== window || window.isDestroyed()) return false;
      if (!result?.attached) { this.fail(new Error(result?.reason || `Explorer host recovery failed: ${reason}`)); return false; }
      window.pindoWindowProfile.host = 'explorer-desktop';
      window.pindoWindowProfile.hostReason = reason;
      window.pindoWindowProfile.parentValid = result.parentValid ?? null;
      if (result.reattached) this.recoveryReattachCount += 1;
      this.recoveryLastDurationMs = Date.now() - startedAt;
      window.webContents.invalidate?.();
      window.webContents.send('pindo:canvas-refresh-regions');
      this.onDiagnostic('canvas-host-recovered', { windowId: window.id, reason, parentValid: result.parentValid ?? null, reattached: Boolean(result.reattached), durationMs: this.recoveryLastDurationMs, at: Date.now() });
      return true;
    })().finally(() => { this.recovering = null; });
    return this.recovering;
  }

  regions(rectangles, metadata = {}) {
    if (!this.active || !this.hitTest) return false;
    const now = Date.now();
    this.regionLastComputedAt = Number.isFinite(metadata?.computedAt) ? metadata.computedAt : null;
    this.regionLastSentAt = Number.isFinite(metadata?.sentAt) ? metadata.sentAt : null;
    this.regionLastReceivedAt = now;
    this.onDiagnostic('canvas-regions-computed', { windowId: this.window?.id, count: Array.isArray(rectangles) ? rectangles.length : null, at: this.regionLastComputedAt, reason: metadata?.reason || 'renderer' });
    this.onDiagnostic('canvas-regions-sent', { windowId: this.window?.id, count: Array.isArray(rectangles) ? rectangles.length : null, at: this.regionLastSentAt, serializedLength: Number(metadata?.serializedLength) || null });
    const accepted = this.hitTest.update(rectangles);
    if (accepted) {
      this.lastRegionError = null;
      this.regionUpdateCount += 1;
      this.regionLastUpdatedAt = now;
      if (rectangles.length) this.regionLastNonEmptyAt = now;
      this.onDiagnostic('canvas-regions-received', { windowId: this.window?.id, count: rectangles.length, updateCount: this.regionUpdateCount, ignored: this.hitTest.state.ignored, dragging: this.hitTest.state.dragging, editing: this.editing, at: now });
    } else {
      this.lastRegionError = 'invalid-regions';
      this.regionRejectedCount += 1;
      this.onDiagnostic('canvas-regions-rejected', { windowId: this.window?.id, reason: this.lastRegionError, rejectedCount: this.regionRejectedCount, at: now });
    }
    return accepted;
  }
  gesture(dragging) {
    if (!this.active) return;
    this.hitTest?.setDragging(dragging);
    this.onDiagnostic('canvas-pointer-mode-changed', { windowId: this.window?.id, dragging: Boolean(dragging), ignored: this.hitTest?.state.ignored, reason: 'gesture', at: Date.now() });
  }
  focusEdit() {
    if (!this.active || !this.window?.isVisible()) return false;
    this.window.setFocusable(true);
    this.window.focus();
    this.editing = true;
    this.hitTest?.setDragging(true);
    this.onDiagnostic('canvas-edit-started', { windowId: this.window?.id, ignored: this.hitTest?.state.ignored, at: Date.now() });
    return true;
  }
  endEdit(reason = 'renderer') {
    if (!this.window || this.window.isDestroyed()) return false;
    this.editing = false;
    this.hitTest?.setDragging(false);
    this.window.setFocusable(false);
    this.onDiagnostic('canvas-edit-ended', { windowId: this.window?.id, ignored: this.hitTest?.state.ignored, reason, at: Date.now() });
    return true;
  }
  resetInteraction(reason = 'reset') {
    this.editing = false;
    this.hitTest?.setDragging(false);
    if (this.window && !this.window.isDestroyed()) this.window.setFocusable(false);
    return reason;
  }
  resize() {
    if (!this.active || this.window?.isDestroyed()) return;
    const bounds = virtualDesktopBounds(this.screen.getAllDisplays());
    this.resetInteraction('display-change');
    this.window.setBounds(bounds);
    this.window.webContents.send('pindo:canvas-geometry', { bounds, origin: { x: bounds.x, y: bounds.y }, displays: this.screen.getAllDisplays().map(display => ({ bounds: display.bounds, scaleFactor: display.scaleFactor })) });
    this.window.webContents.send('pindo:canvas-refresh-regions');
  }
  fail(error) {
    if (!this.window && !this.active) return;
    this.fallbackReason = String(error?.message || error || 'canvas-failure');
    this.active = false;
    clearInterval(this.timer);
    this.timer = null;
    this.resetInteraction('fallback');
    const failedWindow = this.window;
    this.closing = true;
    this.window = null;
    this.onError(error instanceof Error ? error : new Error(this.fallbackReason));
    if (failedWindow && !failedWindow.isDestroyed()) failedWindow.destroy();
  }
  interactionState() {
    return { active: this.active, editing: this.editing, dragging: Boolean(this.hitTest?.state.dragging), ignored: this.hitTest?.state.ignored, regionCount: this.hitTest?.state.regionCount || 0, regionUpdateCount: this.regionUpdateCount, regionRejectedCount: this.regionRejectedCount, regionLastUpdatedAt: this.regionLastUpdatedAt, regionLastNonEmptyAt: this.regionLastNonEmptyAt, regionLastComputedAt: this.regionLastComputedAt, regionLastSentAt: this.regionLastSentAt, regionLastReceivedAt: this.regionLastReceivedAt, lastRegionError: this.lastRegionError, rendererReadyAt: this.rendererReadyAt, windowVisible: Boolean(this.window?.isVisible?.()), recoveryRequestCount: this.recoveryRequestCount, recoveryRunCount: this.recoveryRunCount, recoveryReattachCount: this.recoveryReattachCount, recoveryLastDurationMs: this.recoveryLastDurationMs, fallbackReason: this.fallbackReason };
  }
  close() {
    this.active = false;
    this.closing = true;
    clearInterval(this.timer);
    this.timer = null;
    this.resetInteraction('close');
    this.hitTest?.clear();
    if (this.window && !this.window.isDestroyed()) { this.window.unhookAllWindowMessages?.(); this.window.destroy(); }
  }
}

module.exports = { DesktopCanvasManager };
