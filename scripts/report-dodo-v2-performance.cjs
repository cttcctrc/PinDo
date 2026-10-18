const fs = require('node:fs');
const path = require('node:path');

const [baselineDir, candidateDir, outputDir] = process.argv.slice(2).map(value => path.resolve(value));
if (!baselineDir || !candidateDir || !outputDir) throw new Error('usage: report-dodo-v2-performance BASELINE CANDIDATE OUTPUT');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const firstExe = directory => fs.readdirSync(directory).find(name => name.toLowerCase().endsWith('.exe'));
const startupMs = directory => {
  const lines = fs.readFileSync(path.join(directory, 'smoke', 'startup.log'), 'utf8').trim().split(/\r?\n/);
  const first = Date.parse(lines[0].slice(0, 24));
  const smoke = lines.find(line => line.includes('smoke started'));
  return smoke ? Date.parse(smoke.slice(0, 24)) - first : null;
};
const baseline = readJson(path.join(baselineDir, 'smoke', 'smoke-report.json'));
const candidate = readJson(path.join(candidateDir, 'smoke', 'smoke-report.json'));
const baselineExe = firstExe(baselineDir), candidateExe = firstExe(candidateDir);
const data = {
  baselineVersion: baseline.version,
  candidateVersion: candidate.version,
  installerBytes: {
    baseline: fs.statSync(path.join(baselineDir, baselineExe)).size,
    candidate: fs.statSync(path.join(candidateDir, candidateExe)).size
  },
  startupMs: { baseline: startupMs(baselineDir), candidate: startupMs(candidateDir) },
  workingSetKb: { baseline: baseline.performance.appWorkingSetKb, candidate: candidate.performance.appWorkingSetKb },
  dodo: candidate.performance
};
data.installerBytes.delta = data.installerBytes.candidate - data.installerBytes.baseline;
data.startupMs.delta = data.startupMs.candidate - data.startupMs.baseline;
data.workingSetKb.delta = data.workingSetKb.candidate - data.workingSetKb.baseline;
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'performance.json'), JSON.stringify(data, null, 2));
fs.writeFileSync(path.join(outputDir, 'performance.md'), `# Dodo V2 Candidate performance\n\n| Metric | Baseline | Candidate | Delta |\n|---|---:|---:|---:|\n| Installer bytes | ${data.installerBytes.baseline} | ${data.installerBytes.candidate} | ${data.installerBytes.delta} |\n| Startup to smoke (ms) | ${data.startupMs.baseline} | ${data.startupMs.candidate} | ${data.startupMs.delta} |\n| App working set after smoke (KiB) | ${data.workingSetKb.baseline} | ${data.workingSetKb.candidate} | ${data.workingSetKb.delta} |\n\nDodo first decoded frame: ${data.dodo.dodoStartupMs} ms. Peak compressed animation cache: ${data.dodo.animationPeakCompressedBytes} bytes. Decoded frame estimate: ${data.dodo.decodedFrameEstimateBytes} bytes.\n`);
console.log(JSON.stringify(data, null, 2));
