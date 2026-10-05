const test = require('node:test');
const assert = require('node:assert/strict');
const { DesktopCanvasManager } = require('./desktop-canvas-manager.cjs');

function fixture(desktopHost) {
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
    onReady: () => calls.push(['ready']), onError: () => calls.push(['error'])
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
