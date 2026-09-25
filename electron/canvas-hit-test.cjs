/** Native hit testing for a desktop-sized, transparent note canvas. */
function createCanvasHitTest(win, screen) {
  let rectangles = [];
  let dragging = false;
  let ignored;
  const contains = (point, rect) => point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.width && point.y < rect.y + rect.height;
  const refresh = () => {
    if (win.isDestroyed()) return;
    const bounds = win.getBounds();
    const cursor = screen.getCursorScreenPoint();
    const position = { x: cursor.x - bounds.x, y: cursor.y - bounds.y };
    const shouldIgnore = !dragging && !rectangles.some(rect => contains(position, rect));
    if (ignored === shouldIgnore) return;
    ignored = shouldIgnore;
    win.setIgnoreMouseEvents(shouldIgnore, { forward: true });
  };
  return {
    refresh,
    setDragging(value) { dragging = Boolean(value); refresh(); },
    update(value) {
      if (!Array.isArray(value) || value.length > 64) return false;
      if (value.some(rect => !rect || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])) || rect.width <= 0 || rect.height <= 0)) return false;
      rectangles = value.map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
      refresh();
      return true;
    },
    clear() { dragging = false; rectangles = []; refresh(); },
    get ignored() { return ignored; }
  };
}
module.exports = { createCanvasHitTest };
