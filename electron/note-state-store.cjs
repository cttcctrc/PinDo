/** Canonical store for one-note edits from independent renderer windows. */
const { reconcileReminderState } = require('./reminder-state.cjs');

class NoteStateStore {
  constructor(state) {
    this.validateState(state);
    this.state = reconcileReminderState(state, state);
    this.versions = new Map(state.notes.map(note => [note.id, 0]));
    this.revision = 0;
  }

  validateState(state) {
    if (!state || !Array.isArray(state.notes) || state.notes.some(note => !note || typeof note.id !== 'string' || !note.id || typeof note.type !== 'string')) {
      throw new TypeError('Invalid PinDo state');
    }
    if (new Set(state.notes.map(note => note.id)).size !== state.notes.length) throw new TypeError('Duplicate PinDo note id');
  }

  fullSnapshot() { return { state: structuredClone(this.state), revision: this.revision }; }

  snapshot(id) {
    const note = this.state.notes.find(item => item.id === id);
    return note ? { note: structuredClone(note), version: this.versions.get(id) } : null;
  }

  update(id, version, proposed) {
    if (!proposed || proposed.id !== id || !Number.isSafeInteger(version)) return { accepted: false, reason: 'invalid', current: this.snapshot(id) };
    const index = this.state.notes.findIndex(item => item.id === id);
    if (index < 0) return { accepted: false, reason: 'missing', current: null };
    if (this.versions.get(id) !== version) return { accepted: false, reason: 'conflict', current: this.snapshot(id) };
    const existing = this.state.notes[index];
    if (existing.type !== proposed.type) return { accepted: false, reason: 'invalid', current: this.snapshot(id) };
    const nextState = structuredClone(this.state);
    nextState.notes[index] = structuredClone(proposed);
    this.state = reconcileReminderState(this.state, nextState);
    this.versions.set(id, version + 1);
    this.revision++;
    return { accepted: true, current: this.snapshot(id) };
  }

  setState(state, expectedRevision) {
    this.validateState(state);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== this.revision) {
      return { accepted: false, reason: 'conflict', current: this.fullSnapshot() };
    }
    const reconciled = reconcileReminderState(this.state, state);
    const nextVersions = new Map();
    for (const note of reconciled.notes) {
      const old = this.state.notes.find(item => item.id === note.id);
      nextVersions.set(note.id, (this.versions.get(note.id) || 0) + (JSON.stringify(old) === JSON.stringify(note) ? 0 : 1));
    }
    this.state = reconciled;
    this.versions = nextVersions;
    this.revision++;
    return { accepted: true, current: this.fullSnapshot() };
  }

  serialize() { return JSON.stringify(this.state); }
}

module.exports = { NoteStateStore };
