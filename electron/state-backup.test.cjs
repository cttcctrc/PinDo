const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseState, createBackup, newestValidBackup, listBackups } = require('./state-backup.cjs');

const state = value => JSON.stringify({ notes: [{ id: String(value) }], attachments: [] });

test('backup validates state, rotates old snapshots and recovers newest valid copy', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-backup-'));
  assert.throws(() => parseState('{"notes":null}'));
  for (let i = 0; i < 4; i++) createBackup(directory, state(i), { force: true, maxBackups: 3, now: new Date(1700000000000 + i * 1000) });
  assert.equal(listBackups(directory).length, 3);
  fs.writeFileSync(listBackups(directory)[0].file, 'broken');
  const recovered = newestValidBackup(directory);
  assert.equal(JSON.parse(recovered.serialized).notes[0].id, '2');
  fs.rmSync(directory, { recursive: true, force: true });
});

test('automatic backup is throttled while a forced backup is always written', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-backup-'));
  const first = createBackup(directory, state(1), { now: new Date(1700000000000) });
  const throttled = createBackup(directory, state(2), { now: new Date(1700000001000) });
  assert.equal(throttled, first);
  createBackup(directory, state(3), { force: true, now: new Date(1700000002000) });
  assert.equal(listBackups(directory).length, 2);
  fs.rmSync(directory, { recursive: true, force: true });
});
