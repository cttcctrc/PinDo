# PinDo GitHub Releases 发布与自动更新

更新仓库：`https://github.com/cttcctrc/PinDo`

## 必要条件

- 仓库必须是 Public。私有仓库更新需要访问令牌，不能把令牌安全地内置到客户端。
- Repository Settings → Actions → General → Workflow permissions 选择 `Read and write permissions`。
- 不需要创建或上传个人 GitHub Token；工作流使用 GitHub 自动提供的临时 `GITHUB_TOKEN`。

## 第一次上传工程

把源码包解压后的内容上传到仓库根目录，确保仓库中可以直接看到：

- `package.json`
- `dist/`
- `electron/`
- `.github/workflows/windows-release.yml`

不要上传 `node_modules`、`release`、`release-update` 或本地便签数据。

## 自动创建 beta 6.10 Release

推荐使用 GitHub 网页或 GitHub Desktop 提交源码，然后创建并推送标签：

`v1.1.0-beta.6.10`

推送标签后，GitHub Actions 会：

1. 在 Windows 环境安装依赖；
2. 运行测试与桌面结构检查；
3. 生成 Windows NSIS 安装程序；
4. 生成 `latest.yml` 和 `.blockmap`；
5. 自动创建 GitHub Release 并上传更新文件。

可以在仓库的 Actions 页面查看进度和错误日志。

## 手动发布备选方案

如果不使用 Actions：

1. 双击 `Windows-生成公网测试版.cmd`；
2. 在 GitHub 仓库进入 Releases → Draft a new release；
3. Tag 填写 `v1.1.0-beta.6.10`；
4. 上传 `release-public` 中的安装程序、`.blockmap` 和 `latest.yml`；
5. 发布为普通 Release，不要保留为 Draft；
6. 三个文件必须来自同一次构建，文件名不得修改。

## 重要的过渡步骤

当前安装的 beta 6.9 仍指向本机 `127.0.0.1`，无法发现 GitHub 更新。需要手动安装一次带 GitHub 更新配置的 beta 6.10。此后 beta 6.11 及后续版本即可从 GitHub Releases 自动更新。

## 后续版本

每次发布需要同步提高：

- `package.json` 或构建配置中的版本号；
- Git 标签，例如 `v1.1.0-beta.6.11`；
- 工作流中的 `PINDO_RELEASE_VERSION`。

正式版发布时，把 `autoUpdater.allowPrerelease` 改为 `false`，版本号改为稳定语义版本，例如 `1.1.0`。
