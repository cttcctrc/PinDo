const pkg = require('../../package.json');
module.exports = {
  ...pkg.build,
  appId: 'com.pindo.canvas-preview',
  productName: 'PinDo Canvas Preview',
  extraMetadata: { main: 'spike/desktop-canvas/main.cjs', version: '0.1.0-preview.2' },
  directories: { output: 'release-canvas-preview' },
  files: [
    'spike/desktop-canvas/*.cjs', 'spike/desktop-canvas/*.html',
    '!spike/desktop-canvas/*.test.cjs', '!spike/desktop-canvas/builder.cjs',
    'electron/windows-desktop-host.cjs', 'electron/windows-desktop-host.ps1',
    'electron/native-paths.cjs', 'electron/canvas-hit-test.cjs', 'dist/assets/pindo-logo.png', 'package.json'
  ],
  publish: null,
  win: { ...pkg.build.win, artifactName: 'PinDo-Canvas-Preview-${version}-${arch}.${ext}' },
  nsis: { ...pkg.build.nsis, createDesktopShortcut: false },
  asarUnpack: ['electron/*.ps1']
};
