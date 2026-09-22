const path = require('node:path');
const ICON_VERSION = 5;
function createFileIconReader({app, shell, nativeImage}, platform = process.platform, env = process.env) {
  const expand = value => String(value || '').replace(/%([^%]+)%/g, (match, name) => {
    const key = Object.keys(env).find(key => key.toLowerCase() === name.toLowerCase());
    return key ? env[key] : match;
  }).replace(/^"(.*)"$/, '$1');
  return async file => {
    const candidates = [];
    if (platform === 'win32' && /\.lnk$/i.test(file)) {
      try {
        const link = shell.readShortcutLink(file);
        const custom = expand(link.icon).replace(/,\s*-?\d+$/, '');
        if (custom && /\.(png|jpg|jpeg|ico)$/i.test(custom)) {
          try { const image = nativeImage.createFromPath(custom); if (!image.isEmpty()) return image.toDataURL(); } catch {}
        }
        if (custom && path.win32.isAbsolute(custom)) candidates.push(custom);
        // Resolve the executable rather than asking for the .lnk file-type icon.
        // Keep the shortcut itself as the launch path (arguments/workdir matter).
        const target = expand(link.target);
        if (target && path.win32.isAbsolute(target)) candidates.push(target);
      } catch {}
    }
    candidates.push(file);
    for (const candidate of [...new Set(candidates)]) {
      try {
        const image = await app.getFileIcon(candidate, {size: 'large'});
        if (!image.isEmpty?.()) return image.toDataURL();
      } catch {}
    }
    return '';
  };
}
module.exports = {createFileIconReader, ICON_VERSION};
