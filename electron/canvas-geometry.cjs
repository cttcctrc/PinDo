function virtualDesktopBounds(displays) {
  const bounds = (Array.isArray(displays) ? displays : []).map(display => display?.bounds).filter(Boolean);
  if (!bounds.length) return { x: 0, y: 0, width: 1, height: 1 };
  const left = Math.min(...bounds.map(rect => rect.x));
  const top = Math.min(...bounds.map(rect => rect.y));
  const right = Math.max(...bounds.map(rect => rect.x + rect.width));
  const bottom = Math.max(...bounds.map(rect => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function screenToCanvasPoint(point, canvasBounds) {
  return { x: point.x - canvasBounds.x, y: point.y - canvasBounds.y };
}

function canvasToScreenPoint(point, canvasBounds) {
  return { x: point.x + canvasBounds.x, y: point.y + canvasBounds.y };
}

module.exports = { virtualDesktopBounds, screenToCanvasPoint, canvasToScreenPoint };
