# Dodo V2 动画接入报告

- 任务：PINDO-DODO-ANIM-INTEGRATION-01
- 基线：`v1.1.0-test.75.42` / `6ccdbff33279c7117553b74b336e310e2331ce27`
- 分支：`feature/dodo-v2-animation-integration`
- 状态：SOURCE INTEGRATED / STATIC VALIDATED；尚未 OWNER ACCEPTED 或 CURRENT
- 原始资产包 SHA-256：`0827bb61d674282d7e89a1838ac82298bef8f83bd294d95e97bb54e63388e256`

## 运行时路径与状态映射

运行时根目录：`dist/assets/dodo/v2/`。原始 ZIP 以 28 个有序分片保存在独立开发分支的 `dodo-pack-parts/`；专用 Candidate 工作流合并后先校验原包 SHA-256，再仅装配 idle、drag、emotion、overlays。安装包不包含分片、reference、README、inventory 或 SHA 清单。

| 状态 | 资产目录/文件 |
|---|---|
| idle_stand | `assets/idle/dodo_idle_stand_loop_v2.webp` |
| stand_to_sit | `assets/idle/dodo_stand_to_sit.webp` |
| idle_sit | `assets/idle/dodo_sit_idle_loop.webp` |
| sit_to_stand | `assets/idle/dodo_sit_to_stand.webp` |
| sit_to_doze | `assets/idle/dodo_sit_to_doze.webp` |
| doze_loop | `assets/idle/dodo_doze_loop.webp` |
| doze_to_stand | `assets/idle/dodo_doze_to_stand.webp` |
| doze_to_sleep | `assets/idle/dodo_doze_to_sleep.webp` |
| sleep_loop | `assets/idle/dodo_sleep_loop.webp` |
| sleep_to_stand | `assets/idle/dodo_sleep_to_stand.webp` |
| stand/sit/doze/sleep/disappointed/melt → drag | `assets/drag/dodo_*_to_drag.webp` |
| drag_hold | `assets/drag/dodo_drag_hold_loop.webp` |
| drag_release_to_fall | `assets/drag/dodo_drag_release_to_fall.webp` |
| fall_loop | `assets/drag/dodo_fall_loop.webp` |
| fall_to_stand | `assets/drag/dodo_fall_to_stand.webp` |
| disappointed | `assets/emotion/dodo_disappointed.webp` |
| disappointed_to_melt | `assets/emotion/dodo_disappointed_to_melt.webp` |
| melt_loop | `assets/emotion/dodo_melt_loop.webp` |
| melt_to_stand | `assets/emotion/dodo_melt_to_stand.webp` |
| blink left/right | `assets/overlays/dodo_eye_*_blink_overlay.webp` |
| mouth_open | `assets/overlays/dodo_mouth_open_overlay.webp` |

每个主动画和 overlay 均从同目录同名 `_anchors.json` 读取锚点。状态与下一跳以 `dodo_animation_state_machine.json` 为准。

## 实现摘要

- `dist/dodo-v2-controller.cjs`：WebCodecs `ImageDecoder` 逐帧播放器、锚点合成、overlay、按需缓存、状态计时、拖拽与落地控制器。
- `dist/app.js`：产品事件适配、180ms/6px 拖拽识别、桌面收纳衔接与窗口物理适配。
- `electron/dodo-physics.cjs`：受限的多显示器窗口落地接口。
- 主动画缓存上限为当前/下一段两个压缩资源；每个播放器仅保留当前解码帧。
- 播放节奏读取 `VideoFrame.duration`，不以固定 18fps 覆盖内嵌时长。
- 主状态切换当帧清除 overlay；CSS 禁用 Dodo 透明度交叉淡化和 ghost。

## 自动化结果

- 186/186 单元与回归测试通过。
- 27/27 WebP 与配套清单存在；运行时不含 reference。
- 1000 次固定种子坐姿会话概率测试处于 30%–40% 验收区间。
- 六个允许状态均映射到统一拖拽链；完成 100 次状态机拖拽/落地循环。
- overlay pivot、允许状态、冲突策略和逐帧锚点结构检查通过。
- 多显示器（含负坐标工作区）ground 边界测试通过。
- Windows 打包、真实 WebP 解码、桌面功能 smoke 与性能对比：等待 Candidate CI。

## 已知问题/待 Owner 验收

1. `stand_to_sit`、`sit_to_doze` 和部分早期 idle 清单沿用 `anchors + timeline` 结构，其余清单使用 `frames` 结构；运行时已做双结构解析。这与资产包说明中的“早期低关键帧资产”一致，未修改素材时长或锚点。
2. 真实触控手感、六种姿态的视觉抓取稳定性、100 次人工连续拖拽、不同缩放比例的 overlay 观感仍需 Windows Candidate 人工验收。
3. 当前分支不会发布 Release、不会更新 `test.yml`，也不会替换测试通道。
