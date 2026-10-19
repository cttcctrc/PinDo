const pkg = require('./package.json');
const version = process.env.PINDO_RELEASE_VERSION;
if (!version) throw new Error('PINDO_RELEASE_VERSION is required for a CF-07 diagnostic build');

module.exports = {
  ...pkg.build,
  appId: 'com.pindo.cf07-diagnostics',
  productName: 'PinDo CF-07 Diagnostics',
  extraMetadata: { version, canvasCandidate: true, canvasModeDefault: true, cf07Diagnostics: true },
  directories: { ...pkg.build.directories, output: 'release-cf07-diagnostic' },
  publish: null,
  win: { ...pkg.build.win, artifactName: 'PinDo-CF07-Diagnostics-${version}-${arch}.${ext}' }
};
