const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { WindowsSurfaceRecovery, nativeHandle } = require('./windows-surface-recovery.cjs');

function fakeWindow(value = 42n) {
  const handle = Buffer.alloc(8); handle.writeBigUInt64LE(value);
  return { getNativeWindowHandle: () => handle };
}

test('reads a Windows HWND without losing integer precision', () => {
  assert.equal(nativeHandle(fakeWindow(9007199254740993n)), '9007199254740993');
  assert.equal(nativeHandle(fakeWindow(0n)), null);
});

test('native recovery redraws the existing surface without visibility or host mutation', () => {
  const source = fs.readFileSync(path.join(__dirname, 'windows-surface-recovery.ps1'), 'utf8');
  assert.match(source, /RedrawWindow/); assert.match(source, /RDW_ALLCHILDREN/); assert.match(source, /RDW_NOERASE/);
  assert.doesNotMatch(source, /ShowWindow|SetParent|SetWindowPos/);
});

test('keeps one helper alive and coalesces an outstanding redraw per HWND', async () => {
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stdout.setEncoding = () => {};
  child.stdin = { writable: true, writes: [], write(value, done) { this.writes.push(value); done?.(); }, end() {} };
  child.kill = () => {};
  let spawns = 0;
  const recovery = new WindowsSurfaceRecovery({ platform: 'win32', systemRoot: 'C:\\Windows', spawnProcess: () => { spawns++; return child; } });
  const first = recovery.request(fakeWindow()), second = recovery.request(fakeWindow());
  assert.equal(first, second); assert.equal(spawns, 1); assert.deepEqual(child.stdin.writes, ['1\t42\n']);
  child.stdout.emit('data', 'ready\r\nok\t1\r\n');
  assert.deepEqual(await first, { ok: true });
  recovery.close();
});

test('reports helper failures without throwing into the window lifecycle', async () => {
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stdout.setEncoding = () => {};
  child.stdin = { writable: true, write(_value, done) { done?.(); }, end() {} }; child.kill = () => {};
  const recovery = new WindowsSurfaceRecovery({ platform: 'win32', spawnProcess: () => child });
  const result = recovery.request(fakeWindow()); child.stdout.emit('data', 'error\t1\taccess denied\n');
  assert.deepEqual(await result, { ok: false, reason: 'access denied' });
  recovery.close();
});
