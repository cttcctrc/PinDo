function evidenceText(gpuInfo = {}) {
  try { return JSON.stringify(gpuInfo).toLowerCase(); } catch { return ''; }
}

function resolveNativeDockHost({ platform = process.platform, osRelease = '', gpuInfo = {} } = {}) {
  if (platform !== 'win32' || !String(osRelease).startsWith('10.0.17763')) return { host: 'desktop', reason: 'standard-compositor' };
  const evidence = evidenceText(gpuInfo);
  const noAngle = evidence.includes('gl=none') && evidence.includes('angle=none');
  const noDirectComposition = /"directcomposition"\s*:\s*false/.test(evidence);
  return noAngle && noDirectComposition
    ? { host: 'top', reason: 'win10-17763-no-transparent-compositor' }
    : { host: 'desktop', reason: 'compositor-capable-or-unconfirmed' };
}

async function detectNativeDockHost({ app, platform = process.platform, osRelease = '' } = {}) {
  let gpuInfo = {};
  try { gpuInfo = await app.getGPUInfo('basic'); } catch { /* Lack of evidence keeps the standard host. */ }
  return resolveNativeDockHost({ platform, osRelease, gpuInfo });
}

module.exports = { resolveNativeDockHost, detectNativeDockHost };
