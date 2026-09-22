const fs = require('node:fs');
const path = require('node:path');

const MAX_BACKUPS = 10;
const AUTO_INTERVAL_MS = 6 * 60 * 60 * 1000;

function parseState(serialized) {
  if (typeof serialized !== 'string' || serialized.length > 20_000_000) throw new Error('invalid-size');
  const state = JSON.parse(serialized);
  if (!state || !Array.isArray(state.notes)) throw new Error('invalid-state');
  return state;
}

function stamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function listBackups(directory) {
  try {
    return fs.readdirSync(directory)
      .filter(name => /^pindo-backup-.*\.json$/i.test(name))
      .map(name => ({ name, file: path.join(directory, name), time: fs.statSync(path.join(directory, name)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
  } catch { return []; }
}

function createBackup(directory, serialized, options = {}) {
  parseState(serialized);
  fs.mkdirSync(directory, { recursive: true });
  const existing = listBackups(directory);
  const now = options.now instanceof Date ? options.now : new Date();
  if (!options.force && existing[0] && now.getTime() - existing[0].time < (options.intervalMs || AUTO_INTERVAL_MS)) return existing[0].file;
  const file = path.join(directory, `pindo-backup-${stamp(now)}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, serialized, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
  for (const old of listBackups(directory).slice(options.maxBackups || MAX_BACKUPS)) {
    try { fs.unlinkSync(old.file); } catch {}
  }
  return file;
}

function newestValidBackup(directory) {
  for (const entry of listBackups(directory)) {
    try {
      const serialized = fs.readFileSync(entry.file, 'utf8');
      parseState(serialized);
      return { ...entry, serialized };
    } catch {}
  }
  return null;
}

module.exports = { parseState, createBackup, newestValidBackup, listBackups, MAX_BACKUPS, AUTO_INTERVAL_MS };
