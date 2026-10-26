const path = require('node:path');
const { fileURLToPath } = require('node:url');

function canonicalFile(value, platform = process.platform) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'file:') return null;
    const filename = fileURLToPath(url);
    if (platform !== 'win32') return path.resolve(filename);
    const windowsPath = /^\/[a-z]:\//i.test(filename) ? filename.slice(1) : filename;
    return path.win32.resolve(windowsPath).toLowerCase();
  } catch { return null; }
}

/** Trust only the expected WebContents main frame loaded from the packaged file. */
function trustedFileSender(event, webContents, expectedFile, platform = process.platform) {
  if (!event?.sender || !webContents || event.sender !== webContents) return false;
  const frame = event.senderFrame;
  if (!frame || (event.sender.mainFrame && frame !== event.sender.mainFrame)) return false;
  const actual = canonicalFile(frame.url, platform);
  const expected = platform === 'win32' ? path.win32.resolve(expectedFile).toLowerCase() : path.resolve(expectedFile);
  return actual !== null && actual === expected;
}

module.exports = { canonicalFile, trustedFileSender };
