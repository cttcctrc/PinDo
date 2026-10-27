// Restore rc.57's desktop routing while keeping one user-facing workflow.
function shouldUseDesktopCanvas({ platform = process.platform, compatibilityEnabled = false } = {}) {
  return platform === 'win32' && !compatibilityEnabled;
}
module.exports = { shouldUseDesktopCanvas };
