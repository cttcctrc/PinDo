const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

function redact(value) {
  const home = os.homedir().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (typeof value === 'string') return value
    .replace(new RegExp(home, 'gi'), '<USER>')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<EMAIL>')
    .replace(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, '<TOKEN>');
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]));
  return value;
}

function compatibilityPath(app) { return path.join(app.getPath('userData'), 'compatibility.json'); }
function readCompatibility(app) { try { return JSON.parse(fs.readFileSync(compatibilityPath(app), 'utf8')); } catch { return { enabled: false, uncleanStarts: 0, cleanExit: true }; } }
function writeCompatibility(app, value) { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(compatibilityPath(app), JSON.stringify(value), { mode: 0o600 }); }

function prepareCompatibility(app) {
  const state = readCompatibility(app);
  const uncleanStarts = state.cleanExit === false ? Number(state.uncleanStarts || 0) + 1 : 0;
  const autoEnabled = !state.enabled && uncleanStarts >= 2;
  const next = { ...state, enabled: Boolean(state.enabled || autoEnabled), autoEnabled, uncleanStarts, cleanExit: false, updatedAt: Date.now() };
  writeCompatibility(app, next);
  if (next.enabled) app.disableHardwareAcceleration();
  return next;
}

class Diagnostics {
  constructor({ app, screen, getStore, getWindows, compatibility }) {
    this.app = app; this.screen = screen; this.getStore = getStore; this.getWindows = getWindows; this.compatibility = compatibility;
    this.directory = path.join(app.getPath('userData'), 'diagnostics');
    fs.mkdirSync(this.directory, { recursive: true }); this.cleanup();
    process.on('uncaughtExceptionMonitor', error => this.record('uncaught-exception', { message: error.message, stack: error.stack }));
    process.on('unhandledRejection', error => this.record('unhandled-rejection', { message: error?.message || String(error), stack: error?.stack }));
  }
  cleanup() {
    const cutoff = Date.now() - 7 * 86400000;
    for (const name of fs.readdirSync(this.directory)) { const file = path.join(this.directory, name); try { if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file); } catch {} }
  }
  record(event, detail = {}) {
    const line = JSON.stringify(redact({ at: new Date().toISOString(), event, detail })) + '\n';
    try { fs.appendFileSync(path.join(this.directory, `${new Date().toISOString().slice(0, 10)}.jsonl`), line, { encoding: 'utf8', mode: 0o600 }); } catch {}
  }
  attachWindow(win, role) {
    if (!win || win.isDestroyed()) return;
    win.webContents.on('render-process-gone', (_event, detail) => this.record('render-process-gone', { role, reason: detail.reason, exitCode: detail.exitCode }));
    win.on('unresponsive', () => this.record('window-unresponsive', { role }));
  }
  async snapshot() {
    const state = this.getStore()?.state || {};
    const notes = Array.isArray(state.notes) ? state.notes.map(note => ({ type: note.type, mode: note.mode, width: note.w, height: note.h, locked: Boolean(note.locked), itemCount: Array.isArray(note.todos) ? note.todos.length : Array.isArray(note.events) ? note.events.length : Array.isArray(note.desktopItems) ? note.desktopItems.length : undefined })) : [];
    const displays = this.screen.getAllDisplays().map(display => ({ idHash: crypto.createHash('sha1').update(String(display.id)).digest('hex').slice(0, 8), bounds: display.bounds, workArea: display.workArea, scaleFactor: display.scaleFactor, rotation: display.rotation, internal: Boolean(display.internal) }));
    let gpu = {}; try { const info = await this.app.getGPUInfo('basic'); gpu = { gpuDevice: info.gpuDevice?.map(device => ({ active: device.active, vendorId: device.vendorId, deviceId: device.deviceId })), auxAttributes: info.auxAttributes }; } catch (error) { gpu = { error: error.message }; }
    const logs = [];
    for (const name of fs.readdirSync(this.directory).sort()) { try { logs.push(...fs.readFileSync(path.join(this.directory, name), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))); } catch {} }
    return redact({ generatedAt: new Date().toISOString(), privacy: 'No note text, email address, file path, screenshot or pet asset is included.', app: { name: this.app.getName(), version: this.app.getVersion(), packaged: this.app.isPackaged }, system: { platform: process.platform, arch: process.arch, osRelease: os.release(), osVersion: os.version(), electron: process.versions.electron, chrome: process.versions.chrome, locale: this.app.getLocale(), cpuCount: os.cpus().length, memoryGB: Math.round(os.totalmem() / 1073741824) }, compatibility: this.compatibility, displays, gpu, windowCount: this.getWindows().length, notes, logs });
  }
  setCompatibility(enabled) {
    this.compatibility = { ...this.compatibility, enabled: Boolean(enabled), autoEnabled: false, uncleanStarts: 0, updatedAt: Date.now() };
    writeCompatibility(this.app, this.compatibility); this.record('compatibility-changed', { enabled: Boolean(enabled) });
    return this.compatibility;
  }
  markCleanExit() { const current = readCompatibility(this.app); writeCompatibility(this.app, { ...current, cleanExit: true, uncleanStarts: 0, updatedAt: Date.now() }); }
}

module.exports = { Diagnostics, prepareCompatibility, readCompatibility, redact };
