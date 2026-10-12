# PinDo 当前测试版本集中修复报告

分支：`fix/current-test-concentrated-fixes`  
基线：`dcaf125`（`1.1.0-beta.7.5-rc.40` 发布工作流提交）  
状态：源码修复与自动回归完成；Windows Candidate 和实机 Gate 待完成。

## 范围与结论

| 项目 | Root Cause | 最小修复 | 当前状态 |
|---|---|---|---|
| P0-01 显示桌面后黑块 | Canvas 只在首次启动时挂载 Explorer。Win+D、Explorer 重启、显示设置或 DWM 合成生命周期变化后，旧父窗口/合成表面可能失效；既有 fallback 只覆盖首次挂载失败与 Renderer 崩溃。 | 监听 `WM_SHOWWINDOW`、`WM_SETTINGCHANGE`、`WM_DISPLAYCHANGE`、`WM_DWMCOMPOSITIONCHANGED` 和窗口 restore；事件触发时结束编辑/手势、重新验证 Explorer 宿主、使窗口失效并重新发布 Hit Test 区域。重新挂载失败立即进入既有 Native Window fallback。没有新增轮询或定时强刷。 | 自动测试通过；Win10 LTSC 2019 与正常 Win10/11 实机录屏待 Gate。 |
| P0-02 Todo 排序跳动 | 拖动源仍占据列表布局，同时又插入等高 Placeholder，导致几何位置翻倍变化；PointerMove 中反复清除/插入 Placeholder 并触发 FLIP 测量，碰撞基准持续移动；取消路径和提交路径未统一。 | 拖动源脱离布局并隐藏，Placeholder 原位替换；基于稳定行中心计算槽位，槽位变化时才重排；边缘自动滚动有界；PointerCancel、LostPointerCapture、Window Blur 统一取消；PointerUp 只提交一次。 | 自动测试通过；Windows 实机录屏待 Gate。 |
| P1-01 提醒时间变更 | 提醒撤回主要发生在 Renderer 本地状态。独立 Note Renderer 保存单个便签时无法原子更新全局提醒状态，旧 active/email 项和迟到的全量状态写入可能恢复旧提醒。时间轴提醒也缺少完整 key 校验。 | 在 Canonical `NoteStateStore` 边界统一 reconcile：Todo/Timeline 的当前内容、时间、完成状态或存在性与提醒 key 不一致时，原子移除 active/email 项，并将已经显示的旧 key 标记 handled。Note 更新、全量状态写入和载入均经过同一规则。 | 自动状态测试通过。 |
| P1-02 空内容删除 | 删除/完成逻辑没有共享的“有效用户内容”定义；空标签、`&nbsp;`、换行和零宽字符会被当作内容写入回收站或 Todo 历史。 | 新增共享内容规则，语义化清洗 HTML/空白/零宽字符；空便签直接删除、不进入回收站，空 Todo 完成不进入历史。有意义的自定义标题、文本、时间轴节点、图片或 Organizer 引用仍保留。对象从 canonical notes 删除，既有云同步删除传播不变。 | 纯函数与 Native 删除状态测试通过。 |
| P1-03 Organizer 规则审计 | 未发现与目标规则冲突。当前 Organizer 保存绝对路径引用和图标展示数据，打开/定位通过 Shell；没有移动、复制、重命名、删除或写入桌面文件。Organizer 已位于 device-local cloud authority。 | 不做数据迁移，不改 Authority。新增静态安全测试与路径审计报告，防止后续引入真实文件变更。 | 审计通过；真实 Windows/OneDrive 场景回归待 Gate。 |

## P0-01 事实与推测边界

已确认的代码事实：Canvas 首次挂载后没有处理 Show Desktop、Explorer/DWM 生命周期；窗口异常关闭会失去 Canvas；现有 Native fallback 可在 Canvas 激活失败时保证便签可访问。

当前 Root Cause 是从生命周期缺口与 Windows 透明子窗口行为得出的工程结论。自动测试已证明对应事件会重新验证宿主，且失败时进入 fallback。黑块的最终“修复前/后”证据必须由可复现 Windows 设备提供，不能用 Linux 测试或静态检查替代。

## 新增/更新测试

- `electron/desktop-canvas-manager.test.cjs`
  - Show Desktop/合成生命周期触发重新挂载；
  - 重新挂载失败进入 Native fallback；
  - 原有 Hit Test、Focus、Gesture、显示器布局测试继续回归。
- `electron/todo-reorder-state.test.cjs`
  - 上移、下移；
  - 连续拖动、快速跨项；
  - 取消、一次性提交；
  - 自动滚动边界；
  - 序列化/重启后顺序保持。
- `electron/reminder-lifecycle.test.cjs`
  - Todo 时间变更撤回旧弹窗和队列；
  - Todo 完成/删除及 stale write 不恢复旧提醒；
  - Timeline 时间变更/完成撤回旧提醒。
- `electron/content-lifecycle.test.cjs`
  - 空 HTML、空格、换行、`&nbsp;`、零宽字符；
  - 有效文本、图片、时间轴与 Organizer 引用。
- `electron/native-features.test.cjs`
  - Native 删除有内容便签进入回收站；
  - 空便签不进入回收站。
- `electron/organizer-authority.test.cjs`
  - Organizer 仅引用路径；
  - 禁止文件移动、复制、删除、写入和快捷方式创建；
  - Windows Desktop 与 OneDrive Desktop 路径保持本机不透明引用。
- `electron/p0-interaction-regressions.test.cjs`
  - Renderer 使用稳定槽位、自动滚动、丢失 Pointer 取消和源行脱离布局。

## 当前验证结果

- `npm test`：`175/175` 通过。
- `npm run check:desktop`：通过。
- JavaScript 语法检查：通过。
- `git diff --check`：通过。
- Windows x64 unpacked 交叉打包：通过；当前 Linux 环境因没有 Wine，NSIS 安装器阶段无法执行，安装包与 packaged smoke 待独立 Windows CI。
- Windows 10 LTSC 2019 修复前后录屏：待可复现设备。
- 正常 Windows 10/11 回归录屏：待实机。

## Windows 实机 Gate

发布测试通道前必须完成并记录：

1. LTSC 2019：Win+D、任务栏显示桌面、最大化/还原、Explorer 重启各重复 5 次；验证无黑块，或在重挂载失败时自动切到 Native Window 且便签可访问。
2. 正常 Win10/11：重复同组场景，确认 Canvas 仍挂载桌面且无行为回退。
3. 两台设备均回归：桌面点击穿透、便签点击/编辑/退出再编辑、Drag、Resize、Snap、右侧 Preview、Dodo。
4. Todo：上移、下移、连续拖动、快速跨 3 项、取消、滚动列表、重启保持；录制 Pointer 与 Placeholder 同屏证据。
5. Reminder：修改时间时撤回旧弹窗；完成/删除后等待超过原提醒时间确认不再出现。
6. Organizer：普通 Desktop 与 OneDrive Desktop 的文件、文件夹、快捷方式完成移入/移出显示分组、外部重命名/删除/移动、崩溃重启与重装；核对真实文件位置和内容未变化。
7. 云同步：普通便签删除状态可传播；Organizer 状态始终仅本机，历史云端 Organizer 不覆盖本机。

在以上证据齐全且 Owner Review 通过前，Candidate 只能作为下载工件，不得发布到测试更新通道。
