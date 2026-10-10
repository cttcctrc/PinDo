const { attachToWindowsDesktop } = require('./windows-desktop-host.cjs');
const { createCanvasHitTest } = require('./canvas-hit-test.cjs');
const { virtualDesktopBounds } = require('./canvas-geometry.cjs');

/** Owns the single, desktop-hosted surface. Never owns or serializes note data. */
class DesktopCanvasManager {
  constructor({ BrowserWindow, screen, indexPath, preloadPath, onReady = () => {}, onError = () => {}, desktopHost = attachToWindowsDesktop, diagnostic = null, onDiagnostic = () => {} }) {
    Object.assign(this, { BrowserWindow, screen, indexPath, preloadPath, onReady, onError, desktopHost, diagnostic, onDiagnostic });
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
    window.on('closed', () => { clearInterval(this.timer); if (this.window === window) { this.window = null; this.active = false; } });
    try {
      await window.loadFile(this.indexPath, { query: { canvasWindow: '1', canvasOriginX: String(canvasBounds.x), canvasOriginY: String(canvasBounds.y) } });
      const result = await this.desktopHost(window);
      if (window.isDestroyed()) return;
      if (!result.attached) throw new Error(result.reason || 'Explorer did not accept the canvas');
      window.pindoWindowProfile.host = 'explorer-desktop';
      window.pindoWindowProfile.hostReason = null;
      if (this.diagnostic?.canvasVisible === false) window.hide?.(); else window.showInactive();
      this.active = true;
      this.timer = setInterval(() => { if (this.active && window.isVisible() && !this.editing) this.hitTest?.refresh(); }, 32);
      this.timer.unref?.();
      window.webContents.send('pindo:canvas-refresh-regions');
      this.onReady();
    } catch (error) {
      this.fail(error);
    }
  }

  regions(rectangles) {
    if (!this.active || !this.hitTest) return false;
    const accepted = this.hitTest.update(rectangles);
    const now = Date.now();
    if (accepted) {
      this.regionUpdateCount += 1;
      this.regionLastUpdatedAt = now;
      if (rectangles.length) this.regionLastNonEmptyAt = now;
      this.onDiagnostic('canvas-regions-updated', { windowId: this.window?.id, count: rectangles.length, updateCount: this.regionUpdateCount, at: now });
    } else {
      this.regionRejectedCount += 1;
      this.onDiagnostic('canvas-regions-rejected', { windowId: this.window?.id, rejectedCount: this.regionRejectedCount, at: now });
    }
    return accepted;
  }
  gesture(dragging) { if (this.active) this.hitTest?.setDragging(dragging); }
  focusEdit() {
    if (!this.active || !this.window?.isVisible()) return false;
    this.window.setFocusable(true);
    this.window.focus();
    this.editing = true;
    this.hitTest?.setDragging(true);
    return true;
  }
  endEdit(_reason = 'renderer') {
    if (!this.window || this.window.isDestroyed()) return false;
    this.editing = false;
    this.hitTest?.setDragging(false);
    this.window.setFocusable(false);
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
    this.window = null;
    this.onError(error instanceof Error ? error : new Error(this.fallbackReason));
    if (failedWindow && !failedWindow.isDestroyed()) failedWindow.destroy();
  }
  interactionState() {
    return { active: this.active, editing: this.editing, dragging: Boolean(this.hitTest?.state.dragging), ignored: this.hitTest?.state.ignored, regionCount: this.hitTest?.state.regionCount || 0, regionUpdateCount: this.regionUpdateCount, regionRejectedCount: this.regionRejectedCount, regionLastUpdatedAt: this.regionLastUpdatedAt, regionLastNonEmptyAt: this.regionLastNonEmptyAt, rendererReadyAt: this.rendererReadyAt, windowVisible: Boolean(this.window?.isVisible?.()), fallbackReason: this.fallbackReason };
  }
  close() {
    this.active = false;
    clearInterval(this.timer);
    this.timer = null;
    this.resetInteraction('close');
    this.hitTest?.clear();
    if (this.window && !this.window.isDestroyed()) this.window.destroy();
  }
}

module.exports = { DesktopCanvasManager };
