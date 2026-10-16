const pkg = require('./package.json');
const version = process.env.PINDO_RELEASE_VERSION;
if (!version) throw new Error('PINDO_RELEASE_VERSION is required for a candidate build');
module.exports = { ...pkg.build, extraMetadata: { version, canvasModeDefault: true, opaqueWindowDiagnostic: process.env.PINDO_OPAQUE_DIAGNOSTIC === '1', surfaceContinuityDiagnostic: process.env.PINDO_SURFACE_CONTINUITY_DIAGNOSTIC === '1', nativeOcclusionDiagnostic: process.env.PINDO_NATIVE_OCCLUSION_DIAGNOSTIC === '1' }, directories: { ...pkg.build.directories, output: 'release-candidate' }, publish: [{ provider: 'github', owner: 'cttcctrc', repo: 'PinDo', channel: 'test', releaseType: 'prerelease' }] };
