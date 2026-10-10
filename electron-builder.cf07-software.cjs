const base = require('./electron-builder.cf07-diagnostic.cjs');

module.exports = {
  ...base,
  appId: 'com.pindo.cf07-diagnostics.software',
  productName: 'PinDo CF-07 Diagnostics Software',
  extraMetadata: { ...base.extraMetadata, cf07SoftwareRendering: true },
  directories: { ...base.directories, output: 'release-cf07-software' },
  win: { ...base.win, artifactName: 'PinDo-CF07-Software-${version}-${arch}.${ext}' }
};
