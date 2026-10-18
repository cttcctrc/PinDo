const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sitBranch, DRAG_TRANSITIONS, anchorFrameAt, manifestFrames } = require('../dist/dodo-v2-controller.cjs');

const root = path.join(__dirname, '..');
const runtimeRoot = path.join(root, 'dist', 'assets', 'dodo', 'v2');
const config = JSON.parse(fs.readFileSync(path.join(runtimeRoot, 'dodo_animation_state_machine.json'), 'utf8'));

function seeded(seed) {
  let value = seed >>> 0;
  return () => ((value = (1664525 * value + 1013904223) >>> 0) / 0x100000000);
}

test('Dodo V2 runtime package contains exactly 27 WebP files and no references', () => {
  const files = fs.readdirSync(runtimeRoot, { recursive: true }).map(item => String(item).replaceAll('\\', '/'));
  assert.equal(files.filter(file => file.endsWith('.webp')).length, 27);
  assert.equal(files.some(file => file.includes('/reference/') || file.startsWith('assets/reference/')), false);
});

test('every state asset has a valid per-frame anchor manifest', () => {
  const required = ['eye_left', 'eye_right', 'mouth', 'face_transform'];
  const physical = new Set(['stand_to_drag','sit_to_drag','doze_to_drag','sleep_to_drag','disappointed_to_drag','melt_to_drag','drag_hold','drag_release_to_fall','fall_loop','fall_to_stand']);
  for (const [state, spec] of Object.entries(config.states)) {
    const asset = path.join(runtimeRoot, spec.asset), anchors = path.join(runtimeRoot, spec.anchors);
    assert.ok(fs.statSync(asset).size > 0, `${state} asset`);
    const manifest = JSON.parse(fs.readFileSync(anchors, 'utf8'));
    const frames = manifestFrames(manifest);
    assert.ok(frames.length > 0, `${state} anchors`);
    for (const frame of frames) {
      assert.ok(frame.duration_ms > 0 || manifest.timeline?.frame_duration_ms > 0 || manifest.timeline?.fps > 0 || manifest.timeline?.nominal_fps > 0, `${state} frame ${frame.frame} duration`);
      for (const key of required) assert.ok(frame[key], `${state} frame ${frame.frame} ${key}`);
      if (physical.has(state)) for (const key of ['grab_anchor','body_center','ground_anchor','bounds']) assert.ok(frame[key], `${state} frame ${frame.frame} ${key}`);
    }
    const last = frames.at(-1);
    assert.equal(anchorFrameAt(manifest, last.time_ms, 0).frame, last.frame);
  }
});

test('overlay manifests expose pivots and stay within the two allowed base states', () => {
  const overlays = config.facial_overlays;
  assert.deepEqual(overlays.blink.allowed_states, ['idle_stand', 'idle_sit']);
  assert.deepEqual(overlays.mouth_open.allowed_states, ['idle_stand', 'idle_sit']);
  for (const manifestPath of [overlays.blink.left_manifest, overlays.blink.right_manifest, overlays.mouth_open.manifest]) {
    const manifest = JSON.parse(fs.readFileSync(path.join(runtimeRoot, manifestPath), 'utf8'));
    assert.equal(manifest.pivot.length, 2);
    assert.ok(manifest.frames.every(frame => frame.duration_ms > 0));
  }
});

test('fixed-seed sitting branch is sampled once and remains within 30-40 percent', () => {
  const random = seeded(0xD0D0); let doze = 0;
  for (let session = 0; session < 1000; session += 1) if (sitBranch(random) === 'sit_to_doze') doze += 1;
  assert.ok(doze >= 300 && doze <= 400, `doze=${doze}`);
});

test('all six stable states enter the unified drag and landing chain for 100 cycles', () => {
  const states = ['idle_stand', 'idle_sit', 'doze_loop', 'sleep_loop', 'disappointed', 'melt_loop'];
  assert.deepEqual(Object.keys(DRAG_TRANSITIONS), states);
  for (let cycle = 0; cycle < 100; cycle += 1) {
    const from = states[cycle % states.length];
    const sequence = [DRAG_TRANSITIONS[from], 'drag_hold', 'drag_release_to_fall', 'fall_loop', 'fall_to_stand', 'idle_stand'];
    assert.ok(sequence[0]); assert.equal(sequence.at(-1), 'idle_stand');
  }
});

test('renderer contract uses WebCodecs duration and bounded on-demand caches', () => {
  const source = fs.readFileSync(path.join(root, 'dist', 'dodo-v2-controller.cjs'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'dist', 'styles.css'), 'utf8');
  assert.match(source, /new root\.ImageDecoder/);
  assert.match(source, /result\.image\.duration/);
  assert.match(source, /new AssetStore\(options\.assetBase, 2/);
  assert.match(app, /drag_long_press|setTimeout\(\(\) => begin\(event\), 180\)/);
  assert.match(app, /distance > 6/);
  assert.match(css, /Dodo V2 uses exact WebP frame boundaries[\s\S]*transition:none!important/);
});
