const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { MODES, resolveCf07Diagnostics, relaunchArgs } = require('./cf07-diagnostics.cjs');

test('CF-07 diagnostic modes cover the requested window and transparency matrix', () => {
  assert.deepEqual(Object.keys(MODES), [
    'baseline',
    'no-hover-preview',
    'canvas-hidden',
    'dock-hidden',
    'preview-opaque-top',
    'preview-transparent-top',
    'dock-semitransparent-desktop',
    'dock-opaque-desktop',
    'dock-transparent-top',
    'dock-semitransparent-top',
    'dock-opaque-top'
  ]);
  assert.equal(MODES['no-hover-preview'].preview, 'off');
  assert.equal(MODES['canvas-hidden'].canvasVisible, false);
  assert.equal(MODES['dock-hidden'].dockVisible, false);
  assert.deepEqual(MODES['preview-opaque-top'].previewWindow, { transparent: false, backgroundColor: '#fff7ed', host: 'top' });
  assert.deepEqual(MODES['preview-transparent-top'].previewWindow, { transparent: true, backgroundColor: '#00000000', host: 'top' });
  assert.equal(MODES['dock-semitransparent-desktop'].dock.backgroundColor, '#990f172a');
  assert.equal(MODES['dock-opaque-desktop'].dock.transparent, false);
  assert.equal(MODES['dock-transparent-top'].dock.host, 'top');
});

test('CF-07 switches are ignored outside the isolated diagnostic package', () => {
  const disabled = resolveCf07Diagnostics({ enabled: false, argv: ['PinDo.exe', '--cf07-mode=dock-hidden'], softwareRendering: true });
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.mode, 'baseline');
  assert.equal(disabled.softwareRendering, false);

  const enabled = resolveCf07Diagnostics({ enabled: true, argv: ['PinDo.exe', '--cf07-mode=preview-transparent-top'], softwareRendering: true });
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.mode, 'preview-transparent-top');
  assert.equal(enabled.softwareRendering, true);
});

test('diagnostic relaunch replaces only the CF-07 mode argument', () => {
  assert.deepEqual(
    relaunchArgs(['PinDo.exe', '--inspect=0', '--cf07-mode=baseline'], 'dock-hidden'),
    ['--inspect=0', '--cf07-mode=dock-hidden']
  );
});

test('diagnostic builders are isolated and software rendering is opt-in', () => {
  const previous = process.env.PINDO_RELEASE_VERSION;
  process.env.PINDO_RELEASE_VERSION = '1.1.0-beta.7.5-cf07.1';
  const standard = require('../electron-builder.cf07-diagnostic.cjs');
  const software = require('../electron-builder.cf07-software.cjs');
  if (previous === undefined) delete process.env.PINDO_RELEASE_VERSION; else process.env.PINDO_RELEASE_VERSION = previous;
  assert.equal(standard.appId, 'com.pindo.cf07-diagnostics');
  assert.equal(standard.extraMetadata.cf07Diagnostics, true);
  assert.equal(standard.extraMetadata.cf07SoftwareRendering, undefined);
  assert.equal(standard.publish, null);
  assert.equal(software.appId, 'com.pindo.cf07-diagnostics.software');
  assert.equal(software.extraMetadata.cf07SoftwareRendering, true);
  assert.equal(software.publish, null);
});

test('CF-07 workflow builds evidence without publishing a test-channel release', () => {
  const workflow = fs.readFileSync('.github/workflows/windows-validation.yml', 'utf8');
  assert.match(workflow, /fix\/cf-07-win10-ltsc-black-background/);
  assert.match(workflow, /electron-builder\.cf07-diagnostic\.cjs/);
  assert.match(workflow, /electron-builder\.cf07-software\.cjs/);
  assert.match(workflow, /pindo-cf07-diagnostics-/);
  const cf07Block = workflow.slice(workflow.indexOf('Build CF-07 hardware-path'), workflow.indexOf('Build installable PR test package'));
  assert.doesNotMatch(cf07Block, /gh release|--publish always|test\.yml/);
});
