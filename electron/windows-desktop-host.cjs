const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const run = promisify(execFile);

async function attachToWindowsDesktop(window, options = {}) {
  if ((options.platform || process.platform) !== 'win32') return { attached: false, reason: 'Windows only' };
  if (!window || window.isDestroyed()) return { attached: false, reason: 'Note window is closed' };
  const handle = window.getNativeWindowHandle();
  if (!Buffer.isBuffer(handle) || (handle.length !== 8 && handle.length !== 4)) return { attached: false, reason: 'Invalid Windows window handle' };
  const value = handle.length === 8 ? handle.readBigUInt64LE() : BigInt(handle.readUInt32LE());
  if (value === 0n) return { attached: false, reason: 'Missing Windows window handle' };
  const root = options.systemRoot || process.env.SystemRoot || 'C:\\Windows';
  const powershell = path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const helper = require('./native-paths.cjs').nativeScript('windows-desktop-host.ps1');
  try {
    const { stdout } = await (options.run || run)(powershell, ['-NoProfile', '-NonInteractive', '-File', helper, value.toString(), options.promote ? 'top' : 'desktop'], { timeout: 6000, windowsHide: true });
    return { attached: stdout.includes('desktop-attached'), reason: stdout.includes('desktop-attached') ? null : 'Desktop host did not confirm attachment' };
  } catch (error) {
    return { attached: false, reason: String(error.stderr || error.message || error).slice(0, 400) };
  }
}

module.exports = { attachToWindowsDesktop };
