# Canvas Foundation P0 + Local Organizer — Development Execution Spec

## Background / Owner decision
Baseline: test-channel candidate rc.8 at commit 309d3d9e5e537ccfb456dbc77106072ecec7d069.
This branch is a Foundation repair round, not Interaction Polish and not a new product phase.

## Unique objective
Prove the Canvas foundation cannot interfere with normal Windows desktop control, while correcting cloud-sync Authority so Desktop Organizer is device-local only.

## MUST DO
### CF-01 P0 — Multi-display Canvas Authority
- Canvas must not assume only getPrimaryDisplay().bounds.
- Define a coherent virtual-desktop/multi-display geometry strategy for Canvas.
- Preserve correct screen/local coordinate conversion for hit testing, including negative display coordinates and mixed display placement.
- Re-publish regions after display geometry changes.

### CF-02 P0 — Hit-test lifecycle / resource safety
- Review the current 16 ms polling loop.
- Keep desktop pass-through correct while avoiding unnecessary work when Canvas is hidden/inactive.
- Do not trade click correctness for cosmetic smoothness.

### CF-03 P0 — Focus/Edit lifecycle
- Editing must reliably transition Canvas from pass-through/unfocusable to editable/focused.
- Blur/end-edit must restore the intended non-blocking desktop behavior.
- Repeated click → edit → blur → click must remain reliable.

### CF-04 P0 — Gesture fail-safe
- A lost pointerup/pointercancel, blur, renderer interruption, or other abnormal termination must not leave Canvas permanently in dragging/non-pass-through state.
- Gesture state must have an explicit reset path.

### CF-05 P0 — Desktop-host fallback
- If Explorer refuses/loses Canvas desktop hosting, user notes must remain accessible through the existing native-window fallback.
- Do not silently claim Canvas is active after host failure.

### CF-06 P0 — Desktop Organizer exits Cloud Authority
Formal rule:
- Cloud sync synchronizes notes intended for cross-device use.
- Every note with type === "organizer" is Device-local State.
- Organizer note identity, desktopItems, item order, organizer size/view, position, local paths/icons and all organizer-specific state must never be uploaded to cloud.
- Remote historical organizer records must never create, overwrite, delete, restore, or mutate this device's organizer.
- Device A and Device B may have completely different organizers while ordinary notes continue syncing normally.
- Implement at the Authority/domain boundary. Do NOT implement as “sync it, then delete/restore it afterwards”.
- Existing local organizer data must survive upgrade and sync.

## Protected baseline / DO NOT BREAK
- Canvas Manager owns the desktop surface, never canonical note contents.
- desktop notes route to Canvas; top notes remain native; bookmark notes remain parked according to current routing.
- Native fallback remains available.
- Existing note IDs and ordinary cloud note sync behavior must remain stable.
- Existing cloud duplicate prevention/deletion semantics for syncable notes must regress cleanly.
- rc.8/main baseline is protected; work only on this branch.

## EXPLICITLY NOT DOING
- No Interaction Polish / motion redesign in this repair.
- No new note/product features.
- No Dodo feature expansion.
- No broad dist/app.js architecture rewrite.
- No Companion/AI work.
- No macOS/mobile implementation.

## Required automated tests
At minimum add/extend tests for:
1. Canvas geometry with secondary display and negative coordinates.
2. Gesture reset after abnormal lifecycle/blur path.
3. Focus/edit can enter and restore pass-through state.
4. Desktop-host failure preserves fallback behavior.
5. cloudSafeState/push payload contains zero organizer notes.
6. A remote historical organizer cannot overwrite/create/delete local organizer.
7. Two-device scenario: ordinary note syncs while organizers remain different.
8. Local organizer survives remote revision/conflict merge.
9. Existing ordinary note deletion/edit/conflict tests remain passing.
10. No duplicate-note regression.

## Diagnostics
Add enough Canvas-specific diagnostic state to identify display geometry, Canvas bounds/active state, gesture/hit-test state and host/fallback failures without logging note text or private file paths.

## Acceptance
- Automated suite passes.
- Windows build/validation passes.
- No ordinary note sync regression.
- No cloud payload produced by the new code contains organizer notes.
- Canvas cannot remain in a state that blocks normal desktop input after an interrupted interaction.
- Real-machine items (multi-monitor, mixed DPI, Explorer restart, sleep/wake, GPU/driver) are marked for Owner/User acceptance after a candidate EXE exists.

## Escalation
If implementation requires changing canonical state schema, replacing the routing model, or broadly rewriting renderer architecture, stop and escalate to Owner before proceeding.
