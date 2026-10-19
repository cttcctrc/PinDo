# CF-07｜Windows 10 LTSC 2019 黑底根因定位矩阵

状态：根因已收敛，最小修复已实现；等待 LTSC 2019 与正常 Windows 实机回归后才能进入正式测试通道。

## 已确认事实

- 复现版本为 `1.1.0-beta.7.5-rc.37`。
- 异常机为 Windows 10 Enterprise LTSC 2019；现有报告为 `gl=none`、`angle=none`、`directComposition=false`。
- 黑区与右侧标签 Hover Preview 同时出现；现有兼容模式未消除现象。
- `rc.37` 中标签和 Preview 位于同一个 `430 × workArea.height` 的透明 BrowserWindow，并挂载到 Explorer。Preview 出现时，该窗口执行 `setAlwaysOnTop(true, 'floating')` 和 `moveTop()`。
- Desktop Canvas 是另一个覆盖虚拟桌面的透明 BrowserWindow。
- 异常机模式 01（透明 Dock + Explorer）稳定出现黑底；模式 09（同一透明 Dock + 普通顶层）不出现黑底。
- 模式 10、11 出现的是测试背景覆盖区域，不是模式 01 的黑色透明面；这两个全高 Dock 会遮住 Dodo，因此不能作为正式修复。
- 软件渲染诊断包所有已测模式均不出现黑底。软件渲染仅用于对照，没有加入正式启动参数。

## 根因结论

### 已证实

黑底属于 `NativeDock` BrowserWindow，不属于 Desktop Canvas、Dodo 或独立 Preview。触发条件是异常机当前 Chromium 合成路径（`gl=none`、`angle=none`、`directComposition=false`）下，将全透明 NativeDock 挂到 Explorer 桌面层。保持相同内容与透明属性，仅把宿主改为普通顶层窗口（模式 09）即可稳定消除黑底。

`canvas.regionCount=0` 没有被作为根因：模式 09 没有修改 Canvas Hit Test，却能独立消除黑底。该指标仍按下文规则单独核查。

### 推断边界

软件渲染全部不复现说明问题与当前硬件合成路径有关，但现有证据不足以归因到具体驱动缺陷，也不需要通过升级/降级 Electron 或全局关闭硬件加速修复。

## 已关闭的假设

| 编号 | 假设 | 可证伪条件 |
|---|---|---|
| H1 | Explorer 子窗口、透明分层窗口与当前合成路径的组合触发黑区 | 成立：模式 01 复现，模式 09 不复现 |
| H2 | Preview CSS 单独触发黑区 | 排除：模式 09 保留同一内联 Preview 而不复现 |
| H3 | 任何大尺寸透明 Dock 都会触发黑区 | 排除：模式 09 的尺寸与透明属性不变而不复现 |
| H4 | Desktop Canvas 与 Dock 叠加必然触发黑区 | 排除：模式 09 保留 Canvas 而不复现 |
| H5 | `canvas.regionCount=0` 是黑区根因 | 无关联证据；Hit Test 保持不变时模式 09 已消除黑底 |

## 使用方式

1. 安装硬件/当前 Chromium 路径的 `PinDo-CF07-Diagnostics-*.exe`。
2. 该程序使用独立数据目录且关闭云同步；首次运行时新建一张普通便签并拖到右侧收纳区。
3. 右键托盘图标，在“CF-07 模式”子菜单中选择模式；程序会自动重启。
4. 每个模式下 Hover 右侧标签 3 次，每次停留至少 2 秒。
5. 保存全屏截图，文件名使用下表编号；随后从托盘选择“导出 CF-07 诊断报告”。
6. 所有模式完成后，安装 `PinDo-CF07-Software-*.exe`，至少复测 01、05、06、07、09。
7. 两个诊断包不得与正式 PinDo 同时运行；测试完成后退出诊断包再打开正式版。

## 异常 LTSC 2019 结果表

