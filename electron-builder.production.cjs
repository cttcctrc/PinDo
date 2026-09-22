const pkg = require('./package.json');

const version = process.env.PINDO_RELEASE_VERSION || '1.1.0-beta.6.14';

module.exports = {
  ...pkg.build,
  extraMetadata: { version },
  directories: { ...pkg.build.directories, output: 'release-public' },
  publish: [{ provider: 'github', owner: 'cttcctrc', repo: 'PinDo', releaseType: 'release' }]
};
