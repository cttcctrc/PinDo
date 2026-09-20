// Transparent pixels do not imply native mouse pass-through. Only published
// interactive rectangles receive clicks; all coordinates are Electron DIP.
function createControlHitTest(win, screen) {
  let regions = [], ignored;
  const refresh = () => {
    if (win.isDestroyed()) return;
    const bounds = win.getBounds(), cursor = screen.getCursorScreenPoint();
    const x = cursor.x - bounds.x, y = cursor.y - bounds.y;
    const hit = win.pindoGestureActive || regions.some(r => r.interactive !== false && x >= r.x && y >= r.y && x < r.x + r.width && y < r.y + r.height);
    if (ignored !== !hit) {
      ignored = !hit;
      if(ignored)win.webContents?.send?.('pindo:pointer-outside');
      win.setIgnoreMouseEvents(ignored, { forward: true });
    }
  };
  return {
    refresh,
    update(value) {
      if (!Array.isArray(value) || value.length > 16) return;
      regions = value.filter(r => r && ['x', 'y', 'width', 'height'].every(k => Number.isFinite(r[k])) && r.width > 0 && r.height > 0).map(r=>({...r,interactive:r.interactive!==false}));
      // Do not call BrowserWindow.setShape here. On Windows, repeatedly
      // changing the shape of a layered transparent window can make the
      // shaped rectangles render as opaque black. Mouse pass-through is
      // already handled precisely by setIgnoreMouseEvents below.
      refresh();
    }
  };
}
module.exports = { createControlHitTest };
