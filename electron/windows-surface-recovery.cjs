const path = require('node:path');
const { spawn } = require('node:child_process');
const { nativeScript } = require('./native-paths.cjs');

function nativeHandle(window) {
  const handle = window?.getNativeWindowHandle?.();
  if (!Buffer.isBuffer(handle) || (handle.length !== 8 && handle.length !== 4)) return null;
  const value = handle.length === 8 ? handle.readBigUInt64LE() : BigInt(handle.readUInt32LE());
  return value === 0n || value > 0x7fffffffffffffffn ? null : value.toString();
}

class WindowsSurfaceRecovery {
  constructor({ platform = process.platform, systemRoot = process.env.SystemRoot || 'C:\\Windows', spawnProcess = spawn } = {}) {
    this.platform = platform; this.systemRoot = systemRoot; this.spawnProcess = spawnProcess;
    this.process = null; this.sequence = 0; this.pending = new Map(); this.stdout = '';
  }

  _finish(id, result) {
    const entry = this.pending.get(id);
    if (!entry) return;
    this.pending.delete(id); this.pending.delete(`handle:${entry.handle}`);
    entry.resolve(result);
  }

  _failAll(reason) {
    for (const [id, entry] of [...this.pending]) if (!String(id).startsWith('handle:')) this._finish(id, { ok: false, reason });
  }

  _line(line) {
    if (!line || line === 'ready') return;
    const [status, id, ...detail] = line.split('\t');
    if (status === 'ok') this._finish(id, { ok: true });
    else if (status === 'error') this._finish(id, { ok: false, reason: detail.join(' ').slice(0, 240) || 'Native redraw failed' });
  }

  _start() {
    if (this.process || this.platform !== 'win32') return this.process;
    const powershell = path.join(this.systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const helper = nativeScript('windows-surface-recovery.ps1');
    let child;
    try { child = this.spawnProcess(powershell, ['-NoProfile', '-NonInteractive', '-File', helper], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (error) { return { pindoStartError: String(error.message || error).slice(0, 240) }; }
    this.process = child;
    child.stdout?.setEncoding?.('utf8');
    child.stdout?.on?.('data', chunk => {
      this.stdout += chunk;
      const lines = this.stdout.split(/\r?\n/); this.stdout = lines.pop() || '';
      for (const line of lines) this._line(line);
    });
    child.on?.('error', error => { this._failAll(String(error.message || error).slice(0, 240)); if (this.process === child) this.process = null; });
    child.on?.('exit', code => { this._failAll(`Native redraw helper exited (${code ?? 'unknown'})`); if (this.process === child) this.process = null; });
    return child;
  }

  request(window) {
    if (this.platform !== 'win32') return Promise.resolve({ ok: false, reason: 'Windows only' });
    const handle = nativeHandle(window);
    if (!handle) return Promise.resolve({ ok: false, reason: 'Invalid Windows window handle' });
    const existing = this.pending.get(`handle:${handle}`);
    if (existing) return existing.promise;
    const child = this._start();
    if (child?.pindoStartError) return Promise.resolve({ ok: false, reason: child.pindoStartError });
    if (!child?.stdin?.writable) return Promise.resolve({ ok: false, reason: 'Native redraw helper is unavailable' });
    const id = String(++this.sequence);
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const entry = { handle, promise, resolve };
    this.pending.set(id, entry); this.pending.set(`handle:${handle}`, entry);
    try {
      child.stdin.write(`${id}\t${handle}\n`, error => {
        if (error) this._finish(id, { ok: false, reason: String(error.message || error).slice(0, 240) });
      });
    } catch (error) { this._finish(id, { ok: false, reason: String(error.message || error).slice(0, 240) }); }
    return promise;
  }

  close() {
    const child = this.process; this.process = null;
    this._failAll('Native redraw helper closed');
    if (!child) return;
    child.stdin?.end?.(); child.kill?.();
  }
}

module.exports = { WindowsSurfaceRecovery, nativeHandle };
