# Desktop Organizer 真实文件路径与 Authority 审计

结论：现有实现符合“只管理显示分组，不改变 Windows Desktop 目录真实文件位置”的目标规则。未发现需要迁移的破坏性历史实现，因此本轮不执行任何批量文件操作。

## 数据流审计

| 操作 | 当前实现 | 是否修改真实文件 |
|---|---|---:|
| 导入文件/文件夹/快捷方式 | `fs.stat(path)` 校验后保存本机绝对路径引用、名称、类型和显示图标 | 否 |
| 打开项目 | 对已保存路径调用 `shell.openPath(path)` | 否 |
| 在资源管理器中显示 | 对已保存路径调用 `shell.showItemInFolder(path)` | 否 |
| 移入整理框 | 向 `desktopItems` 增加引用 | 否 |
| 移出整理框 | 从 `desktopItems` 删除引用 | 否 |
| 排序/显示方式/图标大小 | 只更新 Organizer note 的本地展示状态 | 否 |
| PinDo 卸载/崩溃 | 可能影响 PinDo 本机状态，不操作被引用文件 | 否 |
| 云同步 | Cloud payload 排除 Organizer；远端合并后重新组合完整本机 Organizer | 否 |

源码扫描确认 Organizer 通路不调用：`fs.rename`、`fs.copyFile`、`fs.unlink`、`fs.rm`、`fs.writeFile`、`fs.mkdir`、`shell.trashItem`、`shell.writeShortcutLink`。

## 路径类型

- `C:\Users\<user>\Desktop\...`：按原始绝对路径保存，本机引用。
- `C:\Users\<user>\OneDrive\Desktop\...`：不重写为本地 Desktop，也不解析为云对象；仍是本机路径引用。
- `.lnk`：读取目标仅用于图标/描述能力；不启动、不改写、不替换快捷方式。
- 文件夹：保存并打开原路径；不搬迁目录及其内容。

## 外部变化行为

- 用户在 Explorer 中重命名、删除或移动文件后，旧卡片可能成为 stale reference。
- 打开 stale reference 时 Shell 返回错误，不会反向创建、恢复、移动或删除文件。
- 用户可移除旧引用并重新导入新路径；这是展示引用更新，不是文件迁移。

这属于当前引用模型的安全降级。自动追踪 NTFS File ID 或自动修复路径会引入新功能和额外 Authority，本轮不实施。

## 云同步边界

Organizer note、`desktopItems`、排序、位置、显示方式、图标大小、本机路径与图标均为 device-local。Cloud payload 不包含 Organizer；远端旧 Organizer 不能创建、覆盖、删除或恢复当前设备的 Organizer。该规则由既有 cloud authority tests 和本轮 organizer authority tests 共同覆盖，本轮没有修改该边界。

## 数据安全判断

- 无真实文件迁移，因此不需要迁移脚本或回滚文件操作。
- 无新增文件系统写权限。
- PinDo 数据备份只覆盖应用状态，不复制或打包用户桌面文件。
- 实机 Gate 仍需以文件 SHA-256/目录位置前后对比验证普通 Desktop 与 OneDrive Desktop 场景。
