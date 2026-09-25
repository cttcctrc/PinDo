const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { NativeDock } = require('./native-dock.cjs');
const { normalizeGroups, createGroupGestures } = require('./native-groups.cjs');
const { registerCapture } = require('./native-capture.cjs');
const { createFileIconReader, ICON_VERSION } = require('./file-icon.cjs');
const { EdgePreview } = require('./edge-preview.cjs');
function registerNativeFeatures({electron, mainWindow, manager, noteIdentity, getCanvasWindow = () => null, getStore, persist, broadcast, indexPath, preloadPath}) {
  const {ipcMain,screen,BrowserWindow,dialog,shell,app}=electron;
  const readIcon = createFileIconReader(electron);
  const refreshedIcons = new Set();
  let refreshingIcons = false, closed = false;
  async function refreshStoredIcons() {
    if (refreshingIcons || closed) return;
    refreshingIcons = true;
    try {
      const draft = structuredClone(getStore()?.state || {notes:[]});
      let changed = false;
      for (const note of draft.notes || []) {
        if (note.type !== 'organizer') continue;
        for (const item of note.desktopItems || []) {
          const key = JSON.stringify([note.id, item.id, item.path]);
          if (!item.path || item.iconVersion === ICON_VERSION || refreshedIcons.has(key)) continue;
          refreshedIcons.add(key);
          const icon = await readIcon(item.path);
          if (closed) return;
          if (!icon) continue;
          item.icon = icon; item.iconVersion = ICON_VERSION; changed = true;
        }
      }
      // One atomic renderer update avoids a visible flash for every shortcut.
      if (changed && !closed) {
        const current = getStore()?.state;
        if (current) {
          const merged = structuredClone(current);
          // Preserve edits made while Windows was reading icons.
          for (const note of draft.notes.filter(note => note.type === 'organizer')) {
            const live = merged.notes.find(item => item.id === note.id);
            if (!live) continue;
            for (const item of note.desktopItems || []) {
              const target = live.desktopItems?.find(entry => entry.id === item.id && entry.path === item.path);
              if (target && item.iconVersion === ICON_VERSION) { target.icon = item.icon; target.iconVersion = ICON_VERSION; }
            }
          }
          commit(merged);
        }
      }
    } finally { refreshingIcons = false; }
  }
  const base=pathToFileURL(indexPath).href;
  const dock=new NativeDock({BrowserWindow,screen,indexPath,preloadPath});
  let undockedBounds=null;
  function role(event){
    if(!event?.sender || event.senderFrame!==event.sender.mainFrame)return null;
    if(event.sender===mainWindow.webContents && event.senderFrame.url.split('?')[0]===base)return 'control';
    if(event.sender===getCanvasWindow()?.webContents && event.senderFrame.url.split('?')[0]===base)return 'canvas';
    if(event.sender===dock.window.webContents && event.senderFrame.url.split('?')[0]===pathToFileURL(path.join(path.dirname(indexPath),'native-dock.html')).href)return 'dock';
    return noteIdentity(event) ? 'note' : null;
  }
  function commit(state){const store=getStore();const result=store.setState(state,store.revision);if(result.accepted){persist(store.serialize());setImmediate(broadcast);}return result;}
  const groups=createGroupGestures({manager,getStore,commit});
  const capture=registerCapture({electron,role,noteIdentity,getStore,indexPath,preloadPath});
  const edgePreview=new EdgePreview({BrowserWindow});
  function dockDodo(side,scale=1){
    scale=Math.min(2,Math.max(.5,Number(scale)||1));
    const b=mainWindow.getBounds(),work=screen.getDisplayMatching(b).workArea;
    if(side==='release'){undockedBounds=null;return;}
    if(side==='expand') { const restored=undockedBounds || {...b,x:work.x+work.width-b.width-30};mainWindow.setBounds({...restored,x:Math.max(work.x,Math.min(restored.x,work.x+work.width-restored.width)),y:Math.max(work.y,Math.min(restored.y,work.y+work.height-restored.height))});undockedBounds=null;return; }
    if(!undockedBounds)undockedBounds=b;
    mainWindow.setBounds({...b,x:side==='left'?work.x:work.x+work.width-b.width,y:Math.max(work.y,Math.min(b.y,work.y+work.height-b.height))});
  }
  ipcMain.handle('pindo:native-command',async(event,action,value)=>{
    const kind=role(event);if(!kind)return {error:'unauthorized'};
    const id=kind==='canvas' && typeof value?.noteId==='string' ? value.noteId : noteIdentity(event), store=getStore();
    if(action==='focus-control' && kind==='control'){mainWindow.moveTop();return true;}
    if(action==='focus-note' && kind==='note'){manager.activate?.(id);manager.windows.get(id)?.moveTop();return true;}
    if(action==='focus-note-item' && kind==='control'){
      const win=manager.windows.get(value?.noteId);if(!win||win.isDestroyed())return false;
      manager.activate?.(value.noteId);win.moveTop();win.webContents.send('pindo:highlight-item',{type:value.type,id:value.itemId});return true;
    }
    if(action==='dock-regions' && kind==='dock'){dock.hit.update(value);return true;}
    if(action==='dock-list' && kind==='dock'){return dock.cards || [];}
    if(action==='dock-hover' && kind==='dock'){dock.setHovered(Boolean(value));return true;}
    if(action==='dodo-nearest' && kind==='control'){const b=mainWindow.getBounds(),w=screen.getDisplayMatching(b).workArea;return b.x+b.width/2<w.x+w.width/2?'left':'right';}
    if(action==='dodo-dock' && kind==='control'){dockDodo(value?.side,value?.scale);return true;}
    if(action==='trash' && kind==='note'){
      const win=manager.windows.get(id);
      const answer=await dialog.showMessageBox(win,{type:'question',title:'删除便签',message:'将这个便签移入回收站？',detail:'可以在 Dodo 助手的回收站中恢复。',buttons:['取消','移入回收站'],defaultId:0,cancelId:0});
      if(answer.response!==1)return {cancelled:true};
      // Let Windows fully dismiss the native modal before its parent is
      // removed. Destroying the parent in the same compositor frame could
      // leave a stale confirmation surface on some LTSC machines.
      await new Promise(resolve=>setTimeout(resolve,50));
      if(win&&!win.isDestroyed())win.hide();
      const state=structuredClone(getStore().state),note=state.notes.find(n=>n.id===id);if(!note)return {cancelled:true};
      state.recycleBin ||= [];state.recycleBin.unshift({...note,deletedAt:new Date().toISOString()});state.notes=state.notes.filter(n=>n.id!==id);
      state.attachments=(state.attachments||[]).filter(l=>l.childId!==id&&l.parentId!==id);
      if(state.reminderState)state.reminderState.activeItems=(state.reminderState.activeItems||[]).filter(i=>i.noteId!==id);
      commit(state);return {accepted:true};
    }
    if(kind==='dock' && ['dock-restore','dock-reorder'].includes(action)){
      const state=structuredClone(store.state);
      if(action==='dock-restore'){
        const n=state.notes.find(n=>n.id===value&&n.mode==='bookmark');if(!n)return false;
        n.mode=n.previousMode==='top'?'top':'desktop';if(n.restoreSize)Object.assign(n,n.restoreSize);
      }else{
        const from=state.notes.findIndex(n=>n.id===value?.id&&n.mode==='bookmark');
        const target=state.notes.find(n=>n.id===value?.target&&n.mode==='bookmark');if(from<0||!target)return false;
        const [n]=state.notes.splice(from,1);const at=state.notes.indexOf(target);state.notes.splice(at+(value.after?1:0),0,n);
      }
      commit(state);return true;
    }
    if(['describe-file','import-files'].includes(action) && (kind==='note'||kind==='canvas')){
      if(action==='import-files'){
        if(kind==='canvas')value=value?.paths;
        if(store.state.notes.find(n=>n.id===id)?.type!=='organizer'||!Array.isArray(value)||value.length>200)return {error:'无效的文件列表'};
        const items=[],errors=[];
        for(const file of value){if(typeof file!=='string'||!path.isAbsolute(file)){errors.push('没有取得文件路径');continue;}
          try{const stat=await fs.stat(file),kind=stat.isDirectory()?'folder':/\.(exe|lnk|appref-ms|url)$/i.test(file)?'app':'file';const icon=await readIcon(file);
            items.push({id:require('node:crypto').randomUUID(),path:file,name:path.basename(file),kind,icon,iconVersion:icon?ICON_VERSION:0});
          }catch{errors.push(path.basename(file)+' 无法读取');}
        }
        const draft=structuredClone(getStore().state),note=draft.notes.find(n=>n.id===id);if(!note)return {error:'便签已关闭'};note.desktopItems ||= [];
        for(const item of items){const old=note.desktopItems.findIndex(i=>i.path?.toLowerCase()===item.path.toLowerCase()||(!i.path&&i.name===item.name));if(old>=0){item.id=note.desktopItems[old].id;note.desktopItems[old]=item;}else note.desktopItems.push(item);}
        note.userEdited=true;const result=commit(draft);return {...result,count:items.length,error:errors.join('；')};
      }
      if(store.state.notes.find(n=>n.id===id)?.type!=='organizer' || typeof value!=='string' || !path.isAbsolute(value))return {error:'invalid-path'};
      try{
        const stat=await fs.stat(value),kind=stat.isDirectory()?'folder':/\.(exe|lnk|appref-ms|url)$/i.test(value)?'app':'file';
        const icon=await readIcon(value);
        return {path:value,name:path.basename(value),kind,icon};
      }catch{return {error:'无法读取该文件，请检查路径和访问权限'};}
    }
    if(action==='open-item' && (kind==='note'||kind==='canvas')){
      const note=store.state.notes.find(n=>n.id===id),item=note?.type==='organizer'&&note.desktopItems?.find(i=>i.id===(kind==='canvas'?value?.itemId:value));
      if(!item?.path || !path.isAbsolute(item.path))return {error:'旧项目没有保存本地路径，请重新拖入一次'};
      try{const error=await shell.openPath(item.path);return error?{error}:{accepted:true};}catch{return {error:'无法打开该项目，请检查文件是否已移动'};}
    }
    if(action==='reveal-item' && (kind==='note'||kind==='canvas')){
      const note=store.state.notes.find(n=>n.id===id),item=note?.type==='organizer'&&note.desktopItems?.find(i=>i.id===(kind==='canvas'?value?.itemId:value));
      if(!item?.path || !path.isAbsolute(item.path))return {error:'旧项目没有保存本地路径，请重新拖入一次'};
      try{shell.showItemInFolder(item.path);return {accepted:true};}catch{return {error:'无法打开文件所在位置'};}
    }
    if(kind==='note' && action==='capture')return capture.start(event,id);
    if(kind==='note' && action==='pin-capture')return capture.pin(event,value);
    if(kind==='note' && action==='ocr-capture')return capture.ocr(event,value);
    return {error:'unsupported-action'};
  });
  const gestureHooks={
    begin(win,kind){return win===mainWindow?{control:true}:groups.begin(win,kind);},
    update(meta,bounds){
      const work=screen.getDisplayMatching(bounds).workArea,state=getStore().state;
      if(meta?.control){
        const scale=state.settings?.dodoScale||1,tucked=state.assistant?.tucked;
        const left=tucked?(state.assistant.tuckSide==='left'?bounds.x:bounds.x+bounds.width-98*scale):bounds.x+bounds.width/2-58*scale;
        const near=left<=work.x+28||left+(tucked?98:116)*scale>=work.x+work.width-28;
        if(near)edgePreview.show(left<=work.x+28?'left':'right',work,190,'松开隐藏 Dodo');else edgePreview.hide();return;
      }
      groups.update(meta,bounds);
      const id=meta?.id,win=manager.windows.get(id),note=state.notes.find(n=>n.id===id);
      const near=note?.type!=='organizer' && bounds.x+bounds.width>=work.x+work.width-28;if(near)edgePreview.show('right',work,230,'松开收纳');else edgePreview.hide();
    },
    end(meta,bounds,action){
      if(!meta?.control){
        edgePreview.hide();const result=groups.end(meta,bounds,action),id=meta?.id;
        const work=screen.getDisplayMatching(bounds).workArea;
        if(action==='end' && meta?.kind!=='resize' && bounds.x+bounds.width>=work.x+work.width-28){
          const draft=structuredClone(getStore().state),note=draft.notes.find(n=>n.id===id);
          if(note && note.type!=='organizer'){note.previousMode=note.mode;note.restoreSize={w:note.w,h:note.h};note.mode='bookmark';draft.attachments=(draft.attachments||[]).filter(l=>l.childId!==id&&l.parentId!==id);commit(draft);}
        }return result;
      }
      edgePreview.hide();
      if(action!=='end')return;
      const state=getStore().state,scale=state.settings?.dodoScale||1,work=screen.getDisplayMatching(bounds).workArea;
      const left=state.assistant?.tucked ? (state.assistant.tuckSide==='left'?bounds.x:bounds.x+bounds.width-98*scale) : bounds.x+bounds.width/2-58*scale;
      const width=(state.assistant?.tucked?98:116)*scale;
      const side=left<=work.x+28?'left':left+width>=work.x+work.width-28?'right':null;
      if(side)setImmediate(()=>mainWindow.webContents.send('pindo:dodo-docked',side));
      else if(state.assistant?.tucked){
        undockedBounds=null;setImmediate(()=>mainWindow.webContents.send('pindo:dodo-docked','release'));
        return {...bounds,x:Math.round(left+width/2-bounds.width/2)};
      }
    }
  };
  return {dock,groups,gestureHooks,dockDodo,commit,
    sync(){dock.sync(getStore()?.state.notes||[],getStore()?.state.settings||{});void refreshStoredIcons().catch(error=>console.warn('Icon refresh failed:',error.message));},
    close(){closed=true;edgePreview.close();if(!dock.window.isDestroyed())dock.window.destroy();capture.close();},
    normalize(){const store=getStore();if(!store)return false;const draft=normalizeGroups(structuredClone(store.state));if(JSON.stringify(draft)!==store.serialize()){store.setState(draft,store.revision);persist(store.serialize());return true;}return false;}
  };
}
module.exports={registerNativeFeatures};
