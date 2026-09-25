const fs = require('node:fs');
const path = require('node:path');

function desktopModePath(app) { return path.join(app.getPath('userData'), 'desktop-mode.json'); }

function readDesktopMode(app, defaultEnabled = false) {
  try {
    const saved = JSON.parse(fs.readFileSync(desktopModePath(app), 'utf8'));
    if (typeof saved.enabled === 'boolean') return { ...saved, enabled: saved.enabled, source: 'saved' };
  } catch {}
  return { enabled: Boolean(defaultEnabled), source: 'default' };
}

function writeDesktopMode(app, enabled) {
  const next = { enabled: Boolean(enabled), source: 'saved', updatedAt: Date.now() };
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(desktopModePath(app), JSON.stringify(next), { encoding: 'utf8', mode: 0o600 });
  return next;
}

module.exports = { desktopModePath, readDesktopMode, writeDesktopMode };
