const CONFLICT_SUFFIX = '（同步冲突副本）';
const CONFLICT_ID = /^(.*?)-conflict-\d{13}-[0-9a-f]{6}(?:-conflict-\d{13}-[0-9a-f]{6})*$/i;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

function fingerprint(note) {
  const copy = structuredClone(note);
  for (const key of ['id', 'x', 'y', 'z']) delete copy[key];
  while (copy.title?.endsWith(CONFLICT_SUFFIX)) copy.title = copy.title.slice(0, -CONFLICT_SUFFIX.length);
  // Cloud payloads intentionally omit local organizer icons and targets.
  if (copy.type === 'organizer') for (const item of copy.desktopItems || []) {
    for (const key of ['path', 'icon', 'iconVersion']) delete item[key];
  }
  return JSON.stringify(stable(copy));
}

function redundantConflictIds(state) {
  const groups = new Map();
  for (const note of state?.notes || []) {
    const source = CONFLICT_ID.exec(note.id)?.[1] || note.id;
    if (!groups.has(source)) groups.set(source, []);
    groups.get(source).push(note);
  }
  const redundant = [];
  for (const [source, notes] of groups) {
    const seen = new Set();
    for (const note of [...notes].sort((a, b) => (b.id === source ? 1 : 0) - (a.id === source ? 1 : 0))) {
      const signature = fingerprint(note);
      if (note.id !== source && CONFLICT_ID.test(note.id) && note.title?.endsWith(CONFLICT_SUFFIX) && seen.has(signature)) redundant.push(note.id);
      else seen.add(signature);
    }
  }
  return redundant;
}

function moveRedundantConflictsToRecycleBin(state, ids, deletedAt = new Date().toISOString()) {
  const selected = new Set(ids);
  const next = structuredClone(state);
  const moved = next.notes.filter(note => selected.has(note.id));
  next.notes = next.notes.filter(note => !selected.has(note.id));
  next.recycleBin = [...moved.map(note => ({ ...note, deletedAt })), ...(next.recycleBin || [])];
  next.attachments = (next.attachments || []).filter(link => !selected.has(link.parentId) && !selected.has(link.childId));
  if (next.reminderState?.activeItems) next.reminderState.activeItems = next.reminderState.activeItems.filter(item => !selected.has(item.noteId));
  return next;
}

module.exports = { redundantConflictIds, moveRedundantConflictsToRecycleBin };
