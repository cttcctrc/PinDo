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
  const report = { version: app.getVersion(), platform: process.platform, packaged: app.isPackaged, checks: [], screenshots: [], performance: {}, passed: false };
  const check = (name, condition, detail = '') => { report.checks.push({ name, passed: Boolean(condition), detail }); if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ''}`); };
  try {
    await waitFor(() => getStore()?.state?.notes?.length && mainWindow && !mainWindow.isDestroyed());
    if (desktopCanvas) await waitFor(() => desktopCanvas.active);
    else await waitFor(() => noteWindowManager?.windows?.size > 0);
    const store = getStore();
    check('packaged executable', app.isPackaged);
    check('canonical state loaded', Array.isArray(store.state.notes) && store.state.notes.length >= 3);
    check('Dodo control loaded', await mainWindow.webContents.executeJavaScript("Boolean(document.querySelector('#assistantMascot') && document.querySelector('#dodoCanvas'))"));
    const dodoRuntime = await mainWindow.webContents.executeJavaScript("({ ready: Boolean(window.__pindoDodoV2Test), api: Boolean(window.PinDoDodoV2?.DodoV2Controller), imageDecoder: typeof ImageDecoder, startupError: window.__pindoDodoV2StartupError || null })");
    const hasDodoV2 = dodoRuntime.ready;
    const isBaseline = app.getVersion().includes('dodo-baseline');
    check('Dodo V2 runtime initialized', hasDodoV2 || isBaseline, isBaseline ? 'not applicable to baseline' : JSON.stringify(dodoRuntime));
    if (hasDodoV2) {
      const initial = await waitFor(() => mainWindow.webContents.executeJavaScript("window.__pindoDodoV2Test?.diagnostics()?.firstFrameAt ? window.__pindoDodoV2Test.diagnostics() : null"));
      check('Dodo V2 first frame decoded', initial.state === 'idle_stand' && initial.startupMs >= 0, JSON.stringify(initial));
      const standingPlayback = await waitFor(() => mainWindow.webContents.executeJavaScript(`(() => { const d=window.__pindoDodoV2Test.diagnostics(); return d.renderedFrames>${Number(initial.renderedFrames)} ? d : null; })()`), 5000);
      check('Dodo V2 standing animation advances beyond first frame', standingPlayback.frameIndex > 0 && !standingPlayback.playbackError, JSON.stringify(standingPlayback));
      const states = ['idle_sit','doze_loop','sleep_loop','disappointed','melt_loop','stand_to_drag','sit_to_drag','doze_to_drag','sleep_to_drag','disappointed_to_drag','melt_to_drag','drag_hold','fall_to_stand','idle_stand'];
      for (const state of states) {
        const decoded = await mainWindow.webContents.executeJavaScript(`window.__pindoDodoV2Test.enter(${JSON.stringify(state)}).then(() => window.__pindoDodoV2Test.diagnostics())`);
        check(`Dodo V2 decodes ${state}`, decoded.state === state && !decoded.playbackError, JSON.stringify(decoded));
        const advanced = await waitFor(() => mainWindow.webContents.executeJavaScript(`(() => { const d=window.__pindoDodoV2Test.diagnostics(); return d.renderedFrames>${Number(decoded.renderedFrames)} ? d : null; })()`), 5000);
        check(`Dodo V2 advances ${state}`, !advanced.playbackError, JSON.stringify(advanced));
      }
      const dragTransitions = { idle_stand: 'stand_to_drag', idle_sit: 'sit_to_drag', doze_loop: 'doze_to_drag', sleep_loop: 'sleep_to_drag', disappointed: 'disappointed_to_drag', melt_loop: 'melt_to_drag' };
      for (const [state, expectedTransition] of Object.entries(dragTransitions)) {
        const release = await mainWindow.webContents.executeJavaScript(`(async () => {
          await window.__pindoDodoV2Test.enter(${JSON.stringify(state)});
          const started = window.__pindoDodoV2Test.drag({});
          const dragState = window.__pindoDodoV2Test.state();
          await window.__pindoDodoV2Test.release();
          return { started, dragState, releaseState: window.__pindoDodoV2Test.state() };
        })()`);
        check(`Dodo V2 releases immediately from ${state}`, release.started && release.dragState === expectedTransition && release.releaseState === 'fall_to_stand', JSON.stringify(release));
      }
      await mainWindow.webContents.executeJavaScript("window.__pindoDodoV2Test.enter('idle_stand')");
      const beforeDropBounds = mainWindow.getBounds();
      const beforeDrop = await mainWindow.webContents.executeJavaScript("window.__pindoDodoV2Test.diagnostics()");
      await mainWindow.webContents.executeJavaScript("window.__pindoDodoV2Test.drag({}); window.__pindoDodoV2Test.release()");
      let landed;
      try {
        landed = await waitFor(() => mainWindow.webContents.executeJavaScript(`(() => { const d=window.__pindoDodoV2Test.diagnostics(); return d.state==='idle_stand' && d.landings>${Number(beforeDrop.landings)} ? d : null; })()`), 30000);
      } catch (error) {
        const stalled = await mainWindow.webContents.executeJavaScript("window.__pindoDodoV2Test.diagnostics()");
        throw new Error(`Dodo visual drop timed out: ${JSON.stringify(stalled)}`);
      }
      const afterDropBounds = mainWindow.getBounds();
      check('Dodo V2 visual drop completes in standing state', landed.state === 'idle_stand', JSON.stringify(landed));
      check('Dodo V2 visual drop does not move host window', beforeDropBounds.x === afterDropBounds.x && beforeDropBounds.y === afterDropBounds.y, `${JSON.stringify(beforeDropBounds)} -> ${JSON.stringify(afterDropBounds)}`);
      const overlay = await mainWindow.webContents.executeJavaScript("window.__pindoDodoV2Test.diagnostics()");
      check('Dodo V2 facial overlays are disconnected', overlay.facialOverlaysEnabled === false && overlay.overlay === null, JSON.stringify(overlay));
      const metrics = app.getAppMetrics();
      const workingSetKb = metrics.reduce((sum, item) => sum + (item.memory?.workingSetSize || 0), 0);
      report.performance = { dodoStartupMs: initial.startupMs, animationPeakCompressedBytes: overlay.peakCompressedBytes, decodedFrameEstimateBytes: overlay.decodedFrameEstimateBytes, appWorkingSetKb: workingSetKb };
      const image = await mainWindow.webContents.capturePage();
      fs.writeFileSync(path.join(output, 'dodo-v2.png'), image.toPNG()); report.screenshots.push('dodo-v2.png');
    }
    const expected = store.state.notes.filter(note => desktopCanvas ? note.mode === 'top' : note.mode !== 'bookmark').length;
    check('native note count', noteWindowManager.windows.size === expected, `${noteWindowManager.windows.size}/${expected}`);
    if (desktopCanvas) {
      const win = desktopCanvas.window;
      const view = await win.webContents.executeJavaScript("(() => { const title = document.querySelector('#noteLayer .note .note-title'); const initiallyLocked = title?.getAttribute('contenteditable') === 'false'; title?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); return { count: document.querySelectorAll('#noteLayer .note').length, transparent: getComputedStyle(document.body).backgroundColor, editable: initiallyLocked && title?.getAttribute('contenteditable') === 'true' }; })()");
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
    if (!report.performance.appWorkingSetKb) {
      report.performance.appWorkingSetKb = app.getAppMetrics().reduce((sum, item) => sum + (item.memory?.workingSetSize || 0), 0);
    }
    report.passed = true;
  } catch (error) { report.error = String(error?.stack || error); }
  fs.writeFileSync(path.join(output, 'smoke-report.json'), JSON.stringify(report, null, 2)); return report;
}
module.exports = { runSmokeValidation, waitFor };
