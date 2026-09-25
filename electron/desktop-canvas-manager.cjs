const { attachToWindowsDesktop } = require('./windows-desktop-host.cjs');
const { createCanvasHitTest } = require('../spike/desktop-canvas/hit-test.cjs');

/** Owns the single, desktop-hosted surface. Never owns or serializes note data. */
class DesktopCanvasManager {
  constructor({ BrowserWindow, screen, indexPath, preloadPath, onReady = () => {}, onError = () => {}, desktopHost = attachToWindowsDesktop }) {
    Object.assign(this, { BrowserWindow, screen, indexPath, preloadPath, onReady, onError, desktopHost });
    this.window = null;
    this.hitTest = null;
    this.timer = null;
    this.active = false;
  }

  async open() {
    if (this.window && !this.window.isDestroyed()) return;
    const window = new this.BrowserWindow({
      ...this.screen.getPrimaryDisplay().bounds,
      frame: false, transparent: true, backgroundColor: '#00000000',
      resizable: false, hasShadow: false, skipTaskbar: true, focusable: false, show: false,
      webPreferences: { preload: this.preloadPath, contextIsolation: true, sandbox: true, nodeIntegration: false }
    });
    this.window = window;
    this.hitTest = createCanvasHitTest(window, this.screen);
    this.hitTest.update([]);
    this.timer = setInterval(() => { if (window.isVisible()) this.hitTest.refresh(); }, 16);
    this.timer.unref?.();
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => {
      if (url.split('?')[0] !== require('node:url').pathToFileURL(this.indexPath).href) event.preventDefault();
    });
    window.webContents.on('did-start-loading', () => this.hitTest?.clear());
    window.on('blur', () => { if (!window.isDestroyed()) window.setFocusable(false); });
    window.on('closed', () => { clearInterval(this.timer); if (this.window === window) { this.window = null; this.active = false; } });
    try {
      await window.loadFile(this.indexPath, { query: { canvasWindow: '1' } });
      const result = await this.desktopHost(window);
      if (window.isDestroyed()) return;
      if (!result.attached) throw new Error(result.reason || 'Explorer did not accept the canvas');
      window.showInactive();
      this.active = true;
      window.webContents.send('pindo:canvas-refresh-regions');
      this.onReady();
    } catch (error) {
      this.active = false;
      this.onError(error);
      if (!window.isDestroyed()) window.destroy();
    }
  }

  regions(rectangles) { return this.active && this.hitTest?.update(rectangles); }
  gesture(dragging) { if (this.active) this.hitTest?.setDragging(dragging); }
  focusEdit() {
    if (!this.active || !this.window?.isVisible()) return false;
    this.window.setFocusable(true);
    this.window.focus();
    return true;
  }
  resize() {
    if (!this.active || this.window?.isDestroyed()) return;
    this.window.setBounds(this.screen.getPrimaryDisplay().bounds);
    this.window.webContents.send('pindo:canvas-refresh-regions');
  }
  close() {
    this.active = false;
    clearInterval(this.timer);
    this.hitTest?.clear();
    if (this.window && !this.window.isDestroyed()) this.window.destroy();
  }
}

module.exports = { DesktopCanvasManager };
