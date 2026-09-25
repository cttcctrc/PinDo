/** The canvas and the OS top layer cannot be the same native window. */
function partitionNotes(notes) {
  const canvas = [], native = [], parked = [];
  for (const note of Array.isArray(notes) ? notes : []) {
    if (!note || typeof note.id !== 'string') continue;
    if (note.mode === 'desktop') canvas.push(note);
    else if (note.mode === 'top') native.push(note);
    else if (note.mode === 'bookmark') parked.push(note);
  }
  return { canvas, native, parked };
}

module.exports = { partitionNotes };
