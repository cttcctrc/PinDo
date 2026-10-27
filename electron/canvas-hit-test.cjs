/** Native hit testing for a desktop-sized, transparent note canvas. */
function createCanvasHitTest(win, screen) {
  let rectangles = [];
  let dragging = false;
  let ignored;
  const contains = (point, rect, padding = 0) => point.x >= rect.x - padding && point.y >= rect.y - padding && point.x < rect.x + rect.width + padding && point.y < rect.y + rect.height + padding;
  const refresh = () => {
    if (win.isDestroyed()) return;
    const bounds = win.getBounds();
    const cursor = screen.getCursorScreenPoint();
    const position = { x: cursor.x - bounds.x, y: cursor.y - bounds.y };
    // Keep a small exit margin once the canvas owns the pointer. It prevents
    // pass-through from oscillating on fractional DIP edges during hover.
    const padding = ignored === false ? 6 : 0;
    const shouldIgnore = !dragging && !rectangles.some(rect => contains(position, rect, padding));
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
    get ignored() { return ignored; },
    get state() { return { ignored: Boolean(ignored), dragging, regionCount: rectangles.length }; }
  };
}
module.exports = { createCanvasHitTest };
