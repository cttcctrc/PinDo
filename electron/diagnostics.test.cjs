const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Diagnostics, prepareCompatibility, redact } = require('./diagnostics.cjs');

test('diagnostic redaction removes home paths, email addresses and JWT-like tokens', () => {
  const token = 'eyJabcdefghijabcdefghij.eyJabcdefghijabcdefghij.signatureabcdefghijabcdefghij';
  const output = JSON.stringify(redact({ message: `${os.homedir()}/secret user@example.com ${token}` }));
  assert.doesNotMatch(output, new RegExp(os.homedir().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(output, /user@example\.com/); assert.doesNotMatch(output, /eyJabcdefghij/);
});

test('compatibility mode activates reduced effects without disabling Chromium rendering', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-diagnostics-')); let disabled = 0;
  const app = { getPath: () => directory, disableHardwareAcceleration: () => disabled++ };
  assert.equal(prepareCompatibility(app).enabled, false);
  assert.equal(prepareCompatibility(app).enabled, false);
  assert.equal(prepareCompatibility(app).enabled, true);
  assert.equal(disabled, 0);
});

test('diagnostic snapshot contains environment and note shape but no note text', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pindo-diagnostics-'));
  const app = { getPath: () => directory, getGPUInfo: async () => ({}), getName: () => 'PinDo', getVersion: () => '7.0', isPackaged: true, getLocale: () => 'zh-CN' };
  const service = new Diagnostics({ app, screen: { getAllDisplays: () => [{ id: 1, bounds: {}, workArea: {}, scaleFactor: 1, rotation: 0 }] }, getStore: () => ({ state: { notes: [{ type: 'quick', mode: 'desktop', content: 'private words', w: 400, h: 300 }] } }), getWindows: () => [], compatibility: { enabled: false } });
  const report = await service.snapshot();
  assert.equal(report.notes[0].type, 'quick'); assert.doesNotMatch(JSON.stringify(report), /private words/); assert.match(report.privacy, /No note text/);
});
