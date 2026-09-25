// All coordinates come from Electron in DIP, never from a moving renderer.
function registerWindowGesture({ ipcMain, screen, resolveWindow, hooks = {}, resizePreview = null, refreshAfterMove = () => {} }) {
  const sessions = new WeakMap();
  const resizeBounds = (origin, cursor, start, direction) => {
    const minWidth = 280, minHeight = 210;
    const dx = cursor.x - start.x, dy = cursor.y - start.y;
    const next = { ...origin };
    if (direction.includes('e')) next.width = Math.max(minWidth, origin.width + dx);
    if (direction.includes('s')) next.height = Math.max(minHeight, origin.height + dy);
    if (direction.includes('w')) { next.width = Math.max(minWidth, origin.width - dx); next.x = origin.x + origin.width - next.width; }
    if (direction.includes('n')) { next.height = Math.max(minHeight, origin.height - dy); next.y = origin.y + origin.height - next.height; }
    return next;
  };
  ipcMain.on('pindo:window-gesture', (event, action, kind) => {
    const win = resolveWindow(event);
    if (!win || win.isDestroyed()) { event.returnValue = null; return; }
    if (action === 'begin') {
      const resize = typeof kind === 'string' && /^resize:(n|s|e|w|ne|nw|se|sw)$/.test(kind);
      if (kind !== 'move' && kind !== 'resize' && !resize) { event.returnValue = null; return; }
      const direction = resize ? kind.split(':')[1] : kind === 'resize' ? 'se' : '';
      const meta = hooks.begin?.(win, resize || kind === 'resize' ? 'resize' : kind);
      if (meta === false) { event.returnValue = null; return; }
      win.pindoGestureActive = true;
      const origin = win.getBounds();
      sessions.set(event.sender, { win, kind: resize || kind === 'resize' ? 'resize' : kind, direction, meta, origin, cursor: screen.getCursorScreenPoint() });
      if (resize || kind === 'resize') resizePreview?.show(origin);
    }
    const session = sessions.get(event.sender);
    if (!session || session.win !== win) { event.returnValue = null; return; }
    if (action === 'update' || action === 'end') {
      const cursor = screen.getCursorScreenPoint();
      const dx = cursor.x - session.cursor.x, dy = cursor.y - session.cursor.y;
      const bounds = { ...session.origin };
      if (session.kind === 'move') { bounds.x += dx; bounds.y += dy; }
      else Object.assign(bounds, resizeBounds(session.origin, cursor, session.cursor, session.direction));
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
          const bounds = resizeBounds(session.origin, cursor, session.cursor, session.direction);
          win.setBounds(bounds);
          hooks.update?.(session.meta, bounds);
        }
      }
      const finalBounds = hooks.end?.(session.meta, win.getBounds(), action);
      if (finalBounds) win.setBounds(finalBounds);
    }
    event.returnValue = win.getBounds();
    if (action === 'end' || action === 'cancel') {
      win.pindoGestureActive = false; sessions.delete(event.sender);
      if (session.kind === 'move' && action === 'end') refreshAfterMove(win);
    }
  });
}
module.exports = { registerWindowGesture };
