const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const executable = path.resolve(process.argv[2] || 'release-validation/win-unpacked/PinDo.exe');
const output = path.resolve(process.argv[3] || 'release-validation/smoke');
if (!fs.existsSync(executable)) throw new Error(`PinDo executable not found: ${executable}`);
fs.rmSync(output, { recursive: true, force: true }); fs.mkdirSync(output, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-smoke-'));
const child = spawn(executable, [`--user-data-dir=${profile}`], { windowsHide: true, env: { ...process.env, PINDO_SMOKE_TEST: '1', PINDO_SMOKE_OUTPUT: output }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
let timedOut = false;
const timer = setTimeout(() => { timedOut = true; child.kill(); }, 45000);
child.once('exit', code => {
  clearTimeout(timer);
  try { const reportPath = path.join(output, 'smoke-report.json');
    if (!fs.existsSync(reportPath)) fs.writeFileSync(reportPath, JSON.stringify({ passed: false, error: timedOut ? 'No smoke report after 45 seconds; desktop shell or renderer may be unavailable' : `PinDo exited with ${code} before writing a smoke report` }, null, 2));
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (code !== 0 || !report.passed || !report.screenshots?.length) throw new Error(report.error || `PinDo exited with ${code}`);
    console.log(`[PinDo] Windows smoke test passed: ${report.checks.length} checks, ${report.screenshots.length} screenshots.`); }
  finally { fs.rmSync(profile, { recursive: true, force: true }); }
});
child.once('error', error => { clearTimeout(timer); fs.rmSync(profile, { recursive: true, force: true }); throw error; });
