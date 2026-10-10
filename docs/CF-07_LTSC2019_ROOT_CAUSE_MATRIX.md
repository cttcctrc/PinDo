# CF-07｜Windows 10 LTSC 2019 黑底根因定位矩阵

状态：Phase 1 诊断 Candidate，尚未形成根因结论，禁止发布到正式测试通道。

## 已确认事实

- 复现版本为 `1.1.0-beta.7.5-rc.37`。
- 异常机为 Windows 10 Enterprise LTSC 2019；现有报告为 `gl=none`、`angle=none`、`directComposition=false`。
- 黑区与右侧标签 Hover Preview 同时出现；现有兼容模式未消除现象。
- `rc.37` 中标签和 Preview 位于同一个 `430 × workArea.height` 的透明 BrowserWindow，并挂载到 Explorer。Preview 出现时，该窗口执行 `setAlwaysOnTop(true, 'floating')` 和 `moveTop()`。
- Desktop Canvas 是另一个覆盖虚拟桌面的透明 BrowserWindow。
- 以上只能确定窗口拓扑，不能单独证明 GPU、CSS、Dock 或 Canvas 是根因。

## 待验证假设（不是结论）

| 编号 | 假设 | 可证伪条件 |
|---|---|---|
| H1 | Explorer 子窗口、透明分层窗口与 Hover 时层级切换的组合触发黑区 | Dock 改为普通顶层透明窗口后仍完全同样复现 |
| H2 | Preview 的 opacity/transform 合成层触发黑区 | 关闭内联 Preview 后仍复现，或独立透明 Preview 不复现但 Dock 仍复现 |
| H3 | Dock 大尺寸透明窗口本身触发黑区 | 隐藏 Dock 后仍复现；或同宿主的不透明 Dock 同样复现 |
| H4 | Desktop Canvas 与 Dock 叠加触发黑区 | 隐藏 Canvas 后仍复现 |
| H5 | `canvas.regionCount=0` 与黑区存在时间关联 | regionCount 正常非零时同样稳定复现，且窗口矩阵改变可独立消除黑区 |

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
| 01 | baseline | 内联 | 显示 | 全透明 | Explorer | 待测 | `01-baseline.png` | 待交付 |
| 02 | no-hover-preview | 关闭 | 显示 | 全透明 | Explorer | 待测 | `02-no-preview.png` | 待交付 |
| 03 | canvas-hidden | 内联 | 隐藏 | 全透明 | Explorer | 待测 | `03-no-canvas.png` | 待交付 |
| 04 | dock-hidden | 无 | 显示 | — | — | 待测 | `04-no-dock.png` | 待交付 |
| 05 | preview-opaque-top | 独立不透明 | 显示 | 全透明 | Explorer | 待测 | `05-preview-opaque.png` | 待交付 |
| 06 | preview-transparent-top | 独立透明 | 显示 | 全透明 | Explorer | 待测 | `06-preview-transparent.png` | 待交付 |
| 07 | dock-semitransparent-desktop | 内联 | 显示 | 半透明 | Explorer | 待测 | `07-dock-semi-desktop.png` | 待交付 |
| 08 | dock-opaque-desktop | 内联 | 显示 | 不透明 | Explorer | 待测 | `08-dock-opaque-desktop.png` | 待交付 |
| 09 | dock-transparent-top | 内联 | 显示 | 全透明 | 普通顶层 | 待测 | `09-dock-transparent-top.png` | 待交付 |
| 10 | dock-semitransparent-top | 内联 | 显示 | 半透明 | 普通顶层 | 待测 | `10-dock-semi-top.png` | 待交付 |
| 11 | dock-opaque-top | 内联 | 显示 | 不透明 | 普通顶层 | 待测 | `11-dock-opaque-top.png` | 待交付 |

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

进入最小修复前必须具备：

1. LTSC 2019 上至少一个稳定复现模式；
2. LTSC 2019 上至少一个稳定不复现模式；
3. 对应截图、诊断 JSON、窗口 ID/尺寸/透明属性/宿主层级；
4. 当前路径与软件路径的对照；
5. 一台正常 Windows 10/11 的 baseline 回归；
6. 明确 Root Cause（事实）与残余推测，并选择 A/B/C/D 中一个最小修复方向。
