> Historical recovery log. Current beta.4 build instructions and limitations are in README-先读这里.md. Descriptions below refer to earlier checkpoints, not the current integration.

# PinDo Windows source recovery

Recovered on 2026-09-14 from the previously delivered `PinDo-Portable-1.0.0.exe`.

The contents under `dist/`, `electron/` and the packaged `package.json` were extracted from the Electron `app.asar`; each file was checked against its archive SHA-256 digest. No Windows executable was run. This is the exact packaged application source, **not** the original complete development repository: build scripts, electron-builder configuration, `node_modules`, installer signing keys and uncommitted changes are not included.

The recovered application still uses a single BrowserWindow. It does not implement independent desktop note windows or Windows desktop-host attachment. The more recent changes discussed in chat cannot be assumed to be present in this package until recreated and tested.

## 2026-09-14 development checkpoint

`electron/note-window-manager.cjs` and `electron/note-state-store.cjs` are new, isolated building blocks with six passing Node tests. They are not wired to the production application. The existing app still opens a single window and remains unchanged in behavior. This archive is source only, **not** a working new Windows release.

## Desktop host experiment

`electron/windows-desktop-host.cjs` and `windows-desktop-host.ps1` now express the Windows Explorer desktop-host attachment path; the note window manager invokes the adapter for desktop-mode windows and keeps top-mode windows separate. Ten Node tests pass for the window-management logic. The PowerShell/Win32 operation has **not** been compiled or exercised on Windows and may be blocked by local script policy or Explorer/DPI differences. It is not connected to the existing single-window UI, not approved as a production desktop-host implementation, and should not be built into an installer without Windows validation. A compiled helper may replace the script for enterprise deployment.

## Local Windows build preparation

GitHub is not required. `Windows-一键打包.cmd` is the local build entry point; Node.js and npm must be installed on the user's Windows PC, and the first build must be able to fetch dependencies. The stable Electron and electron-builder versions are specified in `package.json`. Builds target an x64 NSIS installer in `release/`. The Dodo tray source is included as an extra resource; the 8.8 MB of unused Dodo reference art is omitted from packaging. No updater server or code-signing certificate is configured yet; the previous update UI explicitly reports the absence of a feed. An unsigned test installer may trigger a Windows reputation warning, so do not present it as a signed production release.

The build entry point **intentionally refuses to package at this checkpoint**: the recovered UI has not yet been validated on Windows with the Explorer desktop host. Both the desktop readiness check and the local build script must pass before making any installer. `node --test` passes the JavaScript unit tests; these tests do not validate Windows Explorer hosting, positioning, or actual drag/resize. Once source integration is complete, run the build script on a real Windows machine and test desktop mode, top mode, Dodo, editing, persistence, and shell restarts before giving users an installer.

## Independent-window data channel (work in progress)

The new `electron/note-ipc.cjs` module checks the Electron sender's actual main frame and native note window before granting access to any note. A note can only read or write its own ID; each update checks its per-note version and persists via the canonical `NoteStateStore`. Full-app writes require an explicit global revision. `electron/preload.cjs` exposes the matching narrow note API, but the old renderer and `electron/main.cjs` have not been migrated to this protocol, and native note windows are not yet launched. Do not disable the release guard to ship this work-in-progress as an installer.

The migration is now partially connected: `electron/main.cjs` owns the canonical store and starts `NoteWindowManager`; `pindo:state-changed` broadcasts accepted control-window writes; and the renderer has a `?noteWindow=<id>` mode that renders only that note, uses the scoped `pindoNote` IPC, and forwards native move/resize bounds. The main BrowserWindow now loads `?controlWindow=1` as a frameless, transparent Dodo/settings-only control surface; note contents are no longer painted a second time in that window. Windows still needs a real integration test for Explorer desktop hosting, startup placement, and the tray-to-control workflow before this can be called production-ready.

Quit/update cleanup now explicitly destroys every native note window before Electron exits, reducing the chance of orphaned Explorer child windows. Coordinate behavior after a monitor/DPI change still requires Windows validation.

## 2026-09-16 beta.5

修复 native blur 关闭、激活窗口层级、拖放真实路径补全、ASAR 外部脚本路径、钉图比例、边缘提示、UI 缩放、日期禁选和安装版首次登录启动注册。早期恢复用的参考图和未接入草稿已在 beta.6.4 清理；运行包只保留实际使用的动画与静态兜底图。细节见 README。

## 2026-09-17 beta.5.1

修正 Windows 打包前 `Windows helpers resolve outside ASAR...` 测试可能因路径分隔符差异误报失败的问题。ASAR 路径段替换改为独立的纯函数，分别精确验证 Windows 与 POSIX 路径；31 项测试重新通过。

## 2026-09-17 beta.5.2

纠正上条记录：beta.5.1 仅在 Linux 下测试通过，仍遗留一处硬编码 POSIX 开发路径的断言。已用 Node 的 win32 路径实现复现原测试失败，改为平台对应的期望值，原测试在模拟 Windows 路径规则下通过。额外验证 Windows 盘符、空格和 UNC 路径，全部 33 项测试通过；运行时代码保持 beta.5.1 的行为。
