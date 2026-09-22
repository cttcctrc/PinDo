const path = require('node:path');
const { createControlHitTest } = require('./control-pointer.cjs');
const { attachToWindowsDesktop } = require('./windows-desktop-host.cjs');
class NativeDock {
  constructor({ BrowserWindow, screen, preloadPath, indexPath }) {
    this.screen=screen;
    this.window=new BrowserWindow({width:430,height:700,frame:false,transparent:true,show:false,resizable:false,skipTaskbar:true,alwaysOnTop:false,webPreferences:{preload:preloadPath,contextIsolation:true,sandbox:true,nodeIntegration:false}});
    this.hit=createControlHitTest(this.window,screen);
    this.window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    this.window.webContents.on('will-navigate', e=>e.preventDefault());
    this.window.loadFile(path.join(path.dirname(indexPath),'native-dock.html'));
    this.window.webContents.on('did-finish-load',async()=>{await attachToWindowsDesktop(this.window);this.sync(this.notes || []);});
    this.timer=setInterval(()=>{if(!this.window.isDestroyed() && this.window.isVisible())this.hit.refresh();},16);this.timer.unref();
    this.window.on('closed',()=>clearInterval(this.timer));
  }
  sync(notes,settings=this.settings||{}) {
    this.settings=settings;
    this.notes=notes;
    if(this.window.isDestroyed())return;
    const cards=notes.filter(n=>n.mode==='bookmark');
    if(!cards.length){this.cards=[];this.window.hide();return;}
    const work=this.screen.getPrimaryDisplay().workArea;
    this.window.setBounds({x:work.x+work.width-430,y:work.y,width:430,height:work.height});
    this.cards=cards.map(n=>({id:n.id,title:n.title || '',icon:n.icon,iconColor:n.iconColor,color:n.color,type:n.type,count:(n.todos||[]).length,summary:n.type==='quick' ? (n.content||'').slice(0,70) : n.type==='timeline' ? (n.events||[]).filter(e=>{const d=new Date(e.time)-Date.now();return d>=0 && d<=7*86400000;}).map(e=>e.text).join('、').slice(0,70) : ''}));
    this.window.webContents.send('pindo:dock-settings',this.settings);
    this.window.webContents.send('pindo:dock-state', this.cards);
    this.window.showInactive();
  }
  setHovered(active) {
    if (this.window.isDestroyed() || !this.window.isVisible()) return;
    // The dock stays attached to the desktop layer. Raising it here only
    // changes the order among desktop children, so its preview clears note
    // windows without becoming an always-on-top overlay above other apps.
    this.window.setAlwaysOnTop(Boolean(active),'floating');
    if(active)this.window.moveTop();
  }
}
module.exports={NativeDock};
