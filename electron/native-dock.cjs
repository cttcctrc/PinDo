const path = require('node:path');
const { createControlHitTest } = require('./control-pointer.cjs');
const { attachToWindowsDesktop } = require('./windows-desktop-host.cjs');
class NativeDock {
  constructor({ BrowserWindow, screen, preloadPath, indexPath, diagnostic = null, desktopHost = attachToWindowsDesktop, onDiagnostic = () => {} }) {
    this.screen=screen;this.indexPath=indexPath;this.preloadPath=preloadPath;this.diagnostic=diagnostic || {mode:'baseline',preview:'inline',canvasVisible:true,dockVisible:true,dock:{transparent:true,backgroundColor:'#00000000',host:'desktop'}};this.desktopHost=desktopHost;this.onDiagnostic=onDiagnostic;
    const dockProfile=this.diagnostic.dock || {transparent:true,backgroundColor:'#00000000',host:'desktop'};
    this.window=new BrowserWindow({width:430,height:700,frame:false,transparent:dockProfile.transparent!==false,backgroundColor:dockProfile.backgroundColor || '#00000000',show:false,resizable:false,skipTaskbar:true,alwaysOnTop:false,webPreferences:{preload:preloadPath,contextIsolation:true,sandbox:true,nodeIntegration:false}});
    this.window.pindoWindowProfile={role:'native-dock',transparent:dockProfile.transparent!==false,backgroundColor:dockProfile.backgroundColor || '#00000000',host:dockProfile.host==='top'?'top-level':'desktop-pending'};
    this.hit=createControlHitTest(this.window,screen);
    this.window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    this.window.webContents.on('will-navigate', e=>e.preventDefault());
    this.window.loadFile(path.join(path.dirname(indexPath),'native-dock.html'),{query:{cf07Mode:this.diagnostic.mode || 'baseline',cf07Preview:this.diagnostic.preview || 'inline'}});
    this.window.webContents.on('did-finish-load',async()=>{
      if(dockProfile.host==='desktop'){
        const result=await this.desktopHost(this.window);
        this.window.pindoWindowProfile.host=result.attached?'explorer-desktop':'desktop-attach-failed';
        this.window.pindoWindowProfile.hostReason=result.reason || null;
      }
      this.onDiagnostic('cf07-window-ready',{id:this.window.id,...this.window.pindoWindowProfile,bounds:this.window.getBounds?.()});
      this.sync(this.notes || []);
    });
    this.previewWindow=this.diagnostic.preview==='separate' ? this.createPreviewWindow(BrowserWindow) : null;
    this.timer=setInterval(()=>{if(!this.window.isDestroyed() && this.window.isVisible())this.hit.refresh();},16);this.timer.unref();
    this.window.on('closed',()=>{clearInterval(this.timer);if(this.previewWindow&&!this.previewWindow.isDestroyed())this.previewWindow.destroy();});
  }
  createPreviewWindow(BrowserWindow){
    const profile=this.diagnostic.previewWindow;
    const win=new BrowserWindow({width:238,height:140,frame:false,transparent:profile.transparent,backgroundColor:profile.backgroundColor,show:false,resizable:false,focusable:false,skipTaskbar:true,alwaysOnTop:false,hasShadow:false,webPreferences:{preload:this.preloadPath,contextIsolation:true,sandbox:true,nodeIntegration:false}});
    win.pindoWindowProfile={role:'dock-preview-probe',transparent:profile.transparent,backgroundColor:profile.backgroundColor,host:'top-level'};
    win.setIgnoreMouseEvents?.(true,{forward:true});
    win.webContents.setWindowOpenHandler?.(()=>({action:'deny'}));
    win.webContents.on?.('will-navigate',event=>event.preventDefault());
    win.loadFile(path.join(path.dirname(this.indexPath),'cf07-preview.html'),{query:{transparent:profile.transparent?'1':'0'}});
    return win;
  }
  sync(notes,settings=this.settings||{}) {
    this.settings=settings;
    this.notes=notes;
    if(this.window.isDestroyed())return;
    const cards=notes.filter(n=>n.mode==='bookmark');
    if(!cards.length){this.cards=[];this.window.hide();this.previewWindow?.hide();return;}
    const work=this.screen.getPrimaryDisplay().workArea;
    this.window.setBounds({x:work.x+work.width-430,y:work.y,width:430,height:work.height});
    this.cards=cards.map(n=>({id:n.id,title:n.title || '',icon:n.icon,iconColor:n.iconColor,color:n.color,type:n.type,count:(n.todos||[]).length,summary:n.type==='quick' ? (n.content||'').slice(0,70) : n.type==='timeline' ? (n.events||[]).filter(e=>{const d=new Date(e.time)-Date.now();return d>=0 && d<=7*86400000;}).map(e=>e.text).join('、').slice(0,70) : ''}));
    this.window.webContents.send('pindo:dock-settings',this.settings);
    this.window.webContents.send('pindo:dock-state', this.cards);
    if(this.diagnostic.dockVisible===false)this.window.hide();else this.window.showInactive();
  }
  setHovered(active) {
    if (this.window.isDestroyed() || !this.window.isVisible()) return;
    // The dock stays attached to the desktop layer. Raising it here only
    // changes the order among desktop children, so its preview clears note
    // windows without becoming an always-on-top overlay above other apps.
    this.window.setAlwaysOnTop(Boolean(active),'floating');
    if(active)this.window.moveTop();
  }
  setPreviewProbe(value){
    const win=this.previewWindow;if(!win||win.isDestroyed())return false;
    if(!value?.show){win.hide();this.onDiagnostic('cf07-preview-hidden',{id:win.id});return true;}
    const dockBounds=this.window.getBounds(),height=Math.max(80,Math.min(360,Math.ceil(Number(value.height)||140)));
    const bounds={x:dockBounds.x+Math.max(8,dockBounds.width-430+8),y:dockBounds.y+Math.max(8,Math.min(dockBounds.height-height-8,Number(value.top)||8)),width:238,height};
    win.setBounds(bounds);win.webContents.send('pindo:cf07-preview-state',value.note||{});win.showInactive();win.moveTop?.();
    this.onDiagnostic('cf07-preview-shown',{id:win.id,...win.pindoWindowProfile,bounds});return true;
  }
  diagnosticState(){return {mode:this.diagnostic.mode,dockWindowId:this.window?.id || null,previewWindowId:this.previewWindow?.id || null,dockVisible:this.window?.isVisible?.() || false,previewVisible:this.previewWindow?.isVisible?.() || false};}
}
module.exports={NativeDock};
