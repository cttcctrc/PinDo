const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { starter, validState, loadState, saveState } = require('./state.cjs');

test('the preview stores edited notes only in its own directory', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-canvas-preview-'));
  t.after(() => fs.rmSync(directory, { force: true, recursive: true }));
  const state = starter(); state.notes[0].text = 'Edited';
  saveState(directory, state);
  assert.equal(loadState(directory).notes[0].text, 'Edited');
  assert.deepEqual(fs.readdirSync(directory), ['canvas-preview.json']);
});

test('invalid and duplicate note IDs never replace saved state', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-canvas-preview-'));
  t.after(() => fs.rmSync(directory, { force: true, recursive: true }));
  const state = starter(); saveState(directory, state);
  state.notes.push({ ...state.notes[0] });
  assert.equal(validState(state), false);
  assert.throws(() => saveState(directory, state), /Invalid preview state/);
  assert.equal(loadState(directory).notes.length, 3);
});
