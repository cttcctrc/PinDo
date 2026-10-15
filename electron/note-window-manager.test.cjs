const assert = require('node:assert/strict');
const test = require('node:test');
const { NoteWindowManager, nativeNoteView } = require('./note-window-manager.cjs');

const displays = [{ bounds: { x: -1920, y: 0, width: 1920, height: 1080 }, workArea: { x: -1920, y: 0, width: 1920, height: 1040 } }, { bounds: { x: 0, y: 0, width: 2560, height: 1440 }, workArea: { x: 0, y: 0, width: 2560, height: 1400 } }];
const note = (overrides = {}) => ({ id: 'note-1', type: 'quick', mode: 'desktop', x: -400, y: 12, w: 400, h: 360, ...overrides });

test('chooses the display by overlap and keeps a note visible after monitor changes', () => {
  assert.deepEqual(nativeNoteView(note(), displays).bounds, { x: -400, y: 12, width: 400, height: 360 });
  assert.deepEqual(nativeNoteView(note({ x: -4000 }), displays).bounds.x, -1920);
  assert.equal(nativeNoteView(note({ x: 9999, y: 9999 }), displays).bounds.x, 2160);
});

test('rejects invalid and untrusted note shapes', () => {
  assert.equal(nativeNoteView(note({ mode: 'system' }), displays), null);
  assert.equal(nativeNoteView(note({ x: Number.NaN }), displays), null);
});

