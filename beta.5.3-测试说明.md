# PinDo 1.1.0-beta.5.3

本次针对 Dodo 黑色区域和快捷方式图标进行修正。

- Windows 在应用启动前关闭硬件加速，避免部分显卡驱动的透明窗口合成残影。Dodo 相关区域取消背景模糊和图片滤镜；动画仍按原帧率播放。
- .lnk 优先解析到目标程序读取图标；保留原 .lnk 启动路径和参数。已有项目启动后自动刷新图标，不需要重新拖入。自定义 PNG/ICO 图标优先读取；特殊 DLL 索引图标暂以目标程序图标回退。
- 无法读取图标时回退原文件图标，不影响打开功能，不删除任何便签。

测试步骤：
1. 从系统托盘彻底退出旧版 PinDo。
2. 将新包内文件覆盖原工程文件夹（保留原有 node_modules）。
3. 在工程目录运行 npm start。无需重新制作安装包。
4. 测试 Dodo 左右收纳、展开、拖动、提醒和菜单，观察原黑色区域是否完全消失。
5. 查看原有 Chrome/Word 快捷方式图标，并测试双击打开。

本次通过 Node 自动测试和语法检查；未在你的 Windows/显卡环境实测。软件渲染可能增加 CPU 占用，如动画卡顿或黑框仍出现，请反馈截图、Windows 版本及显卡型号。此版本没有修改杀毒软件设置。

技术依据：Electron app.disableHardwareAcceleration（必须在 ready 前调用）和 shell.readShortcutLink 官方 API。
https://www.electronjs.org/docs/latest/api/app#appdisablehardwareacceleration
https://www.electronjs.org/docs/latest/api/shell#shellreadshortcutlinkshortcutpath-windows
