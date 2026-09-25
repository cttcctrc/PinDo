const pkg = require('./package.json');

// A separate app ID and userData keep this install away from the existing PinDo.
module.exports = {
  ...pkg.build,
  appId: 'com.pindo.canvas-test',
  productName: 'PinDo Canvas Test',
  extraMetadata: { version: '0.2.0-preview.1', canvasCandidate: true },
  directories: { ...pkg.build.directories, output: 'release-canvas-candidate' },
  publish: null,
  win: { ...pkg.build.win, artifactName: 'PinDo-Canvas-Test-${version}-${arch}.${ext}' }
};
