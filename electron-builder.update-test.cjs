const pkg = require('./package.json');

module.exports = {
  ...pkg.build,
  extraMetadata: { version: '1.1.0-beta.6.9' },
  directories: { ...pkg.build.directories, output: 'release-update' }
};
