function createDodoPhysicsHandler({ trustedSender, getWindow, screen }) {
  return (event, action, value) => {
    const win = getWindow();
    if (!trustedSender(event) || !win || win.isDestroyed()) { event.returnValue = null; return; }
    const bounds = win.getBounds();
    const workArea = screen.getDisplayMatching(bounds).workArea;
    if (action === 'metrics') { event.returnValue = { bounds, workArea }; return; }
    if (action === 'move' && Number.isFinite(value?.y)) {
      const y = Math.round(Math.max(workArea.y - bounds.height, Math.min(value.y, workArea.y + workArea.height)));
      win.setPosition(bounds.x, y, false); return;
    }
    event.returnValue = null;
  };
}

module.exports = { createDodoPhysicsHandler };
