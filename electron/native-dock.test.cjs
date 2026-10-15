const test = require('node:test');
const assert = require('node:assert/strict');
const { NativeDock } = require('./native-dock.cjs');
const { MODES } = require('./cf07-diagnostics.cjs');

function fixture(mode = MODES.baseline, hostPolicy = null, opaqueDiagnostic = false, surfaceCapture = undefined, surfaceContinuityDiagnostic = false) {
  const calls = [];
  const instances = [];
  class Win {
    constructor(options) {
      this.id = instances.length + 10;
      this.options = options;
      this.bounds = { x: options.x || 0, y: options.y || 0, width: options.width, height: options.height };
      this.events = new Map();
      this.webEvents = new Map();
      this.webContents = {
        setWindowOpenHandler() {},
        on: (name, handler) => this.webEvents.set(name, handler),
        send: (...args) => calls.push(['send', this.id, ...args])
      };
      instances.push(this);
    }
    on(name, handler) { this.events.set(name, handler); }
    hookWindowMessage(message, handler) { this.windowMessage = [message, handler]; }
    loadFile(file, options) { calls.push(['load', this.id, file, options]); }
    isDestroyed() { return false; }
    isVisible() { return Boolean(this.visible); }
    setIgnoreMouseEvents() {}
    setBounds(bounds) { this.bounds = { ...this.bounds, ...bounds }; calls.push(['bounds', this.id, bounds]); }
    getBounds() { return this.bounds; }
    showInactive() { this.visible = true; calls.push(['show', this.id]); }
    hide() { this.visible = false; calls.push(['hide', this.id]); }
    setAlwaysOnTop(value, level) { calls.push(['top', this.id, value, level]); }
    moveTop() { calls.push(['moveTop', this.id]); }
    destroy() {}
  }
  const host = async win => { calls.push(['host', win.id]); return { attached: true }; };
  const dock = new NativeDock({
    BrowserWindow: Win,
    screen: {
      getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }),
      getCursorScreenPoint: () => ({ x: 0, y: 0 })
    },
    preloadPath: '/tmp/preload.cjs', indexPath: '/tmp/index.html', diagnostic: mode, desktopHost: host, hostPolicy, opaqueDiagnostic, surfaceCapture, surfaceContinuityDiagnostic
  });
  return { dock, calls, instances };
}

test('baseline dock records its transparent Explorer-hosted window profile', async () => {
  const { dock, calls, instances } = fixture(MODES.baseline);
  assert.equal(instances[0].options.transparent, true);
  assert.equal(instances[0].options.backgroundColor, '#00000000');
  assert.equal(instances[0].pindoWindowProfile.host, 'desktop-pending');
  await instances[0].webEvents.get('did-finish-load')();
  assert.equal(instances[0].pindoWindowProfile.host, 'explorer-desktop');
  assert.ok(calls.some(call => call[0] === 'load' && call[3].query.cf07Mode === 'baseline'));
  instances[0].events.get('closed')();
});

test('surface continuity dock stays transparent while renderer throttling is disabled', () => {
  const { instances } = fixture(MODES.baseline, null, false, undefined, true);
  const win = instances[0];
  assert.equal(win.options.transparent, true);
  assert.equal(win.options.webPreferences.backgroundThrottling, false);
  assert.equal(win.pindoWindowProfile.diagnostic, 'surface-continuity');
  assert.equal(win.windowMessage[0], 0x0018);
  win.events.get('closed')();
});

test('CF-07 host policy uses the verified transparent top-level fallback without Explorer attach', async () => {
  const { calls, instances } = fixture(MODES.baseline, { host: 'top', reason: 'win10-17763-no-transparent-compositor' });
  assert.equal(instances[0].pindoWindowProfile.host, 'top-level');
  assert.equal(instances[0].pindoWindowProfile.hostReason, 'win10-17763-no-transparent-compositor');
  await instances[0].webEvents.get('did-finish-load')();
  assert.ok(!calls.some(call => call[0] === 'host'));
  instances[0].events.get('closed')();
});

test('opaque diagnostic preserves the resolved host while disabling transparency', async () => {
  const captures = [];
  const { instances } = fixture(MODES.baseline, { host: 'top', reason: 'compatibility' }, true, async win => { captures.push(win.id); return { width: 430, height: 700, pixelCount: 1 }; });
  const win = instances[0];
  assert.equal(win.options.transparent, false);
  assert.equal(win.options.backgroundColor, '#fff7ed');
  assert.equal(win.pindoWindowProfile.host, 'top-level');
  assert.equal(win.pindoWindowProfile.diagnostic, 'opaque-window');
  assert.equal(win.windowMessage[0], 0x0018);
  win.windowMessage[1](Buffer.alloc(8));
  const shown = Buffer.alloc(8); shown.writeBigUInt64LE(1n); win.windowMessage[1](shown);
  await new Promise(setImmediate);
  assert.deepEqual(captures, [win.id]);
  win.events.get('closed')();
});

test('dock-hidden keeps the right-side BrowserWindow unavailable without changing note state', () => {
  const { dock, calls, instances } = fixture(MODES['dock-hidden']);
  dock.sync([{ id: 'a', mode: 'bookmark', title: 'A', type: 'quick' }]);
  assert.equal(dock.cards.length, 1);
  assert.ok(calls.some(call => call[0] === 'hide' && call[1] === instances[0].id));
  assert.ok(!calls.some(call => call[0] === 'show'));
  instances[0].events.get('closed')();
});

test('separate preview probes use the requested top-level transparency', () => {
  const { dock, instances } = fixture(MODES['preview-opaque-top']);
  assert.equal(instances.length, 2);
  assert.equal(instances[1].options.transparent, false);
  assert.equal(instances[1].options.backgroundColor, '#fff7ed');
  assert.equal(instances[1].pindoWindowProfile.role, 'dock-preview-probe');
  assert.equal(instances[1].pindoWindowProfile.host, 'top-level');
  instances[0].events.get('closed')();
});
