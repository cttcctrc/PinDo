const crypto = require('node:crypto');

function analyzeBitmap(bitmap, size = {}) {
  const bytes = Buffer.isBuffer(bitmap) ? bitmap : Buffer.from(bitmap || []);
  const pixels = Math.floor(bytes.length / 4);
  let transparentPixels = 0;
  let nearBlackPixels = 0;
  let opaquePixels = 0;
  for (let offset = 0; offset + 3 < bytes.length; offset += 4) {
    const blue = bytes[offset];
    const green = bytes[offset + 1];
    const red = bytes[offset + 2];
    const alpha = bytes[offset + 3];
    if (alpha === 0) transparentPixels += 1;
    if (alpha >= 250) opaquePixels += 1;
    if (alpha > 0 && red <= 8 && green <= 8 && blue <= 8) nearBlackPixels += 1;
  }
  const ratio = value => pixels ? Number((value / pixels).toFixed(6)) : 0;
  return {
    width: Number(size.width) || 0,
    height: Number(size.height) || 0,
    pixelCount: pixels,
    empty: pixels === 0,
    transparentRatio: ratio(transparentPixels),
    opaqueRatio: ratio(opaquePixels),
    nearBlackRatio: ratio(nearBlackPixels),
    pixelDigest: crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  };
}

async function captureWindowSurface(win) {
  const startedAt = Date.now();
  const image = await win.webContents.capturePage();
  return { ...analyzeBitmap(image.toBitmap(), image.getSize()), durationMs: Date.now() - startedAt };
}

module.exports = { analyzeBitmap, captureWindowSurface };
