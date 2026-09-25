const test = require('node:test');
const assert = require('node:assert/strict');
const { DesktopCanvasManager } = require('./desktop-canvas-manager.cjs');

function fixture(desktopHost) {
  const calls = [];
  class Win {
    constructor(options) {
      calls.push(['created', options.focusable, options.show]);
      this.webContents = { setWindowOpenHandler() {}, on() {}, send: (...args) => calls.push(['send', ...args]) };
      this.bounds = options;
    }
    on() {}
    async loadFile(_file, options) { calls.push(['load', options.query.canvasWindow]); }
    getBounds() { return this.bounds; }
    isDestroyed() { return Boolean(this.destroyed); }
    isVisible() { return Boolean(this.visible); }
    setIgnoreMouseEvents(...args) { calls.push(['ignore', ...args]); }
    setFocusable(value) { calls.push(['focusable', value]); }
    focus() { calls.push(['focus']); }
    showInactive() { this.visible = true; calls.push(['show']); }
    destroy() { this.destroyed = true; calls.push(['destroy']); }
  }
  const manager = new DesktopCanvasManager({ BrowserWindow: Win,
    screen: { getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }), getCursorScreenPoint: () => ({ x: 0, y: 0 }) },
    indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs', desktopHost,
    onReady: () => calls.push(['ready']), onError: () => calls.push(['error'])
  });
  return { calls, manager };
}

test('canvas stays hidden and unfocused until Explorer attaches, then requests note regions', async () => {
  const { calls, manager } = fixture(async () => ({ attached: true }));
  await manager.open();
  assert.equal(manager.active, true);
  assert.deepEqual(calls.slice(0, 3), [['created', false, false], ['ignore', true, { forward: true }], ['load', '1']]);
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
