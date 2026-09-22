const pkg = require('./package.json');
const version = process.env.PINDO_RELEASE_VERSION;
if (!version) throw new Error('PINDO_RELEASE_VERSION is required for a candidate build');
module.exports = { ...pkg.build, extraMetadata: { version }, directories: { ...pkg.build.directories, output: 'release-candidate' }, publish: [{ provider: 'github', owner: 'cttcctrc', repo: 'PinDo', channel: 'test', releaseType: 'prerelease' }] };
