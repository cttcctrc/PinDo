const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {execFile}=require('node:child_process');
function registerCapture({electron,role,noteIdentity,getStore,indexPath,preloadPath}) {
  const {BrowserWindow,screen,desktopCapturer,ipcMain,Menu}=electron;
  let active=null,pinned=null;
  const latest=new Map();
  function finish(result){
    if(!active)return;
    const session=active;active=null;clearTimeout(session.timeout);
    for(const win of session.windows.keys())if(!win.isDestroyed())win.destroy();
    for(const win of session.restore)if(!win.isDestroyed())win.showInactive();
    session.resolve(result);
  }
  ipcMain.on('pindo:capture-selection',(event,value)=>{
    if(!active || event.senderFrame!==event.sender.mainFrame)return;
    const pair=[...active.windows].find(([w])=>w.webContents===event.sender);if(!pair)return;
    if(value?.cancel){finish({cancelled:true});return;}
    const [win,{image,display}]=pair;
    if(!value || !['x','y','width','height'].every(k=>Number.isFinite(value[k])) || value.width<3 || value.height<3)return;
    const size=image.getSize(),sx=size.width/display.bounds.width,sy=size.height/display.bounds.height;
    const x=Math.max(0,Math.min(size.width-1,Math.round(value.x*sx))),y=Math.max(0,Math.min(size.height-1,Math.round(value.y*sy)));
    const width=Math.min(size.width-x,Math.max(1,Math.round(value.width*sx))),height=Math.min(size.height-y,Math.max(1,Math.round(value.height*sy)));
    const dataUrl=image.crop({x,y,width,height}).toDataURL();latest.set(active.owner.id,dataUrl);finish({dataUrl});
  });
  return {
    async start(event,id){
      if(active)return {error:'正在截图，请先完成或取消当前截图'};
      if(getStore().state.notes.find(n=>n.id===id)?.type!=='quick')return {error:'请从随手记中截图'};
      return new Promise(async resolve=>{
        const restore=BrowserWindow.getAllWindows().filter(w=>w.isVisible());
        active={resolve,restore,windows:new Map(),owner:event.sender,timeout:null};
        const session=active;session.timeout=setTimeout(()=>finish({cancelled:true}),90000);
        try{
          restore.forEach(w=>w.hide());await new Promise(r=>setTimeout(r,220));
          const displays=screen.getAllDisplays();
          const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:Math.max(...displays.map(d=>Math.ceil(d.bounds.width*d.scaleFactor))),height:Math.max(...displays.map(d=>Math.ceil(d.bounds.height*d.scaleFactor)))}});
          if(active!==session)return;
          for(const display of displays){
            const source=sources.find(s=>s.display_id===String(display.id)) || (displays.length===1?sources[0]:null);
            if(!source || source.thumbnail.isEmpty())continue;
            const win=new BrowserWindow({...display.bounds,frame:false,show:false,resizable:false,movable:false,skipTaskbar:true,alwaysOnTop:true,backgroundColor:'#111111',webPreferences:{preload:preloadPath,contextIsolation:true,sandbox:true,nodeIntegration:false}});
            session.windows.set(win,{image:source.thumbnail,display});
            win.on('closed',()=>{if(active===session)finish({cancelled:true});});
            win.setAlwaysOnTop(true,'screen-saver');win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
            win.loadFile(path.join(path.dirname(indexPath),'native-capture.html'));
            win.webContents.once('did-finish-load',()=>{if(!win.isDestroyed()){win.webContents.send('pindo:capture-image',source.thumbnail.toDataURL());win.show();win.focus();}});
          }
          if(!session.windows.size)finish({error:'无法读取屏幕画面，请检查系统屏幕录制权限'});
        }catch(error){finish({error:'截图失败：'+error.message});}
      });
    },
    pin(event,value){
      if(typeof value!=='string'||latest.get(event.sender.id)!==value)return {error:'请先完成截图'};
      if(pinned&&!pinned.isDestroyed())pinned.destroy();
      const work=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
      const size=electron.nativeImage.createFromDataURL(value).getSize();
      const ratio=size.width/size.height, scale=Math.min(1,(work.width-80)/size.width,(work.height-80)/size.height);
      const width=Math.max(1,Math.round(size.width*scale)),height=Math.max(1,Math.round(size.height*scale));
      pinned=new BrowserWindow({x:work.x+40,y:work.y+40,width,height,useContentSize:true,resizable:false,frame:false,transparent:true,backgroundColor:'#00000000',alwaysOnTop:true,skipTaskbar:true,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
      pinned.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      pinned.webContents.on('context-menu',()=>Menu.buildFromTemplate([{label:'关闭钉图',click:()=>{if(pinned&&!pinned.isDestroyed())pinned.destroy();}}]).popup({window:pinned}));
      pinned.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}img{width:100%;height:100%;object-fit:contain;-webkit-app-region:drag}</style><img src="${value}" alt="右键关闭，拖动移动">`));
      return {accepted:true};
    },
    async ocr(event,value){
      if(typeof value!=='string'||latest.get(event.sender.id)!==value)return {error:'请先完成截图'};
      if(process.platform!=='win32')return {error:'本地文字识别需要 Windows 系统'};
      const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pindo-ocr-'));const imagePath=path.join(dir,'capture.png');
      try{
        await fs.writeFile(imagePath,Buffer.from(value.split(',')[1],'base64'));
        const text=await new Promise((resolve,reject)=>execFile(path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-File',require('./native-paths.cjs').nativeScript('windows-ocr.ps1'),imagePath],{windowsHide:true,timeout:30000,maxBuffer:2*1024*1024,encoding:'utf8'},(error,stdout,stderr)=>error?reject(new Error(stderr||error.message)):resolve(stdout.trim())));
        return text?{text}:{error:'未识别到文字/图像像素过低'};
      }catch(error){console.error('PinDo OCR failed:',error);return {error:'文字识别服务未能启动：'+String(error.message||error).slice(0,220)};}finally{await fs.rm(dir,{recursive:true,force:true});}
    },
    close(){finish({cancelled:true});if(pinned&&!pinned.isDestroyed())pinned.destroy();latest.clear();}
  };
}
module.exports={registerCapture};
