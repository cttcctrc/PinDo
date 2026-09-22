const pkg = require('./package.json');
module.exports = { ...pkg.build, extraMetadata: { version: process.env.PINDO_RELEASE_VERSION || '1.1.0-beta.7.3' }, directories: { ...pkg.build.directories, output: 'release-validation' }, publish: null };
