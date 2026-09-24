const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const executable = path.join(root, 'release-canvas-preview', 'win-unpacked', 'PinDo Canvas Preview.exe');
const output = path.join(root, 'release-canvas-preview', 'smoke');
fs.mkdirSync(output, { recursive: true });
const child = spawn(executable, [], {
  env: { ...process.env, PINDO_CANVAS_SMOKE: '1', PINDO_CANVAS_SMOKE_OUTPUT: output },
  stdio: 'inherit', windowsHide: true
});
const timeout = setTimeout(() => { child.kill(); console.error('Preview smoke timed out'); process.exitCode = 1; }, 45000);
child.on('error', error => { clearTimeout(timeout); console.error(error); process.exitCode = 1; });
child.on('exit', code => {
  clearTimeout(timeout);
  try {
    assert.equal(code, 0);
    const report = JSON.parse(fs.readFileSync(path.join(output, 'report.json'), 'utf8'));
    assert.equal(report.passed, true);
    assert.equal(report.attached, true);
    assert.equal(report.focusableOnHover, false);
    assert.ok(fs.statSync(path.join(output, 'canvas.png')).size > 1000);
    console.log('Canvas preview Windows smoke passed:', report);
  } catch (error) { console.error(error); process.exitCode = 1; }
});
