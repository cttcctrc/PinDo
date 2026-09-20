# Dodo 角色资产说明

## 当前接入

- `standing.png`：动态素材尚未加载时的标准站立兜底图。
- `tucked-idle.png` / `tucked-hover.png`：左右侧收纳状态的静态图。
- `animations/`：运行时使用的透明 WebP 逐帧动画；不再随安装包携带参考图和弃用草稿。

## reference 状态资产

- `24c9f117-5af7-4a86-b1cb-f233d1d68def.png`：玩球。
- `29b2b0af-3fe3-4c05-a1a0-c951829f3d44.png`：吃东西。
- `5a6fb22c-9f96-451e-8c9a-9e0ad28a35ac.png`：基础角色与右侧探头。
- `a1667740-0a2c-4b53-b15b-cb423635fdbe.png`：前扑/伸展。
- `efdd238b-9c99-4910-a71b-9988acbcfdbe.png`：翻肚皮。
- `f1d029c1-8283-48dd-8fb0-224ce835dca9.png`：趴睡。

## 后续动画状态建议

优先制作六个可循环状态：`idle` 待机呼吸、`notify` 消息提醒、`drag` 被拖动、`dock` 侧边收纳、`complete` 完成任务、`sleep` 长时间无操作。桌面端建议使用透明 WebP/APNG 或 Lottie；若要保持手绘笔触和复杂形变，优先使用透明 WebP 序列。
