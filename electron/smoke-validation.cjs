const fs = require('node:fs');
const path = require('node:path');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) { const value = await check(); if (value) return value; await wait(100); }
  throw new Error('Timed out waiting for PinDo windows');
}
async function runSmokeValidation({ app, mainWindow, noteWindowManager, desktopCanvas, getStore, outputDirectory }) {
  const output = path.resolve(outputDirectory); fs.mkdirSync(output, { recursive: true });
  const report = { version: app.getVersion(), platform: process.platform, packaged: app.isPackaged, checks: [], screenshots: [], passed: false };
  const check = (name, condition, detail = '') => { report.checks.push({ name, passed: Boolean(condition), detail }); if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ''}`); };
  try {
    await waitFor(() => getStore()?.state?.notes?.length && mainWindow && !mainWindow.isDestroyed());
    if (desktopCanvas) await waitFor(() => desktopCanvas.active);
    else await waitFor(() => noteWindowManager?.windows?.size > 0);
    const store = getStore();
    check('packaged executable', app.isPackaged);
    check('canonical state loaded', Array.isArray(store.state.notes) && store.state.notes.length >= 3);
    check('Dodo control loaded', await mainWindow.webContents.executeJavaScript("Boolean(document.querySelector('#assistantMascot') && document.querySelector('#dodoCanvas'))"));
    const expected = store.state.notes.filter(note => desktopCanvas ? note.mode === 'top' : note.mode !== 'bookmark').length;
    check('native note count', noteWindowManager.windows.size === expected, `${noteWindowManager.windows.size}/${expected}`);
    if (desktopCanvas) {
      const win = desktopCanvas.window;
      const view = await win.webContents.executeJavaScript("(() => ({ count: document.querySelectorAll('#noteLayer .note').length, transparent: getComputedStyle(document.body).backgroundColor, editable: Boolean(document.querySelector('.note [contenteditable=true]')) }))()");
      const expectedCanvas = store.state.notes.filter(note => note.mode === 'desktop').length;
      check('desktop notes share one transparent canvas', view.count === expectedCanvas && view.transparent === 'rgba(0, 0, 0, 0)' && view.editable, JSON.stringify(view));
      check('canvas has no hover focus', !win.isFocusable());
      const image = await win.webContents.capturePage();
      fs.writeFileSync(path.join(output, 'desktop-canvas.png'), image.toPNG()); report.screenshots.push('desktop-canvas.png');
    }
    for (const [id, win] of noteWindowManager.windows) {
      await waitFor(() => !win.isDestroyed() && !win.webContents.isLoading());
      const view = await win.webContents.executeJavaScript(`(() => { const note=document.querySelector('.note'); return {note:Boolean(note),type:note?.dataset.type||'',resizeEdges:document.querySelectorAll('[data-resize-edge]').length,trash:Boolean(document.querySelector('[data-action="trash"]')),width:note?.getBoundingClientRect().width||0,height:note?.getBoundingClientRect().height||0}; })()`);
      check(`note ${id} rendered`, view.note && view.width >= 280 && view.height >= 210, JSON.stringify(view));
      check(`note ${id} controls`, view.trash && view.resizeEdges === 8, JSON.stringify(view));
      const image = await win.webContents.capturePage();
      const filename = `${view.type || 'note'}-${String(id).replace(/[^a-z0-9_-]/gi, '_')}.png`;
      fs.writeFileSync(path.join(output, filename), image.toPNG()); report.screenshots.push(filename);
    }
    report.passed = true;
  } catch (error) { report.error = String(error?.stack || error); }
  fs.writeFileSync(path.join(output, 'smoke-report.json'), JSON.stringify(report, null, 2)); return report;
}
module.exports = { runSmokeValidation, waitFor };
