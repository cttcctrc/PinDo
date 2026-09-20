// All coordinates come from Electron in DIP, never from a moving renderer.
function registerWindowGesture({ ipcMain, screen, resolveWindow, hooks = {}, resizePreview = null }) {
  const sessions = new WeakMap();
  ipcMain.on('pindo:window-gesture', (event, action, kind) => {
    const win = resolveWindow(event);
    if (!win || win.isDestroyed()) { event.returnValue = null; return; }
    if (action === 'begin') {
      if (!['move', 'resize'].includes(kind)) { event.returnValue = null; return; }
      const meta = hooks.begin?.(win, kind);
      if (meta === false) { event.returnValue = null; return; }
      win.pindoGestureActive = true;
      const origin = win.getBounds();
      sessions.set(event.sender, { win, kind, meta, origin, cursor: screen.getCursorScreenPoint() });
      if (kind === 'resize') resizePreview?.show(origin);
    }
    const session = sessions.get(event.sender);
    if (!session || session.win !== win) { event.returnValue = null; return; }
    if (action === 'update' || action === 'end') {
      const cursor = screen.getCursorScreenPoint();
      const dx = cursor.x - session.cursor.x, dy = cursor.y - session.cursor.y;
      const bounds = { ...session.origin };
      if (session.kind === 'move') { bounds.x += dx; bounds.y += dy; }
      else { bounds.width = Math.max(280, bounds.width + dx); bounds.height = Math.max(210, bounds.height + dy); }
      if (session.kind === 'resize') resizePreview?.update(bounds);
      else {
        win.setBounds(bounds);
        hooks.update?.(session.meta, bounds);
      }
    }
    if (action === 'end' || action === 'cancel') {
      if (session.kind === 'resize') {
        resizePreview?.hide();
        if (action === 'end') {
          const cursor = screen.getCursorScreenPoint();
          const bounds = {
            ...session.origin,
            width: Math.max(280, session.origin.width + cursor.x - session.cursor.x),
            height: Math.max(210, session.origin.height + cursor.y - session.cursor.y)
          };
          win.setBounds(bounds);
          hooks.update?.(session.meta, bounds);
        }
      }
      const finalBounds = hooks.end?.(session.meta, win.getBounds(), action);
      if (finalBounds) win.setBounds(finalBounds);
    }
    event.returnValue = win.getBounds();
    if (action === 'end' || action === 'cancel') { win.pindoGestureActive = false; sessions.delete(event.sender); }
  });
}
module.exports = { registerWindowGesture };
