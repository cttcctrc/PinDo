const assert = require('node:assert/strict');
const test = require('node:test');
const { attachToWindowsDesktop } = require('./windows-desktop-host.cjs');

test('desktop attachment is never attempted on another OS', async () => {
  const result = await attachToWindowsDesktop({}, { platform: 'linux', run: () => { throw Error('should not run'); } });
  assert.equal(result.attached, false);
});

test('passes a decimal native window handle without running arbitrary shell commands', async () => {
  let args;
  const window = { isDestroyed: () => false, getNativeWindowHandle: () => { const buffer = Buffer.alloc(8); buffer.writeBigUInt64LE(4212345678n); return buffer; } };
  const result = await attachToWindowsDesktop(window, {
    platform: 'win32', systemRoot: 'C:\\Windows',
    run: async (file, argv) => { args = { file, argv }; return { stdout: 'desktop-attached\n' }; }
  });
  assert.equal(result.attached, true);
  assert.equal(args.argv.at(-2), '4212345678');
  assert.ok(args.argv.includes('-NoProfile'));
  assert.ok(args.argv.includes('-File'));
});

test('reports Explorer or policy failures explicitly instead of silently claiming success', async () => {
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64LE(42n);
  const result = await attachToWindowsDesktop({ isDestroyed: () => false, getNativeWindowHandle: () => buffer }, {
    platform: 'win32', run: async () => { const error = Error('failed'); error.stderr = 'Explorer desktop icon host was not found.'; throw error; }
  });
  assert.equal(result.attached, false);
  assert.match(result.reason, /Explorer desktop/);
});
