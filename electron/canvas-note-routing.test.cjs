const test = require('node:test');
const assert = require('node:assert/strict');
const { partitionNotes } = require('./canvas-note-routing.cjs');

test('canvas and always-on-top notes keep their IDs and original data', () => {
  const notes = [
    { id: 'a', mode: 'desktop', content: 'saved' },
    { id: 'b', mode: 'top', content: 'pinned' },
    { id: 'c', mode: 'bookmark', content: 'parked' }
  ];
  const result = partitionNotes(notes);
  assert.deepEqual(result.canvas.map(note => note.id), ['a']);
  assert.deepEqual(result.native.map(note => note.id), ['b']);
  assert.deepEqual(result.parked.map(note => note.id), ['c']);
  assert.equal(result.canvas[0], notes[0]);
  assert.equal(result.native[0], notes[1]);
  assert.equal(result.parked[0], notes[2]);
});
