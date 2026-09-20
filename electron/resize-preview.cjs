class ResizePreview {
  constructor({ BrowserWindow }) {
    this.BrowserWindow = BrowserWindow;
    this.window = null;
  }

  ensure() {
    if (this.window && !this.window.isDestroyed()) return this.window;
    const win = new this.BrowserWindow({
      x: 0, y: 0, width: 280, height: 210,
      show: false, frame: false, transparent: true, resizable: false,
      movable: false, focusable: false, skipTaskbar: true, alwaysOnTop: true,
      hasShadow: false, backgroundColor: '#00000000',
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
    });
    win.setIgnoreMouseEvents(true);
    win.setAlwaysOnTop(true, 'screen-saver');
    const html = '<!doctype html><meta charset="utf-8"><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:transparent}*{box-sizing:border-box}.preview{position:absolute;inset:2px;border:2px dashed rgba(75,139,238,.9);border-radius:24px;background:rgba(107,164,255,.10);box-shadow:inset 0 0 0 1px rgba(255,255,255,.72),0 8px 24px rgba(45,104,198,.12)}</style><div class="preview"></div>';
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win.on('closed', () => { if (this.window === win) this.window = null; });
    this.window = win;
    return win;
  }

  warm() {
    this.ensure();
  }

  show(bounds) {
    const win = this.ensure();
    win.setBounds(this.normalize(bounds));
    win.showInactive();
    win.moveTop();
  }

  update(bounds) {
    const win = this.window;
    if (!win || win.isDestroyed()) return;
    win.setBounds(this.normalize(bounds));
  }

  hide() {
    if (this.window && !this.window.isDestroyed()) this.window.hide();
  }

  close() {
    if (this.window && !this.window.isDestroyed()) this.window.destroy();
    this.window = null;
  }

  normalize(bounds) {
    return {
      x: Math.round(bounds.x), y: Math.round(bounds.y),
      width: Math.max(280, Math.round(bounds.width)),
      height: Math.max(210, Math.round(bounds.height))
    };
  }
}

module.exports = { ResizePreview };