test('opens and closes separate windows, without creating windows for bookmarks', () => {
  const created = [];
  class FakeWindow {
    constructor(options) { this.bounds = { x: options.x, y: options.y, width: options.width, height: options.height }; this.handlers = {}; this.webContents = { setWindowOpenHandler() {}, on() {}, once() {} }; created.push(this); }
    on(event, callback) { this.handlers[event] = callback; }
    once(event, callback) { this.handlers[event] = callback; }
    loadFile(file, options) { this.query = options.query; }
    showInactive() { this.visible = true; }
    hide() { this.visible = false; }
    setAlwaysOnTop(flag) { this.top = flag; }
    isDestroyed() { return Boolean(this.destroyed); }
    getBounds() { return this.bounds; }
    setBounds(bounds) { this.bounds = bounds; }
    destroy() { this.destroyed = true; this.handlers.closed?.(); }
  }
  const manager = new NoteWindowManager({ BrowserWindow: FakeWindow, screen: { getAllDisplays: () => displays }, indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs' });
  manager.sync([note(), note({ id: 'book', mode: 'bookmark' })]);
  assert.equal(created.length, 1);
  assert.equal(created[0].query.noteWindow, 'note-1');
  manager.sync([note({ mode: 'bookmark' })]);
  assert.equal(created.length, 1);
  assert.equal(created[0].visible, false);
  assert.equal(created[0].destroyed, undefined);
  manager.sync([note()]);
  assert.equal(created.length, 1);
  // A renderer that has not finished loading must remain hidden.
  assert.equal(created[0].visible, false);
  manager.sync([note({ mode: 'top', x: 100 })]);
  assert.equal(created.length, 2);
  assert.equal(created[0].destroyed, true);
  assert.equal(created[1].top, true);
  assert.equal(created[1].getBounds().x, 100);
  manager.sync([]);
  assert.equal(manager.windows.size, 0);
});

test('canvas mode retains only true top-layer native windows and can roll back', () => {
  const created = [];
  class FakeWindow {
    constructor() { this.webContents = { setWindowOpenHandler() {}, on() {}, once() {} }; created.push(this); }
    on(event, callback) { if (event === 'closed') this.closed = callback; }
    loadFile() {}
    isDestroyed() { return Boolean(this.destroyed); }
    setAlwaysOnTop() {}
    showInactive() {}
    destroy() { this.destroyed = true; this.closed?.(); }
  }
  const manager = new NoteWindowManager({ BrowserWindow: FakeWindow, screen: { getAllDisplays: () => displays }, indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs', canvasMode: true });
  const notes = [note(), note({ id: 'pinned', mode: 'top', x: 100 }), note({ id: 'stored', mode: 'bookmark' })];
  manager.sync(notes);
  assert.deepEqual([...manager.windows.keys()], ['pinned']);
  manager.canvasMode = false;
  manager.sync(notes);
  assert.deepEqual([...manager.windows.keys()].sort(), ['note-1', 'pinned']);
  assert.equal(created.length, 2);
});

test('attaches desktop notes before showing them and keeps top notes out of Explorer', async () => {
  const created = [], attached = [];
  class FakeWindow {
    constructor(options) {
      this.options = options; this.webContents = {
        setWindowOpenHandler() {}, on() {}, once: (event, callback) => { this.loaded = callback; }
      }; created.push(this);
    }
    on() {}
    loadFile() {}
    isDestroyed() { return false; }
    getBounds() { return { x: 0, y: 0, width: 400, height: 360 }; }
    setAlwaysOnTop(flag) { this.top = flag; }
    showInactive() { this.shown = true; }
  }
  const manager = new NoteWindowManager({
    BrowserWindow: FakeWindow, screen: { getAllDisplays: () => displays },
    indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs',
    desktopHost: async window => { attached.push(window); return { attached: true }; }
  });
  manager.sync([note({ x: 0 }), note({ id: 't', mode: 'top', x: 500 })]);
  assert.equal(created[0].shown, undefined);
  await created[0].loaded();
  await created[1].loaded();
  assert.deepEqual(attached, [created[0]]);
  assert.equal(created[0].shown, true);
  assert.equal(created[1].top, true);
});

test('native bounds updates are clamped to the active display and reject malformed values', () => {
  const created = [];
  class FakeWindow {
    constructor(options) { this.bounds = { x: options.x, y: options.y, width: options.width, height: options.height }; this.webContents = { setWindowOpenHandler() {}, on() {}, once() {} }; created.push(this); }
    on() {}
    loadFile() {}
    isDestroyed() { return false; }
    getBounds() { return this.bounds; }
    setBounds(bounds) { this.bounds = bounds; }
    setAlwaysOnTop() {}
    showInactive() {}
  }
  const manager = new NoteWindowManager({ BrowserWindow: FakeWindow, screen: { getAllDisplays: () => displays }, indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs' });
  manager.sync([note()]);
  assert.equal(manager.setBounds('note-1', { x: -9999, y: -9999, width: 200, height: 100 }).accepted, true);
  assert.deepEqual(created[0].getBounds(), { x: -1920, y: 0, width: 280, height: 210 });
  assert.equal(manager.setBounds('note-1', { x: Number.NaN, y: 0, width: 300, height: 220 }).accepted, false);
});

test('desktop activation keeps the renderer attached to Explorer across focus and blur',async()=>{
 const {EventEmitter}=require('node:events');let created=0,resolveHost;const requests=[];
 class Win extends EventEmitter{
  constructor(options){super();created++;this.bounds=options;this.webContents={setWindowOpenHandler(){},on(){},once(){},send(){}};}
  isDestroyed(){return false;}loadFile(){}getBounds(){return this.bounds;}setAlwaysOnTop(top){this.top=top;}moveTop(){this.raised=true;}
 }
 const manager=new NoteWindowManager({BrowserWindow:Win,screen:{getAllDisplays:()=>displays},indexPath:'/tmp/index.html',preloadPath:'/tmp/preload.cjs',desktopHost:(_w,options)=>{requests.push(options.promote);return new Promise(r=>resolveHost=r);}});
 manager.sync([note()]);const win=manager.windows.get('note-1');
 manager.activate('note-1');manager.setActive('note-1',false);manager.activate('note-1');
 assert.deepEqual(requests,[false]);resolveHost({attached:true});await new Promise(setImmediate);
 assert.equal(win.pindoPromoted,false);assert.equal(win.top,false);assert.equal(created,1);
 manager.setActive('note-1',false);manager.activate('note-1');
 assert.deepEqual(requests,[false]);assert.equal(win.raised,undefined);assert.equal(created,1);
});

test('a stale did-finish-load host result cannot reshow a note parked while attach was pending', async () => {
  const { EventEmitter } = require('node:events'); let resolveHost;
  class Win extends EventEmitter {
    constructor(options) { super(); this.bounds = options; this.webContents = { setWindowOpenHandler() {}, on() {}, once: (_event, callback) => { this.loaded = callback; }, send() {} }; }
    isDestroyed() { return false; } loadFile() {} getBounds() { return this.bounds; }
    setAlwaysOnTop(value) { this.top = value; } showInactive() { this.visible = true; } hide() { this.visible = false; }
  }
  const manager = new NoteWindowManager({ BrowserWindow: Win, screen: { getAllDisplays: () => displays }, indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs', desktopHost: () => new Promise(resolve => { resolveHost = resolve; }) });
  manager.sync([note()]); const win = manager.windows.get('note-1'); win.loaded();
  manager.sync([note({ mode: 'bookmark' })]);
  assert.equal(win.visible, false);
  resolveHost({ attached: true }); await new Promise(setImmediate);
  assert.equal(manager.modes.get('note-1'), 'bookmark');
  assert.equal(win.visible, false); assert.equal(win.top, false);
});

test('activation cannot promote a desktop note while a pending attach becomes parked', async () => {
  const { EventEmitter } = require('node:events'); const pending = [], requests = [];
  class Win extends EventEmitter {
    constructor(options) { super(); this.bounds = options; this.webContents = { setWindowOpenHandler() {}, on() {}, once: (_event, callback) => { this.loaded = callback; }, send() {} }; }
    isDestroyed() { return false; } loadFile() {} getBounds() { return this.bounds; }
    setAlwaysOnTop(value) { this.top = value; } showInactive() { this.visible = true; } hide() { this.visible = false; } moveTop() {}
  }
  const manager = new NoteWindowManager({ BrowserWindow: Win, screen: { getAllDisplays: () => displays }, indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs', desktopHost: (_win, options) => { requests.push(Boolean(options.promote)); return new Promise(resolve => pending.push(resolve)); } });
  manager.sync([note()]); const win = manager.windows.get('note-1'); win.loaded();
  assert.deepEqual(requests, [false]); manager.activate('note-1'); assert.deepEqual(requests, [false]);
  manager.sync([note({ mode: 'bookmark' })]); pending.shift()({ attached: true }); await new Promise(setImmediate);
  assert.equal(win.visible, false); assert.equal(win.top, false); assert.equal(win.pindoActive, false);
});

test('a Win+D minimize invalidates and reattaches the same desktop window without recreating it', async () => {
  const { EventEmitter } = require('node:events'); const pending = [], requests = []; let created = 0;
  class Win extends EventEmitter {
    constructor(options) { super(); created++; this.bounds = options; this.webContents = { setWindowOpenHandler() {}, on() {}, once: (_event, callback) => { this.loaded = callback; }, send() {} }; }
    isDestroyed() { return false; } loadFile() {} getBounds() { return this.bounds; }
    setAlwaysOnTop(value) { this.top = value; } showInactive() { this.visible = true; } hide() { this.visible = false; } moveTop() {}
  }
  const manager = new NoteWindowManager({ BrowserWindow: Win, screen: { getAllDisplays: () => displays }, indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs', desktopHost: (_win, options) => { requests.push(Boolean(options.promote)); return new Promise(resolve => pending.push(resolve)); } });
  manager.sync([note()]); const win = manager.windows.get('note-1'); win.loaded();
  pending.shift()({ attached: true }); await new Promise(setImmediate);
  win.emit('minimize'); assert.equal(requests.at(-1), false);
  pending.shift()({ attached: true }); await new Promise(setImmediate);
  assert.equal(win.pindoPromoted, false); assert.equal(win.visible, true); assert.equal(created, 1);
});

test('records native lifecycle messages without changing desktop window state', () => {
  const { EventEmitter } = require('node:events'); const events = [];
  class Win extends EventEmitter {
    constructor(options) {
      super(); this.bounds = options; this.hooks = new Map();
      this.webContents = { setWindowOpenHandler() {}, on() {}, once() {}, send() {}, invalidate: () => { this.invalidations = (this.invalidations || 0) + 1; } };
    }
    isDestroyed() { return false; } loadFile() {} getBounds() { return this.bounds; }
    setAlwaysOnTop(value) { this.top = value; } showInactive() { this.visible = true; }
    hookWindowMessage(message, callback) { this.hooks.set(message, callback); }
  }
  const manager = new NoteWindowManager({
    BrowserWindow: Win, screen: { getAllDisplays: () => displays },
    indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs',
    onDiagnostic: (event, detail) => events.push({ event, detail })
  });
  manager.sync([note()]); const win = manager.windows.get('note-1');
  win.hooks.get(0x0018)(Buffer.alloc(8), Buffer.alloc(8));
  const size = Buffer.alloc(8); size.writeBigUInt64LE(1n); win.hooks.get(0x0005)(size, Buffer.alloc(8));
  const lifecycle = events.filter(entry => entry.event === 'native-window-message');
  assert.deepEqual(lifecycle.map(entry => [entry.detail.reason, entry.detail.wParam]), [['wm-showwindow', 0], ['wm-size', 1]]);
  assert.equal(lifecycle[0].detail.lParam, 0);
  assert.equal(win.pindoPromoted, false); assert.equal(win.pindoActive, undefined);
  assert.equal(win.invalidations, undefined);
});

test('Show Desktop hide and restore repaints Chromium and its native child surface without host or visibility churn', () => {
  const { EventEmitter } = require('node:events'); const events = [], hostRequests = [], nativeRedraws = [];
  class Win extends EventEmitter {
    constructor(options) {
      super(); this.bounds = options; this.hooks = new Map();
      this.webContents = {
        setWindowOpenHandler() {}, on() {}, once: (_event, callback) => { this.loaded = callback; }, send() {},
        invalidate: () => { this.invalidations = (this.invalidations || 0) + 1; }
      };
    }
    isDestroyed() { return false; } loadFile() {} getBounds() { return this.bounds; }
    setAlwaysOnTop(value) { this.top = value; } showInactive() { this.visible = true; }
    hookWindowMessage(message, callback) { this.hooks.set(message, callback); }
  }
  const manager = new NoteWindowManager({
    BrowserWindow: Win, screen: { getAllDisplays: () => displays },
    indexPath: '/tmp/index.html', preloadPath: '/tmp/preload.cjs',
    desktopHost: async (_win, options) => { hostRequests.push(Boolean(options.promote)); return { attached: true }; },
    surfaceRecovery: { request: async win => { nativeRedraws.push(win.id); return { ok: true }; }, close() {} },
    onDiagnostic: (event, detail) => events.push({ event, detail })
  });
  manager.sync([note()]); const win = manager.windows.get('note-1'); win.loaded();
  return new Promise(setImmediate).then(() => {
    assert.deepEqual(hostRequests, [false]); assert.equal(win.visible, true);
    win.hooks.get(0x0018)(Buffer.alloc(8), Buffer.alloc(8));
    const shown = Buffer.alloc(8); shown.writeBigUInt64LE(1n);
    win.hooks.get(0x0018)(shown, Buffer.alloc(8));
    assert.equal(win.invalidations, 1);
    assert.deepEqual(nativeRedraws, [win.id]);
    assert.deepEqual(hostRequests, [false]); assert.equal(win.visible, true);
    assert.equal(events.filter(entry => entry.event === 'renderer-invalidated').length, 1);
    return new Promise(setImmediate).then(() => {
      assert.equal(events.filter(entry => entry.event === 'native-redraw-completed').length, 1);
    });
  });
});
