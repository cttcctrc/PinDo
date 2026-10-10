const test = require('node:test');
const assert = require('node:assert/strict');
const { DesktopCanvasManager } = require('./desktop-canvas-manager.cjs');

function fixture(desktopHost, diagnostic = null) {
  const calls = [];
  const windowEvents = new Map();
  const webEvents = new Map();
  class Win {
    constructor(options) {
      calls.push(['created', options.focusable, options.show, { x: options.x, y: options.y, width: options.width, height: options.height }]);
      this.webContents = { setWindowOpenHandler() {}, on: (name, handler) => webEvents.set(name, handler), send: (...args) => calls.push(['send', ...args]) };
      this.bounds = options;
    }
    on(name, handler) { windowEvents.set(name, handler); }
    async loadFile(_file, options) { calls.push(['load', options.query]); }
    getBounds() { return this.bounds; }
    isDestroyed() { return Boolean(this.destroyed); }
    isVisible() { return Boolean(this.visible); }
    setIgnoreMouseEvents(...args) { calls.push(['ignore', ...args]); }
    setFocusable(value) { calls.push(['focusable', value]); }
    focus() { calls.push(['focus']); }
    showInactive() { this.visible = true; calls.push(['show']); }
    setBounds(bounds) { this.bounds = { ...this.bounds, ...bounds }; calls.push(['bounds', bounds]); }
    destroy() { this.destroyed = true; calls.push(['destroy']); }
  }
  const manager = new DesktopCanvasManager({ BrowserWindow: Win,
    screen: {
      getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 2560, height: 1440 } }),
      getAllDisplays: () => [
        { bounds: { x: -1920, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 },
        { bounds: { x: 0, y: 0, width: 2560, height: 1440 }, scaleFactor: 1.25 }
      ],
      getCursorScreenPoint: () => ({ x: 0, y: 0 })
    },
    indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs', desktopHost,
    onReady: () => calls.push(['ready']), onError: () => calls.push(['error']),
    onDiagnostic: (event, detail) => calls.push(['diagnostic', event, detail]), diagnostic
  });
  return { calls, manager, windowEvents, webEvents };
}

test('canvas stays hidden and unfocused until Explorer attaches, then requests note regions', async () => {
  const { calls, manager } = fixture(async () => ({ attached: true }));
  await manager.open();
  assert.equal(manager.active, true);
  assert.deepEqual(calls[0], ['created', false, false, { x: -1920, y: 0, width: 4480, height: 1440 }]);
  assert.deepEqual(calls.find(call => call[0] === 'load')[1], { canvasWindow: '1', canvasOriginX: '-1920', canvasOriginY: '0' });
  assert.ok(calls.some(call => call[0] === 'send' && call[1] === 'pindo:canvas-refresh-regions'));
  assert.equal(manager.focusEdit(), true);
  assert.ok(calls.some(call => call[0] === 'focusable' && call[1] === true));
  manager.close();
});

test('failed desktop attachment leaves native notes available', async () => {
  const { calls, manager } = fixture(async () => ({ attached: false, reason: 'Explorer unavailable' }));
  await manager.open();
  assert.equal(manager.active, false);
  assert.ok(calls.some(call => call[0] === 'error'));
  assert.ok(calls.some(call => call[0] === 'destroy'));
  assert.ok(!calls.some(call => call[0] === 'show'));
});

test('focus edit can end and re-enter without leaving the desktop blocked', async () => {
  const { calls, manager, windowEvents } = fixture(async () => ({ attached: true }));
  await manager.open();
  assert.equal(manager.focusEdit(), true);
  assert.equal(manager.endEdit('test'), true);
  assert.equal(manager.focusEdit(), true);
  windowEvents.get('blur')();
  assert.equal(manager.interactionState().editing, false);
  assert.equal(manager.interactionState().dragging, false);
  assert.equal(calls.filter(call => call[0] === 'focusable' && call[1] === false).length >= 2, true);
  manager.close();
});

test('lost gesture is reset on blur and display geometry changes are republished', async () => {
  const { calls, manager, windowEvents } = fixture(async () => ({ attached: true }));
  await manager.open();
  manager.gesture(true);
  assert.equal(manager.interactionState().dragging, true);
  windowEvents.get('blur')();
  assert.equal(manager.interactionState().dragging, false);
  manager.resize();
  assert.ok(calls.some(call => call[0] === 'send' && call[1] === 'pindo:canvas-geometry'));
  manager.close();
});

test('renderer failure deactivates canvas and requests native fallback', async () => {
  const { calls, manager, webEvents } = fixture(async () => ({ attached: true }));
  await manager.open();
  webEvents.get('render-process-gone')({}, { reason: 'crashed', exitCode: 9 });
  assert.equal(manager.active, false);
  assert.ok(calls.some(call => call[0] === 'error'));
  assert.ok(calls.some(call => call[0] === 'destroy'));
});

test('CF-07 canvas-hidden mode attaches the canvas but never shows it', async () => {
  const { calls, manager } = fixture(async () => ({ attached: true }), { canvasVisible: false, mode: 'canvas-hidden' });
  await manager.open();
  assert.equal(manager.active, true);
  assert.ok(!calls.some(call => call[0] === 'show'));
  assert.equal(manager.interactionState().windowVisible, false);
  assert.equal(manager.window.pindoWindowProfile.host, 'explorer-desktop');
  manager.close();
});

test('canvas region diagnostics distinguish empty publication timing from rejected updates', async () => {
  const { manager } = fixture(async () => ({ attached: true }));
  await manager.open();
  assert.equal(manager.regions([]), true);
  const empty = manager.interactionState();
  assert.equal(empty.regionCount, 0);
  assert.equal(empty.regionUpdateCount >= 1, true);
  assert.equal(empty.regionRejectedCount, 0);
  assert.equal(Number.isFinite(empty.regionLastUpdatedAt), true);
  assert.equal(manager.regions([{ x: 10, y: 20, width: 100, height: 80 }]), true);
  assert.equal(manager.interactionState().regionCount, 1);
  assert.equal(Number.isFinite(manager.interactionState().regionLastNonEmptyAt), true);
  assert.equal(manager.regions([{ x: NaN, y: 0, width: 1, height: 1 }]), false);
  assert.equal(manager.interactionState().regionRejectedCount, 1);
  manager.close();
});
