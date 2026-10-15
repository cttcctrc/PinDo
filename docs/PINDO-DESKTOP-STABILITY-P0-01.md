# PINDO-DESKTOP-STABILITY-P0-01

Status: rc.44 passed EDIT-FLICKER-01 real-machine acceptance and captured the CF-08 Show Desktop lifecycle; rc.45 validation pending.

Baseline: `1.1.0-beta.7.5-rc.42`  
Failed candidate: `1.1.0-beta.7.5-rc.43`

Next fix candidate: `1.1.0-beta.7.5-rc.45`
Branch: `fix/pindo-ux-org-01`

## Root-cause findings

### EDIT-FLICKER-01

Reproduction path: click a native desktop note or open/switch to another window. The rc.43 recording shows flicker around mouse focus changes, rather than requiring text input.

Evidence:

- `applyNativeSnapshot()` replaced the whole note DOM whenever canonical content differed. It had no active-editor or IME-composition guard.
- A stale note version returned `conflict`, but the renderer discarded the result and did not retry the active draft.
- Every note `pointerdown` sent `focus-note`. The native command called `activate()` and then `moveTop()`, while `activate()` called `moveTop()` again.
- Focus promoted an Explorer-hosted desktop note to a top-level window; blur attached it back. In the supplied rc.43 log, a click started promotion at 05:12:36.569 and it completed about 1.15 seconds later. Opening another window started the reverse attach at 05:13:00.712 and it completed about 1.16 seconds later.
- The log also contains 78 `active-changed` events, including duplicates while the effective state was unchanged.

Root cause: rc.43 fixed the editor-snapshot race but retained a native focus policy that reparented the transparent Chromium surface on ordinary clicks and window switches. Duplicate activation and `moveTop()` calls amplified the visible compositor transition.

Real-machine result: rc.44 no longer flickers on note clicks or when other windows are opened. EDIT-FLICKER-01 is accepted for this environment, subject to regression coverage in the combined P0 matrix.

Fix:

- Defer DOM replacement while an editor or IME composition owns the draft.
- Save after composition end and on editor blur; retry one version conflict while preserving canonical geometry/mode/lock fields.
- Keep `desktop` notes Explorer-hosted across focus and blur. Only explicit `top` mode may use a top-level/TopMost window.
- Make activation idempotent, remove the duplicate `moveTop()`, and prevent renderer-load completion from reviving the old promotion policy.
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

Reproduction path: invoke Win+D with several Explorer-hosted transparent note windows visible. In the supplied recording, multiple dark organizer notes lose their rendered content and leave exact black window-sized rectangles; a white Todo remains visible.

Evidence:

- rc.43 diagnostics report the affected organizer windows as `explorer-desktop`; the failure is therefore not limited to promoted top-level notes.
- No Electron `minimize` event was recorded during Win+D, so the rc.43 recovery handler did not execute for Explorer child windows.
- The surviving white Todo reported native `alwaysOnTop=true` while manager state said `promoted=false` and `top=false`, proving native and internal window state had diverged.
- The environment remains the high-risk LTSC 2019 software-composition path (`gl=none`, `angle=none`, DirectComposition disabled), but this is exposure evidence, not proof that the display driver is the sole cause.

Root cause: rc.44 captured the exact lifecycle. Win+D sends every Explorer-hosted note `WM_SHOWWINDOW(0)` followed by `WM_SHOWWINDOW(1)` only 1–3 ms later, without `WM_SIZE/SIZE_MINIMIZED`, Electron `minimize`, a host change, or an internal visibility change. Chromium therefore keeps the note logically visible and does not schedule a repaint. On LTSC 2019 without DirectComposition, the restored transparent child surface exposes a black backing surface until a later compositor refresh.

Fix:

- Retain the safe `WS_MINIMIZE` clearing already present in native host transitions.
- Continue recording `WM_SHOWWINDOW`, `WM_SIZE`, `WM_SETTINGCHANGE`, `WM_DISPLAYCHANGE`, `WM_STYLECHANGED`, `WM_DWMCOMPOSITIONCHANGED`, and Electron restore events with both message parameters.
- When and only when a desktop note receives the observed `WM_SHOWWINDOW(0→1)` pair, request one full Chromium repaint through `webContents.invalidate()`.
- The correction does not poll, delay, reattach the Explorer host, call Hide/Show, reload, or reconstruct the BrowserWindow.

## Diagnostics

The candidate records privacy-safe events for window create/destroy, show/hide, focus/blur, host attach/promote/failure, TopMost, bounds, Note Mode, park/unpark, editor mount/unmount, composition start/end, renderer load/reload/crash, Electron minimize/restore, and selected native lifecycle messages around Show Desktop/compositor changes.

Each event contains timestamp (added by the existing diagnostics writer), SHA-256-truncated anonymous note ID, native window ID, reason, state version, and before/after window state. It does not contain note text, typed keys, account data, or file paths.

## Automated evidence

- `npm test`: 187 passed, 0 failed.
- `npm run check:desktop`: passed.
- `git diff --check`: passed.
- New race regressions cover park-during-load, activation during a pending attach, Win+D minimize/reattach without BrowserWindow recreation, focus/blur without desktop reparenting, native lifecycle telemetry, and a single renderer invalidation after the observed Show Desktop hide/restore pair without host or visibility churn.
- New editor policy tests cover local-draft/canonical-shell merge and IME/editor snapshot deferral.

## Windows acceptance matrix

Partially accepted. rc.44 confirms that click/window-switch flicker is removed on Windows 10 LTSC 2019 Build 17763. CF-08 remains open until rc.45 proves that Win+D no longer creates black rectangles. The full requested interactive matrix is still required before final Owner acceptance.

## Risk and rollback

- Risk: LTSC-specific compositor behavior cannot be fully proven by Linux-hosted unit tests or a generic `windows-latest` CI runner.
- Risk: an Explorer host failure deliberately leaves the note accessible as a top-level fallback and records the failure; this may temporarily differ from desktop-layer ordering.
- Performance: parked-window caching remains capped at eight, so collapse/expand performance is unchanged; no cache removal or broad refactor was made.
- Rollback: reinstall rc.43 (or rc.42) and revert the rc.44 candidate commit. The patch does not migrate or rewrite the persisted note schema.

## Acceptance gate

`FINAL ACCEPTED` is prohibited until all interactive Windows checks pass. Candidate generation is not publication to the stable channel.
