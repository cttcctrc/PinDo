const BASE_DOCK = Object.freeze({ transparent: true, backgroundColor: '#00000000', host: 'desktop' });

const mode = (name, overrides = {}) => Object.freeze({
  mode: name,
  preview: 'inline',
  previewWindow: null,
  canvasVisible: true,
  dockVisible: true,
  dock: BASE_DOCK,
  ...overrides
});

const MODES = Object.freeze({
  baseline: mode('baseline'),
  'no-hover-preview': mode('no-hover-preview', { preview: 'off' }),
  'canvas-hidden': mode('canvas-hidden', { canvasVisible: false }),
  'dock-hidden': mode('dock-hidden', { dockVisible: false }),
  'preview-opaque-top': mode('preview-opaque-top', { preview: 'separate', previewWindow: Object.freeze({ transparent: false, backgroundColor: '#fff7ed', host: 'top' }) }),
  'preview-transparent-top': mode('preview-transparent-top', { preview: 'separate', previewWindow: Object.freeze({ transparent: true, backgroundColor: '#00000000', host: 'top' }) }),
  'dock-semitransparent-desktop': mode('dock-semitransparent-desktop', { dock: Object.freeze({ transparent: true, backgroundColor: '#990f172a', host: 'desktop' }) }),
  'dock-opaque-desktop': mode('dock-opaque-desktop', { dock: Object.freeze({ transparent: false, backgroundColor: '#fff7ed', host: 'desktop' }) }),
  'dock-transparent-top': mode('dock-transparent-top', { dock: Object.freeze({ transparent: true, backgroundColor: '#00000000', host: 'top' }) }),
  'dock-semitransparent-top': mode('dock-semitransparent-top', { dock: Object.freeze({ transparent: true, backgroundColor: '#990f172a', host: 'top' }) }),
  'dock-opaque-top': mode('dock-opaque-top', { dock: Object.freeze({ transparent: false, backgroundColor: '#fff7ed', host: 'top' }) })
});

function requestedMode(argv = []) {
  const entry = argv.find(value => typeof value === 'string' && value.startsWith('--cf07-mode='));
  const value = entry?.slice('--cf07-mode='.length);
  return Object.hasOwn(MODES, value) ? value : 'baseline';
}

function resolveCf07Diagnostics({ enabled = false, argv = process.argv, softwareRendering = false } = {}) {
  if (!enabled) return Object.freeze({ enabled: false, softwareRendering: false, ...MODES.baseline });
  const selected = requestedMode(argv);
  return Object.freeze({ enabled: true, softwareRendering: Boolean(softwareRendering), ...MODES[selected] });
}

function relaunchArgs(argv = process.argv, nextMode = 'baseline') {
  const selected = Object.hasOwn(MODES, nextMode) ? nextMode : 'baseline';
  return argv.slice(1).filter(value => !String(value).startsWith('--cf07-mode=')).concat(`--cf07-mode=${selected}`);
}

const MODE_LABELS = Object.freeze({
  baseline: '01 基线：Dock + 内联 Preview + Canvas',
  'no-hover-preview': '02 关闭 Hover Preview',
  'canvas-hidden': '03 隐藏 Desktop Canvas',
  'dock-hidden': '04 隐藏右侧 Dock',
  'preview-opaque-top': '05 Preview 独立普通不透明窗口',
  'preview-transparent-top': '06 Preview 独立透明窗口',
  'dock-semitransparent-desktop': '07 Dock 半透明 + Explorer',
  'dock-opaque-desktop': '08 Dock 不透明 + Explorer',
  'dock-transparent-top': '09 Dock 透明 + 顶层',
  'dock-semitransparent-top': '10 Dock 半透明 + 顶层',
  'dock-opaque-top': '11 Dock 不透明 + 顶层'
});

module.exports = { MODES, MODE_LABELS, resolveCf07Diagnostics, relaunchArgs };
