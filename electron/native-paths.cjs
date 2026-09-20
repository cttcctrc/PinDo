const path = require('node:path');

// PowerShell cannot open a script through Electron's virtual app.asar path.
// Rewrite only that exact path segment while preserving the separator style
// supplied by Windows (or by a platform-independent unit test).
function resolveUnpackedBase(base) {
  return String(base).replace(
    /([\\/])app\.asar(?=([\\/]|$))/i,
    '$1app.asar.unpacked'
  );
}

function nativeScript(name, base = __dirname) {
  return path.join(resolveUnpackedBase(base), name);
}

module.exports = { nativeScript, resolveUnpackedBase };
