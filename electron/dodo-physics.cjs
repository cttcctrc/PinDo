function createDodoPhysicsHandler({ trustedSender, getWindow, screen }) {
  return (event, action, value) => {
    const win = getWindow();
    if (!trustedSender(event) || !win || win.isDestroyed()) { event.returnValue = null; return; }
    const bounds = win.getBounds();
    const workArea = screen.getDisplayMatching(bounds).workArea;
    if (action === 'metrics') { event.returnValue = { bounds, workArea }; return; }
    event.returnValue = null;
  };
}

module.exports = { createDodoPhysicsHandler };
