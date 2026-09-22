const fs = require('node:fs');
const path = require('node:path');

const directory = path.resolve(process.argv[2] || 'release');
const expectedVersion = process.argv[3];
const channel = process.argv[4] || 'latest';
const fail = message => { console.error(`[PinDo] ${message}`); process.exitCode = 1; };

if (!fs.existsSync(directory)) {
  fail(`找不到输出目录：${directory}`);
} else {
  const files = fs.readdirSync(directory);
  const installer = files.find(file => /\.exe$/i.test(file) && !/uninstall/i.test(file));
  const metadata = files.find(file => new RegExp(`^${channel}.*\\.ya?ml$`, 'i').test(file));
  if (!installer) fail('没有生成 Windows 安装程序 .exe。');
  if (!metadata) fail(`没有生成自动更新元数据 ${channel}.yml。`);
  if (metadata && expectedVersion) {
    const contents = fs.readFileSync(path.join(directory, metadata), 'utf8');
    if (!new RegExp(`^version:\\s*["']?${expectedVersion.replaceAll('.', '\\.')}["']?\\s*$`, 'm').test(contents)) fail(`更新元数据版本不是 ${expectedVersion}。`);
  }
  if (!process.exitCode) {
    console.log(`[PinDo] 安装包与更新元数据检查通过：${directory}`);
    console.log(`[PinDo] Installer: ${installer}`);
    console.log(`[PinDo] Metadata: ${metadata}`);
  }
}
