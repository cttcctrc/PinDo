function shouldUseDesktopCanvas({ platform = process.platform } = {}) {
  // PinDo has one desktop rendering authority. Compatibility is an internal
  // effects profile and must never select a second window architecture.
  return platform === 'win32';
}

module.exports = { shouldUseDesktopCanvas };