| 编号 | 模式 | Preview | Canvas | Dock 背景 | Dock 宿主 | 黑底 | 截图 | 诊断 JSON |
|---:|---|---|---|---|---|---|---|---|
| 01 | baseline | 内联 | 显示 | 全透明 | Explorer | **出现** | 已收到 | 待交付 |
| 02 | no-hover-preview | 关闭 | 显示 | 全透明 | Explorer | 待测 | `02-no-preview.png` | 待交付 |
| 03 | canvas-hidden | 内联 | 隐藏 | 全透明 | Explorer | 待测 | `03-no-canvas.png` | 待交付 |
| 04 | dock-hidden | 无 | 显示 | — | — | 待测 | `04-no-dock.png` | 待交付 |
| 05 | preview-opaque-top | 独立不透明 | 显示 | 全透明 | Explorer | 待测 | `05-preview-opaque.png` | 待交付 |
| 06 | preview-transparent-top | 独立透明 | 显示 | 全透明 | Explorer | 待测 | `06-preview-transparent.png` | 待交付 |
| 07 | dock-semitransparent-desktop | 内联 | 显示 | 半透明 | Explorer | 待测 | `07-dock-semi-desktop.png` | 待交付 |
| 08 | dock-opaque-desktop | 内联 | 显示 | 不透明 | Explorer | 待测 | `08-dock-opaque-desktop.png` | 待交付 |
| 09 | dock-transparent-top | 内联 | 显示 | 全透明 | 普通顶层 | **不出现** | 已收到 | 待交付 |
| 10 | dock-semitransparent-top | 内联 | 显示 | 半透明 | 普通顶层 | 不出现黑底；测试蒙版遮挡 Dodo | 已收到 | 待交付 |
| 11 | dock-opaque-top | 内联 | 显示 | 不透明 | 普通顶层 | 不出现黑底；测试蒙版遮挡 Dodo | 已收到 | 待交付 |

## 最小修复

- 新增 NativeDock 宿主策略，只在 Windows build `10.0.17763` 且同时检测到 `gl=none`、`angle=none`、`directComposition=false` 时使用模式 09 已验证的透明普通顶层宿主。
- 其他 Windows 10/11、证据不完整的环境及非 Windows 环境继续使用 Explorer 桌面宿主。
- 不修改 Canvas Authority、Hit Test、Canonical State、云同步规则、全局 GPU 参数或 Electron 版本。
- 宿主选择及原因写入诊断日志，便于实机确认实际命中路径。

## 同批 P0 修复

- Todo 拖放以蓝色虚线占位槽的实际位置为最终提交位置，放开鼠标不再依赖横线目标仍然存在。
- 右侧 Hover Preview 禁止生成滚动条，并恢复深色半透明表面。
- Dodo 消息计数使用高优先级红底白字专用样式，避免被通用按钮样式覆盖。

## 自动验证

- `npm test`：160/160 通过。
- `npm run check:desktop`：通过。
- Windows x64 unpacked 构建：通过，`PinDo.exe` 已生成并验证包含新增宿主策略文件。
- Windows smoke：当前 Linux 执行环境没有 Wine，不能运行 Windows EXE；必须由 Windows CI/实机完成。

## `canvas.regionCount=0` 判读

诊断 JSON 同时记录：

- `regionCount`：采集瞬间有效区域数；
- `regionUpdateCount`：Renderer 成功发布次数；
- `regionRejectedCount`：非法区域被拒绝次数；
- `regionLastUpdatedAt`：最近成功发布时间；
- `regionLastNonEmptyAt`：最近非空区域发布时间；
- `rendererReadyAt`：Canvas Renderer 完成加载时间；
- `windowVisible`：采集时 Canvas 是否可见。

判断规则：

- `regionCount=0` 且 `regionUpdateCount>0`、桌面没有 Canvas 便签：优先判定为合法空区域。
- `regionCount=0` 且存在桌面便签、`regionLastNonEmptyAt=null`：判定为区域发布异常，需要单独修复。
- `regionRejectedCount>0`：检查 Renderer 发布的数据，不与透明合成修复合并处理。
- 只有当黑底发生时间与区域状态变化稳定对应时，才建立二者关联。

## Owner Review Gate

进入正式测试通道前仍必须具备：

1. LTSC 2019 上确认诊断日志命中 `win10-17763-no-transparent-compositor`，Hover Preview 不再出现黑底；
2. LTSC 2019 上验证 Dock 标签/Preview 点击、桌面穿透、Dodo 点击以及 Canvas 编辑/拖拽/Resize/Snap；
3. 一台正常 Windows 10/11 确认仍为 `explorer-desktop`，并完成相同回归；
4. 验证 Todo 虚线槽放置、Preview 无滚动条、Dodo 红色计数；
5. Windows CI packaged smoke 通过并产出完整 Candidate 安装器、blockmap 与 `test.yml`。
