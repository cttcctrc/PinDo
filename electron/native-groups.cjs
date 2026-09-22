const TOP_SPACE = 0;
function descendants(state, id) {
  const result = [id];
  for (let i = 0; i < result.length; i++) for (const link of state.attachments || []) {
    if (link.parentId === result[i] && !result.includes(link.childId)) result.push(link.childId);
  }
  return result;
}
function normalizeGroups(state) {
  const notes = new Map(state.notes.map(n => [n.id, n]));
  const accepted = [];
  for (const link of state.attachments || []) {
    const p = notes.get(link.parentId), c = notes.get(link.childId);
    if (!p || !c || p === c || p.mode === 'bookmark' || c.mode === 'bookmark') continue;
    if (accepted.some(l => l.parentId === p.id || l.childId === c.id)) continue;
    if (descendants({ attachments: accepted }, c.id).includes(p.id)) continue;
    accepted.push(link);
  }
  state.attachments = accepted;
  const visit = id => {
    const p = notes.get(id), link = accepted.find(l => l.parentId === id);
    if (!p || !link) return;
    const c = notes.get(link.childId);
    Object.assign(c, { x: p.x, y: p.y + p.h - TOP_SPACE, w: p.w, mode: p.mode, locked: Boolean(p.pinEnabled && p.locked) });
    visit(c.id);
  };
  state.notes.filter(n => !accepted.some(l => l.childId === n.id)).forEach(n => visit(n.id));
  return state;
}
function findSnap(state, id, bounds, movingIds) {
  const n = state.notes.find(n => n.id === id);
  if (!n) return null;
  const choices = [];
  for (const other of state.notes) {
    if (movingIds.includes(other.id) || other.mode === 'bookmark') continue;
    if (Math.min(bounds.x + bounds.width, other.x + other.w) - Math.max(bounds.x, other.x) < 40) continue;
    if (!(state.attachments || []).some(l => l.parentId === other.id)) {
      choices.push({ parentId: other.id, childId: id, targetId: other.id, edge: 'bottom', gap: Math.abs(bounds.y - (other.y + other.h - TOP_SPACE)) });
    }
    if (movingIds.length === 1 && !(state.attachments || []).some(l => l.childId === other.id)) {
      choices.push({ parentId: id, childId: other.id, targetId: other.id, edge: 'top', gap: Math.abs(bounds.y + bounds.height - TOP_SPACE - other.y) });
    }
  }
  return choices.filter(s => s.gap <= 22).sort((a,b) => a.gap - b.gap)[0] || null;
}
function createGroupGestures({ manager, getStore, commit }) {
  const idOf = win => [...manager.windows].find(([,w]) => w === win)?.[0];
  const clear = () => { for (const w of manager.windows.values()) if (!w.isDestroyed()) w.webContents.send('pindo:snap', null); };
  return {
    begin(win, kind) {
      const id = idOf(win); if (!id) return null;
      const state = getStore().state, note = state.notes.find(n => n.id === id);
      const attached = (state.attachments || []).some(l => l.childId === id);
      if ((!attached && note.pinEnabled && note.locked) || (attached && String(kind).startsWith('resize'))) return false;
      return { id, kind, attached, ids: descendants(state,id), moved: false, snap: null };
    },
    update(meta, bounds) {
      if (!meta) return;
      meta.moved = true;
      const state = structuredClone(getStore().state);
      if (meta.attached) state.attachments = (state.attachments || []).filter(l => l.childId !== meta.id);
      const note = state.notes.find(n => n.id === meta.id);
      Object.assign(note,{x:bounds.x,y:bounds.y,w:bounds.width,h:bounds.height});
      normalizeGroups(state);
      for (const id of meta.ids.slice(1)) {
        const n = state.notes.find(n => n.id === id), w = manager.windows.get(id);
        if (n && w && !w.isDestroyed()) { w.pindoGroupMoving = true; w.setBounds({x:n.x,y:n.y,width:n.w,height:n.h}); }
      }
      clear();
      meta.snap = meta.kind === 'move' ? findSnap(state, meta.id, bounds, meta.ids) : null;
      if (meta.snap) {
        manager.windows.get(meta.snap.targetId)?.webContents.send('pindo:snap', meta.snap.edge);
        manager.windows.get(meta.id)?.webContents.send('pindo:snap', meta.snap.edge === 'top' ? 'bottom' : 'top');
      }
    },
    end(meta, bounds, action) {
      clear(); if (!meta?.moved) return;
      for (const id of meta.ids) { const w=manager.windows.get(id); if(w)w.pindoGroupMoving=false; }
      const state = structuredClone(getStore().state), note = state.notes.find(n => n.id === meta.id);
      if (!note) return;
      Object.assign(note,{x:bounds.x,y:bounds.y,w:bounds.width,h:bounds.height});
      if (meta.attached) { state.attachments = (state.attachments || []).filter(l => l.childId !== meta.id); note.locked = false; }
      if (meta.snap && action === 'end') {
        state.attachments ||= [];
        state.attachments = state.attachments.filter(l => l.childId !== meta.snap.childId);
        state.attachments.push({parentId:meta.snap.parentId,childId:meta.snap.childId});
      }
      normalizeGroups(state); commit(state);
      return {x:note.x,y:note.y,width:note.w,height:note.h};
    }
  };
}
module.exports = { normalizeGroups, descendants, findSnap, createGroupGestures, TOP_SPACE };
