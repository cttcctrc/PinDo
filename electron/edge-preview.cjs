class EdgePreview {
  constructor({BrowserWindow}) {
    this.window=new BrowserWindow({width:88,height:230,frame:false,transparent:true,show:false,resizable:false,focusable:false,skipTaskbar:true,alwaysOnTop:true,hasShadow:false,backgroundColor:'#00000000',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
    this.window.setIgnoreMouseEvents?.(true);
    this.label='';
    this.ready=typeof this.window.loadURL==='function';
    if(this.ready)this.window.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:"Segoe UI","Microsoft YaHei UI",sans-serif}div{position:absolute;inset:5px;display:grid;place-items:center;padding:12px;border:3px dashed rgba(91,137,232,.92);border-radius:22px;background:rgba(91,137,232,.15);box-shadow:inset 0 0 30px rgba(91,137,232,.13)}span{max-width:100%;padding:8px 10px;border-radius:12px;background:rgba(48,59,80,.9);color:#fff;font-size:13px;line-height:1.35;text-align:center;white-space:normal}</style><div><span>松开收纳</span></div>'));
  }
  show(side,work,height=230,label='松开收纳'){
    if(!this.ready||this.window.isDestroyed())return;
    const width=88,h=Math.min(height,Math.max(120,work.height-40));
    this.window.setBounds({x:side==='left'?work.x:work.x+work.width-width,y:Math.round(work.y+(work.height-h)/2),width,height:h});
    if(label!==this.label){
      this.label=label;
      const script=`document.querySelector('span').textContent=${JSON.stringify(label)}`;
      this.window.webContents?.executeJavaScript?.(script).catch?.(()=>{});
    }
    this.window.setAlwaysOnTop(true,'floating');this.window.showInactive();
  }
  hide(){if(!this.window.isDestroyed())this.window.hide();}
  close(){if(!this.window.isDestroyed())this.window.destroy();}
}
module.exports={EdgePreview};
