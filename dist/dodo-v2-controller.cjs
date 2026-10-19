(function (root) {
  "use strict";

  const DRAG_TRANSITIONS = Object.freeze({
    idle_stand: "stand_to_drag",
    idle_sit: "sit_to_drag",
    doze_loop: "doze_to_drag",
    sleep_loop: "sleep_to_drag",
    disappointed: "disappointed_to_drag",
    melt_loop: "melt_to_drag"
  });
  const DRAG_ACTIVE_STATES = new Set([...Object.values(DRAG_TRANSITIONS), "drag_hold"]);
  const OVERLAY_STATES = new Set(["idle_stand", "idle_sit"]);
  // P0 recovery policy: facial overlays remain packaged for a later, isolated
  // optimization pass, but are deliberately disconnected from this runtime.
  const FACIAL_OVERLAYS_ENABLED = false;

  const between = (random, min, max) => min + random() * (max - min);
  const sitBranch = random => random() < .35 ? "sit_to_doze" : "sit_to_stand";
  const manifestFrames = manifest => manifest?.frames || manifest?.anchors || [];
  const anchorFrameAt = (manifest, elapsedMs, fallbackIndex = 0) => {
    const frames = manifestFrames(manifest);
    if (!frames.length) return null;
    let found = frames[Math.min(fallbackIndex, frames.length - 1)];
    for (const frame of frames) {
      if ((frame.time_ms || 0) > elapsedMs) break;
      found = frame;
    }
    return found;
  };

  class PausableTimers {
    constructor(now = () => performance.now()) { this.now = now; this.items = new Map(); this.paused = false; }
    set(name, delay, callback) {
      this.clear(name);
      const item = { callback, remaining: Math.max(0, delay), deadline: this.now() + Math.max(0, delay), id: 0 };
      this.items.set(name, item);
      if (!this.paused) item.id = setTimeout(() => this.fire(name, item), item.remaining);
      return item;
    }
    fire(name, item) { if (this.items.get(name) !== item) return; this.items.delete(name); item.callback(); }
    clear(name) { const item = this.items.get(name); if (item?.id) clearTimeout(item.id); this.items.delete(name); }
    clearAll() { for (const name of [...this.items.keys()]) this.clear(name); }
    pause() {
      if (this.paused) return; this.paused = true;
      const now = this.now();
      for (const item of this.items.values()) { if (item.id) clearTimeout(item.id); item.id = 0; item.remaining = Math.max(0, item.deadline - now); }
    }
    resume() {
      if (!this.paused) return; this.paused = false;
      const now = this.now();
      for (const [name, item] of this.items) { item.deadline = now + item.remaining; item.id = setTimeout(() => this.fire(name, item), item.remaining); }
    }
  }

  class AssetStore {
    constructor(baseUrl, limit = 2, fetcher = fetch) {
      this.baseUrl = baseUrl.replace(/\/$/, ""); this.limit = limit; this.fetcher = fetcher;
      this.records = new Map(); this.peakBytes = 0;
    }
    url(path) { return `${this.baseUrl}/${String(path).replace(/^\.\//, "")}`; }
    async load(assetPath, manifestPath) {
      const key = `${assetPath}|${manifestPath}`;
      if (this.records.has(key)) { const record = this.records.get(key); record.usedAt = performance.now(); return record; }
      if (!("ImageDecoder" in root)) throw new Error("Animated WebP requires the ImageDecoder API");
      const request = this.fetcher.bind(root);
      const [assetResponse, manifestResponse] = await Promise.all([request(this.url(assetPath)), request(this.url(manifestPath))]);
      if (!assetResponse.ok || !manifestResponse.ok) throw new Error(`Dodo asset unavailable: ${assetPath}`);
      const [data, manifest] = await Promise.all([assetResponse.arrayBuffer(), manifestResponse.json()]);
      const decoder = new root.ImageDecoder({ data, type: "image/webp", preferAnimation: true });
      await decoder.tracks.ready;
      const record = { key, assetPath, manifestPath, data, manifest, decoder, usedAt: performance.now(), bytes: data.byteLength };
      this.records.set(key, record); this.trim(new Set([key])); this.updatePeak(); return record;
    }
    trim(keep = new Set()) {
      const candidates = [...this.records.values()].filter(item => !keep.has(item.key)).sort((a, b) => a.usedAt - b.usedAt);
      while (this.records.size > this.limit && candidates.length) {
        const record = candidates.shift(); record.decoder.close?.(); this.records.delete(record.key);
      }
    }
    releaseExcept(keys) { this.trim(new Set(keys)); }
    updatePeak() { this.peakBytes = Math.max(this.peakBytes, [...this.records.values()].reduce((sum, item) => sum + item.bytes, 0)); }
    stats() { return { loadedAssets: this.records.size, compressedBytes: [...this.records.values()].reduce((s, r) => s + r.bytes, 0), peakCompressedBytes: this.peakBytes }; }
    close() { for (const item of this.records.values()) item.decoder.close?.(); this.records.clear(); }
  }

  class CanvasRenderer {
    constructor(canvas, hostElement) {
      this.canvas = canvas; this.hostElement = hostElement; this.context = canvas.getContext("2d", { alpha: true });
      this.canvas.width = 1024; this.canvas.height = 1024;
      this.main = null; this.overlays = new Map(); this.grabTarget = null; this.drawOffset = { x: 0, y: 0 };
    }
    setMain(frame, anchor, state) { this.main = { frame, anchor, state }; this.hostElement.dataset.animation = state; this.draw(); }
    setOverlay(name, value) { if (value) this.overlays.set(name, value); else this.overlays.delete(name); this.draw(); }
    clearOverlays() { if (!this.overlays.size) return; this.overlays.clear(); this.draw(); }
    setGrabTarget(point) { this.grabTarget = point; this.draw(); }
    clearGrabTarget() {
      const changed = this.grabTarget || this.drawOffset.x || this.drawOffset.y;
      this.grabTarget = null; this.drawOffset = { x: 0, y: 0 };
      if (changed) this.draw();
    }
    currentAnchor(name) { return this.main?.anchor?.[name] || null; }
    draw() {
      const ctx = this.context; ctx.clearRect(0, 0, 1024, 1024);
      if (!this.main?.frame) return;
      const grab = this.main.anchor?.grab_anchor;
      this.drawOffset = this.grabTarget && grab ? { x: this.grabTarget.x - grab[0], y: this.grabTarget.y - grab[1] } : { x: 0, y: 0 };
      ctx.save(); ctx.translate(this.drawOffset.x, this.drawOffset.y); ctx.drawImage(this.main.frame, 0, 0, 1024, 1024); ctx.restore();
      for (const overlay of this.overlays.values()) this.drawOverlay(overlay);
      this.hostElement.classList.add("dodo-ready");
    }
    drawOverlay({ frame, anchorName, pivot }) {
      const anchor = this.main?.anchor?.[anchorName]; if (!anchor || !frame) return;
      const face = this.main.anchor.face_transform || { scale: 1, rotation_deg: 0 };
      const ctx = this.context; ctx.save();
      ctx.translate(anchor[0] + this.drawOffset.x, anchor[1] + this.drawOffset.y);
      ctx.rotate((Number(face.rotation_deg) || 0) * Math.PI / 180);
      ctx.scale(Number(face.scale) || 1, Number(face.scale) || 1);
      ctx.drawImage(frame, -pivot[0], -pivot[1]); ctx.restore();
    }
    clear() { this.main = null; this.overlays.clear(); this.context.clearRect(0, 0, 1024, 1024); this.hostElement.classList.remove("dodo-ready"); }
  }

  class MainPlayer {
    constructor(store, renderer, now = () => performance.now()) {
      this.store = store; this.renderer = renderer; this.now = now; this.token = 0; this.timer = 0;
      this.currentFrame = null; this.record = null; this.state = ""; this.frameIndex = 0; this.elapsedMs = 0;
      this.paused = false; this.remaining = 0; this.deadline = 0; this.onFrame = null; this.nextAction = "decode";
    }
    async play(state, spec, options = {}) {
      this.stop(false); const token = ++this.token; this.state = state; this.frameIndex = 0; this.elapsedMs = 0;
      this.onFrame = options.onFrame || null; this.onError = options.onError || null; this.record = await this.store.load(spec.asset, spec.anchors);
      if (token !== this.token) return false;
      this.loop = Boolean(spec.loop); this.safeExitFrame = spec.safe_exit_frame ?? 0; this.onComplete = options.onComplete || null;
      this.requestedExit = null; await this.decodeAndShow(token); return true;
    }
    async decodeAndShow(token) {
      if (token !== this.token || !this.record) return;
      const count = this.record.decoder.tracks.selectedTrack.frameCount;
      const index = Math.min(this.frameIndex, Math.max(0, count - 1));
      let result;
      try {
        result = await this.record.decoder.decode({ frameIndex: index, completeFramesOnly: true });
      } catch (error) {
        if (token === this.token) this.onError?.(error, { state: this.state, frame: index });
        return;
      }
      if (token !== this.token) { result.image.close(); return; }
      this.currentFrame?.close?.(); this.currentFrame = result.image;
      const manifestFrame = manifestFrames(this.record.manifest)[index];
      const durationMs = Math.max(1, Number(result.image.duration || 0) / 1000 || Number(manifestFrame?.duration_ms) || Number(this.record.manifest.timeline?.frame_duration_ms) || 56);
      const anchor = anchorFrameAt(this.record.manifest, this.elapsedMs, index);
      this.renderer.setMain(this.currentFrame, anchor, this.state); this.onFrame?.({ state: this.state, frame: index, anchor, elapsedMs: this.elapsedMs, durationMs });
      if (this.requestedExit && index === this.safeExitFrame) { const done = this.requestedExit; this.requestedExit = null; this.stop(false); done(); return; }
      const next = index + 1;
      if (next >= count && !this.loop) {
        this.remaining = durationMs; this.deadline = this.now() + durationMs; this.nextAction = "complete";
        this.timer = setTimeout(() => this.finish(token), durationMs); return;
      }
      this.frameIndex = next >= count ? 0 : next; this.elapsedMs = next >= count ? 0 : this.elapsedMs + durationMs;
      this.remaining = durationMs; this.deadline = this.now() + durationMs; this.nextAction = "decode";
      if (!this.paused) this.timer = setTimeout(() => this.decodeAndShow(token), durationMs);
    }
    finish(token) { if (token !== this.token) return; const complete = this.onComplete; this.onComplete = null; complete?.(); }
    exitAtSafeFrame(callback) { if (!this.loop || this.frameIndex === this.safeExitFrame) { callback(); return; } this.requestedExit = callback; }
    pause() { if (this.paused) return; this.paused = true; if (this.timer) clearTimeout(this.timer); this.timer = 0; this.remaining = Math.max(0, this.deadline - this.now()); }
    resume() { if (!this.paused) return; this.paused = false; const token = this.token; this.deadline = this.now() + this.remaining; this.timer = setTimeout(() => this.nextAction === "complete" ? this.finish(token) : this.decodeAndShow(token), this.remaining); }
    stop(clear = true) { if (this.timer) clearTimeout(this.timer); this.timer = 0; this.requestedExit = null; this.onComplete = null; this.onFrame = null; this.onError = null; ++this.token; this.currentFrame?.close?.(); this.currentFrame = null; this.record = null; if (clear) this.renderer.clear(); }
  }

  class OverlayPlayer {
    constructor(store, renderer, now = () => performance.now()) { this.store = store; this.renderer = renderer; this.now = now; this.token = 0; this.timer = 0; this.frames = []; this.paused = false; this.remaining = 0; this.deadline = 0; this.next = null; }
    async play(name, parts, onComplete) {
      this.stop(); const token = ++this.token;
      const loaded = await Promise.all(parts.map(part => this.store.load(part.asset, part.manifest)));
      if (token !== this.token) return;
      const count = Math.min(...loaded.map(record => record.decoder.tracks.selectedTrack.frameCount)); let index = 0;
      const step = async () => {
        if (token !== this.token) return;
        const decoded = await Promise.all(loaded.map(record => record.decoder.decode({ frameIndex: index, completeFramesOnly: true })));
        if (token !== this.token) { decoded.forEach(item => item.image.close()); return; }
        this.frames.forEach(frame => frame.close?.()); this.frames = decoded.map(item => item.image);
        parts.forEach((part, i) => this.renderer.setOverlay(part.key, { frame: this.frames[i], anchorName: part.anchorName, pivot: loaded[i].manifest.pivot || [64, 64] }));
        const duration = Math.max(1, Number(this.frames[0].duration || 0) / 1000 || loaded[0].manifest.frames?.[index]?.duration_ms || 56);
        index += 1;
        this.next = index >= count ? () => { if (token === this.token) { this.stop(); onComplete?.(); } } : step;
        this.remaining = duration; this.deadline = this.now() + duration;
        if (!this.paused) this.timer = setTimeout(this.next, duration);
      };
      step();
    }
    pause() { if (this.paused) return; this.paused = true; if (this.timer) clearTimeout(this.timer); this.timer = 0; this.remaining = Math.max(0, this.deadline - this.now()); }
    resume() { if (!this.paused) return; this.paused = false; if (this.next) { this.deadline = this.now() + this.remaining; this.timer = setTimeout(this.next, this.remaining); } }
    stop() { if (this.timer) clearTimeout(this.timer); this.timer = 0; ++this.token; this.next = null; this.frames.forEach(frame => frame.close?.()); this.frames = []; this.renderer.clearOverlays(); }
  }

  class DodoV2Controller {
    constructor(options) {
      this.options = options; this.random = options.random || Math.random; this.now = options.now || (() => Date.now());
      this.timers = new PausableTimers(); this.state = "idle_stand"; this.config = null; this.pointerDown = false;
      this.standGuardUntil = 0; this.sitDecisionTaken = false;
      this.disappointedCooldownUntil = 0; this.meltCooldownUntil = 0;
      this.overlayKind = "";
      this.renderer = new CanvasRenderer(options.canvas, options.hostElement);
      this.store = new AssetStore(options.assetBase, 2, options.fetcher || fetch);
      this.player = new MainPlayer(this.store, this.renderer);
      this.diagnostics = { startedAt: performance.now(), firstFrameAt: 0, transitions: [], landings: 0, drags: 0, renderedFrames: 0, playbackError: null };
    }
    async start() {
      const response = await (this.options.fetcher || fetch)(this.options.configUrl); if (!response.ok) throw new Error("Dodo V2 state machine unavailable");
      this.config = await response.json(); await this.enter("idle_stand", { reason: "app.show" });
      this.diagnostics.firstFrameAt = performance.now(); this.publishDiagnostics();
    }
    publishDiagnostics() {
      const stores = [this.store.stats()];
      const compressed = stores.reduce((sum, item) => sum + item.compressedBytes, 0);
      const peak = stores.reduce((sum, item) => sum + item.peakCompressedBytes, 0);
      root.__pindoDodoV2Diagnostics = { ...this.diagnostics, state: this.state, frameIndex: this.player.frameIndex, overlay: null, facialOverlaysEnabled: FACIAL_OVERLAYS_ENABLED, startupMs: this.diagnostics.firstFrameAt ? this.diagnostics.firstFrameAt - this.diagnostics.startedAt : null, loadedCompressedBytes: compressed, peakCompressedBytes: peak, decodedFrameEstimateBytes: this.renderer.main?.frame ? 1024 * 1024 * 4 : 0 };
    }
    spec(state) { return this.config.states[state]; }
    async enter(state, meta = {}) {
      const spec = this.spec(state); if (!spec) throw new Error(`Unknown Dodo state: ${state}`);
      this.timers.clearAll(); this.stopOverlay();
      const previous = this.state; this.state = state; this.options.hostElement.dataset.dodoV2State = state;
      this.diagnostics.transitions.push({ from: previous, to: state, reason: meta.reason || "transition", at: Date.now() });
      if (this.diagnostics.transitions.length > 120) this.diagnostics.transitions.shift();
      const nextState = spec.next || spec.default_next || null;
      await this.player.play(state, spec, { onFrame: detail => this.onFrame(detail, meta), onComplete: () => this.onComplete(state, meta), onError: (error, detail) => this.onPlaybackError(error, detail) });
      if (nextState) this.store.load(this.spec(nextState).asset, this.spec(nextState).anchors).catch(() => {});
      if (state === "idle_stand") this.scheduleStand();
      if (state === "idle_sit") this.scheduleSitBranch();
      if (state === "doze_loop") this.scheduleDoze();
      if (state === "melt_loop") this.timers.set("melt-recover", this.config.config_defaults_ms.melt_max_display, () => this.recover());
      this.publishDiagnostics();
    }
    onFrame(detail, meta) {
      this.diagnostics.renderedFrames += 1;
      this.diagnostics.playbackError = null;
      if (this.state === "disappointed" && meta.melt && detail.frame >= (this.spec("disappointed").melt_branch_frame || 19)) this.enter("disappointed_to_melt", { reason: "emotion.melt_branch" });
      this.options.onFrame?.(detail); this.publishDiagnostics();
    }
    onPlaybackError(error, detail) {
      this.diagnostics.playbackError = { message: String(error?.message || error), state: detail.state, frame: detail.frame, at: Date.now() };
      this.publishDiagnostics(); this.options.onPlaybackError?.(error, detail);
    }
    onComplete(state, meta) {
      if (state === "disappointed") { if (!meta.melt) this.enter("idle_stand", { reason: "emotion.complete", guard: true }); return; }
      const next = this.spec(state).next;
      if (!next) return;
      if (state === "drag_release_to_fall") {
        const falling = this.enter("fall_loop", { reason: "drag.visual_fall" });
        this.timers.set("fall-load-watchdog", 5000, () => { if (this.state === "fall_loop") this.enter("idle_stand", { reason: "drag.fall_watchdog", guard: true }); });
        falling.then(() => { this.timers.clear("fall-load-watchdog"); if (this.state === "fall_loop") this.startVisualFall(); })
          .catch(() => { if (this.state === "fall_loop") this.enter("idle_stand", { reason: "drag.fall_error", guard: true }); });
        return;
      }
      const guard = Boolean(this.spec(state).starts_stand_guard);
      this.enter(next, { reason: `${state}.complete`, guard }).then(() => meta.afterComplete?.());
    }
    scheduleStand() {
      if (this.options.isIdleBlocked?.()) { this.timers.set("stand", 1000, () => this.scheduleStand()); return; }
      const wait = Math.max(this.config.config_defaults_ms.stand_before_sit, this.standGuardUntil - this.now());
      this.timers.set("stand", wait, () => {
        if (this.now() < this.standGuardUntil || this.options.isIdleBlocked?.()) { this.scheduleStand(); return; }
        this.enter("stand_to_sit", { reason: "idle.stand_timeout" });
      });
    }
    scheduleSitBranch() {
      this.sitDecisionTaken = false;
      const delay = between(this.random, this.config.config_defaults_ms.sit_branch_min, this.config.config_defaults_ms.sit_branch_max);
      this.timers.set("sit-branch", delay, () => {
        if (this.sitDecisionTaken) return; this.sitDecisionTaken = true;
        if (this.options.isIdleBlocked?.()) { this.sitDecisionTaken = false; this.timers.set("sit-branch", 1000, () => this.evaluateSitBranch()); return; }
        const next = this.random() < this.config.probabilities.sit_to_doze_once_per_sit_session ? "sit_to_doze" : "sit_to_stand";
        this.enter(next, { reason: "idle.sit_branch", guard: true });
      });
    }
    evaluateSitBranch() {
      if (this.state !== "idle_sit" || this.sitDecisionTaken) return;
      if (this.options.isIdleBlocked?.()) { this.timers.set("sit-branch", 1000, () => this.evaluateSitBranch()); return; }
      this.sitDecisionTaken = true;
      const next = this.random() < this.config.probabilities.sit_to_doze_once_per_sit_session ? "sit_to_doze" : "sit_to_stand";
      this.enter(next, { reason: "idle.sit_branch", guard: true });
    }
    scheduleDoze() {
      this.timers.set("doze", this.config.config_defaults_ms.doze_before_sleep, () => {
        if (this.pointerDown || this.options.hasUpcomingReminder?.()) { this.scheduleDoze(); return; }
        this.enter("doze_to_sleep", { reason: "idle.doze_timeout" });
      });
    }
    scheduleOverlays() { return false; }
    scheduleBlink() { return false; }
    scheduleMouth() { return false; }
    playBlink() { return false; }
    playMouth() { return false; }
    stopOverlay() { this.overlayKind = ""; this.renderer.clearOverlays(); }
    pointer(value) { this.pointerDown = Boolean(value); }
    interact() { if (this.state === "doze_loop" || this.state === "sleep_loop") this.wake(); else if (this.state === "idle_stand") this.scheduleStand(); }
    wake() {
      if (this.state === "doze_loop") return this.enter("doze_to_stand", { reason: "wake", guard: true });
      if (this.state === "sleep_loop") return this.enter("sleep_to_stand", { reason: "wake", guard: true });
      if (this.state === "idle_stand") this.scheduleStand();
    }
    disappointed(payload = {}) {
      const now = this.now(); if (this.state !== "idle_stand" || now < this.disappointedCooldownUntil) return false;
      const requestedMelt = payload.melt === true || payload.severity === "high";
      const melt = requestedMelt && now >= this.meltCooldownUntil;
      this.disappointedCooldownUntil = now + this.config.config_defaults_ms.disappointed_cooldown;
      if (melt) this.meltCooldownUntil = now + this.config.config_defaults_ms.melt_cooldown;
      return this.enter("disappointed", { reason: "emotion.disappointed", melt });
    }
    recover() { if (this.state === "melt_loop") return this.enter("melt_to_stand", { reason: "emotion.recover", guard: true }); }
    startDrag() {
      const transition = DRAG_TRANSITIONS[this.state]; if (!transition) return false;
      this.pointerDown = true; this.stopOverlay(); this.diagnostics.drags += 1;
      this.enter(transition, { reason: "drag.start" }).catch(() => {
        if (DRAG_ACTIVE_STATES.has(this.state)) this.enter("drag_hold", { reason: "drag.enter_error" });
      });
      this.timers.set("drag-enter-watchdog", 5000, () => {
        if (DRAG_ACTIVE_STATES.has(this.state)) this.enter("drag_hold", { reason: "drag.enter_watchdog" });
      });
      return true;
    }
    releaseDrag() {
      this.pointerDown = false; this.renderer.clearGrabTarget();
      if (!DRAG_ACTIVE_STATES.has(this.state)) return false;
      const released = this.enter("drag_release_to_fall", { reason: "drag.release" });
      this.timers.set("drag-release-watchdog", 6000, () => {
        if (DRAG_ACTIVE_STATES.has(this.state) || ["drag_release_to_fall", "fall_loop", "fall_to_stand"].includes(this.state)) {
          this.enter("idle_stand", { reason: "drag.release_watchdog", guard: true });
        }
      });
      return released;
    }
    startVisualFall() {
      const frames = manifestFrames(this.player.record?.manifest);
      const duration = Math.max(120, frames.reduce((sum, frame) => sum + Math.max(1, Number(frame.duration_ms) || 0), 0));
      this.timers.set("visual-fall", duration, () => { if (this.state === "fall_loop") this.land(); });
    }
    land() { this.diagnostics.landings += 1; this.enter("fall_to_stand", { reason: "drag.visual_land", guard: true, afterComplete: () => this.options.onLanded?.() }); }
    applyGuard() { this.standGuardUntil = this.now() + this.config.config_defaults_ms.landing_stand_guard; }
    pause() { this.timers.pause(); this.player.pause(); }
    resume() { this.timers.resume(); this.player.resume(); }
    destroy() { this.timers.clearAll(); this.player.stop(); this.store.close(); }
  }

  const originalEnter = DodoV2Controller.prototype.enter;
  DodoV2Controller.prototype.enter = async function (state, meta = {}) {
    if (meta.guard) this.applyGuard();
    return originalEnter.call(this, state, meta);
  };

  const api = { DodoV2Controller, PausableTimers, AssetStore, CanvasRenderer, MainPlayer, anchorFrameAt, manifestFrames, between, sitBranch, DRAG_TRANSITIONS, DRAG_ACTIVE_STATES, OVERLAY_STATES, FACIAL_OVERLAYS_ENABLED };
  root.PinDoDodoV2 = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
