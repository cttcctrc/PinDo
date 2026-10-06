const tabs = document.querySelector('#tabs');
const preview = document.querySelector('#preview');
const overflow = document.querySelector('#overflow');
const MOTION = Object.freeze({ fast: 110, normal: 190, slow: 280 });
const PREVIEW_CLOSE_DELAY = 180;
let notes = [], dragging = null, uiScale = 1, previewNoteId = null, previewCloseTimer = 0;

const shapes = {
  dot:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/></svg>',
  star:'<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none"/></svg>',
  bulb:'<svg viewBox="0 0 24 24"><path d="M9 18h6m-5 3h4m4-11a6 6 0 1 0-10.4 4.1C8.5 15 9 16 9 17h6c0-1 .5-2 1.4-2.9A5.9 5.9 0 0 0 18 10Z"/></svg>',
  check:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.7L16.5 9"/></svg>',
  flag:'<svg viewBox="0 0 24 24"><path d="M6 21V4m0 1h11l-2 4 2 4H6"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M20 8.7C20 14 12 19 12 19S4 14 4 8.7C4 5.4 8 4 10.1 6.5L12 8.7l1.9-2.2C16 4 20 5.4 20 8.7Z"/></svg>'
};

function regions() {
  const elements = [tabs, preview, overflow].filter(element => !element.hidden && (element === preview || element.children.length));
  window.pindoNative.command('dock-regions', elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
}

function clampPreviewTop(button, height) {
  const rect = button.getBoundingClientRect();
  return Math.max(8, Math.min(rect.top + rect.height / 2 - height / 2, innerHeight - height - 8));
}

function cancelPreviewClose() { clearTimeout(previewCloseTimer); previewCloseTimer = 0; }
function hidePreview() {
  cancelPreviewClose();
  preview.hidden = true; preview.classList.remove('show'); previewNoteId = null;
  window.pindoNative.command('dock-hover',false); requestAnimationFrame(regions);
}
function schedulePreviewClose() {
  cancelPreviewClose();
  previewCloseTimer = setTimeout(hidePreview, PREVIEW_CLOSE_DELAY);
}

function showPreview(button, note) {
  cancelPreviewClose(); preview.replaceChildren(); previewNoteId = note.id;
  if (note.type === 'todo') { const count = document.createElement('b'); count.textContent = note.count; preview.append(count); }
  const heading = document.createElement('strong'); heading.textContent = note.title; preview.append(heading);
  if (note.summary) { const detail = document.createElement('p'); detail.textContent = note.type === 'timeline' ? `本周要进行【${note.summary}】` : note.summary; preview.append(detail); }
  preview.hidden = false;
  preview.style.top = `${clampPreviewTop(button, preview.offsetHeight)}px`;
  preview.classList.remove('show'); requestAnimationFrame(() => preview.classList.add('show'));
  window.pindoNative.command('dock-hover',true); requestAnimationFrame(regions);
}

preview.addEventListener('pointerenter', cancelPreviewClose);
preview.addEventListener('pointerleave', schedulePreviewClose);
preview.addEventListener('click', () => { if (previewNoteId) window.pindoNative.command('dock-restore', previewNoteId); hidePreview(); });

function beginTabSort(button, note, event) {
  if (event.button !== 0) return;
  const startY = event.clientY, rect = button.getBoundingClientRect();
  let ghost = null, placeholder = null, target = null, after = false;
  const clearMarkers = () => document.querySelectorAll('.tab.over-before,.tab.over-after').forEach(item => item.classList.remove('over-before','over-after'));
  const move = pointer => {
    if (!ghost && Math.abs(pointer.clientY - startY) < 5) return;
    if (!ghost) {
      hidePreview(); dragging = note.id; button.setPointerCapture(event.pointerId); button.classList.add('is-sorting');
      ghost = button.cloneNode(true); ghost.className = 'tab tab-sort-ghost'; ghost.style.width = `${rect.width}px`; ghost.style.left = `${rect.left}px`; document.body.appendChild(ghost);
      placeholder = document.createElement('div'); placeholder.className = 'tab-sort-placeholder'; placeholder.style.height = `${rect.height}px`; button.after(placeholder);
    }
    ghost.style.top = `${Math.max(0, Math.min(innerHeight - rect.height, pointer.clientY - rect.height / 2))}px`;
    clearMarkers();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, pointer.clientY);
    const candidate = hit?.closest('.tab:not(.more):not(.tab-sort-ghost)');
    if (!candidate || candidate === button) return;
    target = candidate; const candidateRect = candidate.getBoundingClientRect(); after = pointer.clientY > candidateRect.top + candidateRect.height / 2;
    candidate.classList.add(after ? 'over-after' : 'over-before');
    candidate.parentElement.insertBefore(placeholder, after ? candidate.nextSibling : candidate);
  };
  const end = pointer => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); window.removeEventListener('blur', end);
    clearMarkers(); button.classList.remove('is-sorting'); ghost?.remove(); placeholder?.remove();
    if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
    const sorted = Boolean(ghost && target && dragging && dragging !== target.dataset.noteId && pointer?.type === 'pointerup');
    if (sorted) window.pindoNative.command('dock-reorder', { id: dragging, target: target.dataset.noteId, after });
    if (ghost) { button.dataset.justSorted = '1'; setTimeout(() => delete button.dataset.justSorted, MOTION.fast); }
    dragging = null; requestAnimationFrame(regions);
  };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end); window.addEventListener('blur', end);
}

