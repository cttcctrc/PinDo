const fs = require('node:fs');
const path = require('node:path');

function missingDesktopIntegrationFromSources(main, renderer) {
  const checks = [
    ['主程序接入独立便签窗口', main.includes('new NoteWindowManager(')],
    ['主程序同步便签状态与窗口', main.includes('noteWindowManager.sync(')],
    ['主程序控制窗口与便签窗口分离', main.includes("controlWindow: '1'")],
    ['便签窗口只渲染自己的内容', renderer.includes('noteWindowId')],
    ['独立窗口保存单张便签', renderer.includes('writeNote(')]
  ];
  return checks.filter(([, done]) => !done).map(([label]) => label);
}

function missingDesktopIntegration(root) {
  const main = fs.readFileSync(path.join(root, 'electron', 'main.cjs'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'dist', 'app.js'), 'utf8');
  return missingDesktopIntegrationFromSources(main, renderer);
}

if (require.main === module) {
  const missing = missingDesktopIntegration(path.join(__dirname, '..'));
  if (missing.length) {
    console.error('桌面版尚未完成，已阻止生成会冒充新版的旧窗口安装包。');
    for (const label of missing) console.error(`  - ${label}`);
    process.exitCode = 1;
  } else console.log('桌面版结构检查通过；仍需在 Windows 实机测试桌面挂载与交互。');
}

module.exports = { missingDesktopIntegration, missingDesktopIntegrationFromSources };
