const {test}=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');
const {registerCapture}=require('./native-capture.cjs');
test('screen selection converts DIP to physical pixels and restores windows after completion',async()=>{
 let select,cropRect,restored=0,pinOptions;
 const image={isEmpty:()=>false,getSize:()=>({width:3840,height:2160}),toDataURL:()=> 'data:image/png;base64,AA==',crop:r=>{cropRect=r;return{toDataURL:()=> 'data:image/png;base64,AQ=='};}};
 const original={isVisible:()=>true,hide(){},isDestroyed:()=>false,showInactive(){restored++;}};
 class Win extends EventEmitter{
  static getAllWindows(){return[original];}
  constructor(options){super();pinOptions=options;this.webContents=new EventEmitter();this.webContents.mainFrame={};this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=()=>setImmediate(()=>select({sender:this.webContents,senderFrame:this.webContents.mainFrame},{x:100,y:50,width:200,height:100}));}
  loadURL(){}setAlwaysOnTop(){}loadFile(){setImmediate(()=>this.webContents.emit('did-finish-load'));}isDestroyed(){return this.dead||false;}destroy(){this.dead=true;this.emit('closed');}show(){}focus(){}
 }
 const api=registerCapture({electron:{BrowserWindow:Win,nativeImage:{createFromDataURL:()=>({getSize:()=>({width:800,height:200})})},screen:{getDisplayNearestPoint:()=>({workArea:{x:0,y:0,width:1920,height:1080}}),getCursorScreenPoint:()=>({x:0,y:0}),getAllDisplays:()=>[{id:1,bounds:{x:-1920,y:0,width:1920,height:1080},scaleFactor:2}]},desktopCapturer:{getSources:async()=>[{display_id:'1',thumbnail:image}]},ipcMain:{on:(_,fn)=>select=fn}},getStore:()=>({state:{notes:[{id:'note',type:'quick'}]}}),indexPath:'/tmp/index.html',preloadPath:'/tmp/preload.cjs'});
 const result=await api.start({sender:{id:7}},'note');assert.equal(result.dataUrl,'data:image/png;base64,AQ==');assert.deepEqual(cropRect,{x:200,y:100,width:400,height:200});assert.equal(restored,1);
 assert.equal(api.pin({sender:{id:7}},result.dataUrl).accepted,true);assert.equal(pinOptions.width/pinOptions.height,4);assert.equal(pinOptions.resizable,false);api.close();
});
test('capture failure restores hidden windows and returns an actionable error',async()=>{
 let restored=0;const original={isVisible:()=>true,hide(){},isDestroyed:()=>false,showInactive(){restored++;}};
 const api=registerCapture({electron:{BrowserWindow:{getAllWindows:()=>[original]},screen:{getAllDisplays:()=>[{id:1,bounds:{width:1920,height:1080},scaleFactor:1}]},desktopCapturer:{getSources:async()=>{throw new Error('capture unavailable');}},ipcMain:{on(){}}},getStore:()=>({state:{notes:[{id:'note',type:'quick'}]}}),indexPath:'/tmp/index.html'});
 const result=await api.start({sender:{id:7}},'note');assert.match(result.error,/截图失败/);assert.equal(restored,1);api.close();
});
