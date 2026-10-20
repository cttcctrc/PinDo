const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DodoV2Controller, AssetStore, CanvasRenderer, MainPlayer, DRAG_TRANSITIONS, DRAG_ACTIVE_STATES } = require('../dist/dodo-v2-controller.cjs');
const root = path.join(__dirname, '..');
const runtimeRoot = path.join(root, 'dist/assets/dodo/v2');
const config = JSON.parse(fs.readFileSync(path.join(runtimeRoot, 'dodo_animation_state_machine.json'), 'utf8'));

test('the 22 states have 512px assets and no anchor or overlay dependencies', () => {
  assert.deepEqual([config.canvas.width, config.canvas.height], [512, 512]);
  assert.equal(Object.keys(config.states).length, 22);
  assert.equal(config.facial_overlays, undefined);
  const files = fs.readdirSync(runtimeRoot, { recursive: true }).filter(file => String(file).endsWith('.webp'));
  assert.equal(files.length, 22);
  for (const [state, spec] of Object.entries(config.states)) {
    assert.equal(spec.anchors, undefined, state);
    const bytes = fs.readFileSync(path.join(runtimeRoot, spec.asset));
    assert.ok(bytes.length > 1000, state);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', state);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', state);
  }
  assert.equal(config.states.drag_release_to_fall, undefined);
  assert.equal(config.states.fall_loop, undefined);
  assert.equal(config.events['drag.release'][0].to, 'fall_to_stand');
  const smoke = fs.readFileSync(path.join(root, 'electron/smoke-validation.cjs'), 'utf8');
  assert.doesNotMatch(smoke, /drag_release_to_fall|['"]fall_loop['"]/);
});

test('asset store fetches the animation without requesting a frame manifest', async () => {
  const urls = [];
  const oldDecoder = globalThis.ImageDecoder;
  globalThis.ImageDecoder = class { constructor() { this.tracks = { ready: Promise.resolve() }; } close() {} };
  try {
    const store = new AssetStore('/dodo', 2, async url => { urls.push(url); return { ok: true, arrayBuffer: async () => new ArrayBuffer(16) }; });
    const record = await store.load('assets/idle/dodo_sleep_loop.webp');
    assert.deepEqual(urls, ['/dodo/assets/idle/dodo_sleep_loop.webp']);
    assert.equal(record.manifest, null);
    store.close();
  } finally { globalThis.ImageDecoder = oldDecoder; }
});

test('player advances using embedded WebP durations on a 512px canvas', async () => {
  const frames = [];
  const store = { activate() {}, async load() { return { decoder: { tracks: { selectedTrack: { frameCount: 3 } }, async decode({ frameIndex }) { return { image: { duration: 10_000, close() {}, frameIndex } }; } } }; } };
  const renderer = new CanvasRenderer({ getContext: () => ({ clearRect() {}, drawImage(frame, x, y, w, h) { frames.push([frame.frameIndex, x, y, w, h]); } }) }, { dataset: {}, classList: { add() {}, remove() {} } });
  const player = new MainPlayer(store, renderer);
  await player.play('idle_stand', { asset: 'stand.webp', loop: true });
  await new Promise(resolve => setTimeout(resolve, 45));
  player.stop();
  assert.deepEqual(frames.slice(0, 3), [[0, 0, 0, 512, 512], [1, 0, 0, 512, 512], [2, 0, 0, 512, 512]]);
});

test('releasing during any drag transition starts landing immediately', async () => {
  assert.equal(Object.keys(DRAG_TRANSITIONS).length, 6);
  for (const state of DRAG_ACTIVE_STATES) {
    const fake = { state, pointerDown: true, timers: { set() {} }, land() { this.state = 'fall_to_stand'; return Promise.resolve(); } };
    await DodoV2Controller.prototype.releaseDrag.call(fake);
    assert.equal(fake.state, 'fall_to_stand', state);
    assert.equal(fake.pointerDown, false, state);
  }
});

test('landing completes into idle standing and fires the host callback', async () => {
  let landed = 0;
  const fake = { spec: state => config.states[state], enter(state, meta) { assert.equal(state, 'idle_stand'); meta.afterComplete?.(); return Promise.resolve(); } };
  await DodoV2Controller.prototype.onComplete.call(fake, 'fall_to_stand', { afterComplete: () => landed++ });
  assert.equal(landed, 1);
});

test('stale drag loading cannot replace the landing animation', async () => {
  let resolveDrag, resolveLanding;
  const make = key => ({ key, decoder: { tracks: { selectedTrack: { frameCount: 1 } }, async decode() { return { image: { duration: 1000000, close() {} } }; } } });
  const store = { activate() {}, load(asset) { return new Promise(resolve => { if (asset === 'drag') resolveDrag = () => resolve(make('drag')); else resolveLanding = () => resolve(make('landing')); }); } };
  const player = new MainPlayer(store, { setMain() {}, clear() {} });
  const drag = player.play('stand_to_drag', { asset: 'drag' });
  const landing = player.play('fall_to_stand', { asset: 'landing' });
  resolveLanding(); await landing; resolveDrag(); await drag;
  assert.equal(player.record.key, 'landing');
  player.stop();
});
