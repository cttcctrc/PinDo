# PINDO-DESKTOP-STABILITY-P0-01

Status: Static / automated validation passed; Windows real-machine acceptance pending.

Baseline: `1.1.0-beta.7.5-rc.42`  
Candidate: `1.1.0-beta.7.5-rc.43`  
Branch: `fix/pindo-ux-org-01`

## Root-cause findings

### EDIT-FLICKER-01

Reproduction path: edit a native desktop note while a canonical-state update (autosave, main-window update, or cloud merge) arrives, or while focus causes a desktop-host promotion/demotion.

Evidence:

- `applyNativeSnapshot()` replaced the whole note DOM whenever canonical content differed. It had no active-editor or IME-composition guard.
- A stale note version returned `conflict`, but the renderer discarded the result and did not retry the active draft.
- Focus/blur directly requested asynchronous Explorer-host transitions; the previous manager tracked only an operation-in-progress flag, not the latest data-mode version.

Root cause: renderer snapshots could replace the focused editor and selection during an active draft, while native host work had no shared state-version authority. These independent paths both presented as editing flicker/focus loss.

Fix:

- Defer DOM replacement while an editor or IME composition owns the draft.
- Save after composition end and on editor blur; retry one version conflict while preserving canonical geometry/mode/lock fields.
- Serialize native-layer reconciliation against the latest authoritative mode and suppress stale results from changing visibility or TopMost.

### NOTE-PARK-01

Reproduction path: create/load or promote a desktop note, then park it before the asynchronous host request completes.

Evidence:

- The old `did-finish-load` callback captured `view.mode` and unconditionally called `showInactive()` after the host await.
- `modes` was not updated for bookmark notes, so an old promote could still set TopMost after the data mode had become `bookmark`.
- This exactly permits the reported state: data `bookmark`, native `parked=true`, `visible=true`, `alwaysOnTop=true`.

Root cause: visibility had multiple writers and asynchronous callbacks used captured/stale mode state.

Fix:

- Make the latest Note Mode and monotonically increasing state version authoritative.
- Route show/hide/park/unpark through one visibility decision method.
- Keep parked renderers for expansion performance, but require a fresh host reconciliation before showing them again.
- A stale attach/promote may finish at the OS layer, but cannot show or TopMost a bookmarked note.

### CF-08

Reproduction path: activate/promote a desktop note, invoke Win+D, then let the blur/minimize path attach it back to Explorer.

Evidence:

- Win+D can apply `WS_MINIMIZE` to the promoted top-level note.
- Both native layer transitions preserved all unrelated style bits, including `WS_MINIMIZE`.
- On LTSC 2019 with software composition (`gl=none`, `angle=none`, DirectComposition disabled), reparenting the minimized transparent Chromium surface can leave a black/stale surface.
- The previous manager did not treat a minimize event as invalidating the Explorer host relationship.

Root cause: a minimized top-level state was carried across a native reparent, compounded by an unversioned host/visibility race. GPU limitations increase exposure but are not treated as the sole cause.

Fix:

- Clear `WS_MINIMIZE` atomically in both desktop attach and top-level promote operations.
- Treat a desktop-note minimize event as host invalidation and perform one event-driven reattach; there is no polling, timer refresh, hide/show loop, or window reconstruction.
- Do not show a desktop note until its required host transition settles.

## Diagnostics

The candidate records privacy-safe events for window create/destroy, show/hide, focus/blur, host attach/promote/failure, TopMost, bounds, Note Mode, park/unpark, editor mount/unmount, composition start/end, renderer load/reload/crash, and Win+D/system minimize.

Each event contains timestamp (added by the existing diagnostics writer), SHA-256-truncated anonymous note ID, native window ID, reason, state version, and before/after window state. It does not contain note text, typed keys, account data, or file paths.

## Automated evidence

- `npm test`: 185 passed, 0 failed.
- `npm run check:desktop`: passed.
- `git diff --check`: passed.
- New race regressions cover park-during-load, park-during-promote, and Win+D minimize/reattach without BrowserWindow recreation.
- New editor policy tests cover local-draft/canonical-shell merge and IME/editor snapshot deferral.

## Windows acceptance matrix

Not yet accepted. The GitHub Windows candidate job provides packaged smoke evidence, but Owner acceptance still requires the requested interactive matrix on Windows 10 LTSC 2019 Build 17763 and supported Windows 10/11 systems, including DPI, monitor, compatibility-mode, Win+D, park/unpark, autosave/cloud sync, and five-minute Chinese/English input runs.

## Risk and rollback

- Risk: LTSC-specific compositor behavior cannot be fully proven by Linux-hosted unit tests or a generic `windows-latest` CI runner.
- Risk: an Explorer host failure deliberately leaves the note accessible as a top-level fallback and records the failure; this may temporarily differ from desktop-layer ordering.
- Performance: parked-window caching remains capped at eight, so collapse/expand performance is unchanged; no cache removal or broad refactor was made.
- Rollback: revert the candidate commit and reinstall rc.42. The patch does not migrate or rewrite the persisted note schema.

## Acceptance gate

`FINAL ACCEPTED` is prohibited until all interactive Windows checks pass. Candidate generation is not publication to the stable channel.
