const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('dist/app.js', 'utf8');
const styles = fs.readFileSync('dist/styles.css', 'utf8');
const dock = fs.readFileSync('dist/native-dock.js', 'utf8');
const dockStyles = fs.readFileSync('dist/native-dock.css', 'utf8');

test('IP motion uses one fast normal slow token system', () => {
  assert.match(styles, /--motion-fast:\s*110ms/);
  assert.match(styles, /--motion-normal:\s*190ms/);
  assert.match(styles, /--motion-slow:\s*280ms/);
  assert.match(styles, /--motion-ease:/);
  assert.match(dockStyles, /--motion-fast:\s*110ms/);
  assert.match(app, /const MOTION = Object\.freeze\(\{ fast: 110, normal: 190, slow: 280 \}\)/);
});

test('IP-01 note pickup is immediate and drop settles independently of pointer tracking', () => {
  assert.match(app, /beginNotePickup\(el\)/);
  assert.match(app, /settleNoteDrop\(el\)/);
  assert.match(styles, /\.note\.is-dragging[\s\S]*transform:\s*scale\(1\.012\)/);
  assert.match(styles, /\.note\.drop-settling/);
});

test('IP-02 vertical snap exposes preview and a distinct detach threshold', () => {
  assert.match(app, /const SNAP_THRESHOLD = 22, DETACH_THRESHOLD = 34/);
  assert.match(app, /note-snap-ghost/);
  assert.match(app, /isSnapDetached/);
  assert.match(styles, /\.note-snap-ghost/);
});

test('IP-03 hover press and selected states share motion tokens without layout shifts', () => {
  assert.match(styles, /button:active[\s\S]*var\(--motion-fast\)/);
  assert.match(styles, /\.note\.focused[\s\S]*var\(--motion-normal\)/);
  assert.match(styles, /\.bookmark\.is-selected/);
});

test('IP-04 new notes use non-blocking normal fade and scale entrance', () => {
  assert.match(styles, /\.note\.note-spawn[\s\S]*var\(--motion-normal\)/);
  assert.match(styles, /@keyframes note-spawn-from-origin[\s\S]*scale\(\.96\)/);
  assert.match(app, /focusCreatedNoteImmediately/);
});

test('IP-05 delete and todo completion commit state before visual exit', () => {
  assert.match(app, /commitTodoCompletion/);
  assert.match(app, /animateTodoCompletion/);
  assert.match(app, /animateNoteRemoval/);
  assert.match(styles, /\.todo-row\.is-completing/);
  assert.match(styles, /\.note\.is-removing/);
});

test('IP-06 expand collapse transitions are last-intent safe', () => {
  assert.match(app, /noteTransitionIntents/);
  assert.match(app, /transitionNoteToBookmark/);
  assert.match(app, /transitionBookmarkToNote/);
  assert.match(styles, /\.note\.is-collapsing/);
});

test('IP-07 native dock sorting is pointer driven, vertical only and persists through dock-reorder', () => {
  assert.doesNotMatch(dock, /\.draggable\s*=\s*true/);
  assert.match(dock, /beginTabSort/);
  assert.match(dock, /event\.clientY/);
  assert.match(dock, /dock-reorder/);
  assert.match(dockStyles, /\.tab-sort-placeholder/);
});test('IP-STACK-01 dock cards overlap as a vertical stack and lift without delaying pointer input', () => {
  assert.match(dock, /const STACK_STEP = 42/);
  assert.match(dock, /button\.style\.setProperty\("--stack-index"/);
  assert.match(dockStyles, /\.tab \+ \.tab[^{]*\{[^}]*margin-top:calc\(-10px \* var\(--scale\)\)/);
  assert.match(dockStyles, /\.tab:hover[^{]*\{[^}]*translateX\(-8px\)[^}]*translateY\(-2px\)/);
  assert.doesNotMatch(dockStyles, /\.tab:hover[^{]*\{[^}]*transition-delay/);
});


test('IP-STACK-01 preview top follows the hovered tab and drag replaces the source with one placeholder', () => {
  assert.match(dock, /return Math\.max\(8, Math\.min\(rect\.top, innerHeight - height - 8\)\)/);
  assert.match(dock, /button\.before\(placeholder\); button\.hidden = true/);
  assert.match(dock, /button\.hidden = false/);
  assert.doesNotMatch(dock, /button\.after\(placeholder\)/);
});




test('IP-08 dock preview opens left with hover corridor and viewport clamping', () => {
  assert.match(dock, /PREVIEW_CLOSE_DELAY/);
  assert.match(dock, /schedulePreviewClose/);
  assert.match(dock, /clampPreviewTop/);
  assert.match(dockStyles, /#preview[\s\S]*pointer-events:auto/);
  assert.match(dockStyles, /translateX\(8px\)/);
});

test('IP-09 persistent selection uses a presentation highlight and never saved markup', () => {
  assert.match(app, /CSS\.highlights\.set\("pindo-selection"/);
  assert.match(app, /clearPersistentSelection/);
  assert.match(styles, /::highlight\(pindo-selection\)/);
  assert.doesNotMatch(app, /data-pindo-selection/);
});

test('IP-10 sortable lists use a live placeholder and animated reflow', () => {
  assert.match(app, /createListPlaceholder/);
  assert.match(app, /animateListReflow/);
  assert.match(app, /event\.type !== "pointerup"/);
  assert.match(styles, /\.list-drop-placeholder/);
  assert.match(styles, /\.todo-row\.list-reflow|\.timeline-row\.list-reflow/);
});

test('IP-11 toast messages are queued and have explicit enter and exit states', () => {
  assert.match(app, /toastQueue/);
  assert.match(app, /pumpToastQueue/);
  assert.match(styles, /\.toast\.leaving/);
  assert.match(styles, /var\(--motion-normal\)/);
});

test('IP-12 note highlight primitive is reusable and does not focus or move notes', () => {
  assert.match(app, /function highlightNote\(noteId/);
  assert.match(app, /window\.pindoInteraction = Object\.freeze\(\{ highlightNote \}\)/);
  assert.match(styles, /\.note\.is-highlighted/);
  assert.doesNotMatch(app, /function highlightNote\(noteId[\s\S]{0,500}\.focus\(/);
});



test('IP-HIGHLIGHT-01 locate feedback is a double soft wiggle with a neutral soft focus', () => {
  assert.match(app, /pindo-locate-feedback/);
  assert.match(styles, /\.todo-row\.pindo-locate-feedback,\.timeline-row\.pindo-locate-feedback/);
  assert.match(styles, /animation:pindoLocateWiggle var\(--motion-slow\)[^;]* 2/);
  assert.match(styles, /@keyframes pindoLocateWiggle/);
  assert.match(styles, /background:rgba\(78,126,225,/);
  assert.doesNotMatch(styles, /pindoAttention/);
});