function tab(note) {
  const button = document.createElement('button'); button.className = 'tab'; button.dataset.noteId = note.id;
  button.style.setProperty('--tint', note.color || '#eee'); button.style.setProperty('--icon', note.iconColor || '#f58b56');
  const icon = document.createElement('i'); icon.innerHTML = shapes[note.icon] || shapes.dot;
  const title = document.createElement('strong'); title.textContent = note.title; button.append(icon, title);
  button.addEventListener('click', () => { if (!button.dataset.justSorted) window.pindoNative.command('dock-restore', note.id); });
  button.addEventListener('pointerenter', () => showPreview(button, note));
  button.addEventListener('pointerleave', schedulePreviewClose);
  button.addEventListener('pointerdown', event => beginTabSort(button, note, event));
  return button;
}

function render() {
  hidePreview(); tabs.replaceChildren(); overflow.replaceChildren(); overflow.hidden = true;
  const limit = Math.max(1, Math.floor((innerHeight - 95 * uiScale) / (62 * uiScale)));
  notes.slice(0, limit).forEach(note => tabs.append(tab(note)));
  if (notes.length > limit) {
    const more = document.createElement('button'); more.className = 'tab more'; more.textContent = '•••'; more.title = '更多便签';
    more.addEventListener('click', () => { overflow.hidden = !overflow.hidden; regions(); }); tabs.append(more);
    notes.slice(limit).forEach(note => overflow.append(tab(note)));
  }
  requestAnimationFrame(regions);
}

window.pindoNative.on('dock-state', value => { notes = value; render(); });
window.addEventListener('resize', render);
window.pindoNative.command('dock-list').then(value => { notes = value || []; render(); });
function closePreview() { hidePreview(); overflow.hidden = true; regions(); }
window.pindoNative.on('pointer-outside', closePreview);
window.addEventListener('blur', closePreview);
document.documentElement.addEventListener('mouseleave', schedulePreviewClose);
window.pindoNative.on('dock-settings', settings => {
  uiScale = { small:.88, medium:1, large:1.14 }[settings.uiSize] || 1;
  const local = { system:'"Microsoft YaHei UI"', dingtalk:'DingTalk', muyao:'"Muyao Softbrush"' };
  const latin = { nunito:'Nunito', segoe:'"Segoe UI"', system:'system-ui' };
  document.documentElement.style.setProperty('--scale', uiScale);
  document.documentElement.style.setProperty('--ui-local-font', local[settings.localFont] || local.system);
  document.documentElement.style.setProperty('--ui-latin-font', latin[settings.englishFont] || latin.nunito);
  render();
});
