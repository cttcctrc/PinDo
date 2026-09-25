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
  assert.equal(created[0].visible, true);
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

test('activation reparents the same renderer and latest blur/focus wins after a slow host call',async()=>{
 const {EventEmitter}=require('node:events');let created=0,resolveHost;const requests=[];
 class Win extends EventEmitter{
  constructor(options){super();created++;this.bounds=options;this.webContents={setWindowOpenHandler(){},on(){},once(){},send(){}};}
  isDestroyed(){return false;}loadFile(){}getBounds(){return this.bounds;}setAlwaysOnTop(top){this.top=top;}moveTop(){this.raised=true;}
 }
 const manager=new NoteWindowManager({BrowserWindow:Win,screen:{getAllDisplays:()=>displays},indexPath:'/tmp/index.html',preloadPath:'/tmp/preload.cjs',desktopHost:(_w,options)=>{requests.push(options.promote);return new Promise(r=>resolveHost=r);}});
 manager.sync([note()]);const win=manager.windows.get('note-1');
 manager.activate('note-1');manager.setActive('note-1',false);manager.activate('note-1');
 assert.deepEqual(requests,[true]);resolveHost({attached:true});await new Promise(setImmediate);
 assert.equal(win.pindoPromoted,true);assert.equal(win.top,true);assert.equal(created,1);
 manager.setActive('note-1',false);assert.deepEqual(requests,[true,false]);resolveHost({attached:true});await new Promise(setImmediate);
 assert.equal(win.pindoPromoted,false);assert.equal(win.top,false);assert.equal(created,1);
});
