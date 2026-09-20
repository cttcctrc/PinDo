const {test}=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');const {pathToFileURL}=require('node:url');
const {registerNativeFeatures}=require('./native-features.cjs');const {NoteStateStore}=require('./note-state-store.cjs');
class FakeWindow extends EventEmitter {
 constructor(options={}){super();this.bounds={x:0,y:0,width:430,height:760,...options};this.webContents=new EventEmitter();this.webContents.mainFrame={url:''};this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=()=>{};this.visible=false;}
 loadFile(file){this.webContents.mainFrame.url=pathToFileURL(file).href;}
 isDestroyed(){return this.dead||false;}getBounds(){return this.bounds;}setBounds(b){this.bounds=b;}setIgnoreMouseEvents(){}showInactive(){this.visible=true;}hide(){this.visible=false;}isVisible(){return this.visible;}destroy(){this.dead=true;this.emit('closed');}moveTop(){}
}
test('native trash confirms, persists recycle entry; dock restores size; open uses stored path only',async()=>{
 const store=new NoteStateStore({notes:[{id:'a',type:'organizer',mode:'desktop',x:0,y:0,w:400,h:350,desktopItems:[{id:'file',path:'/tmp/project',name:'project'}]},{id:'b',type:'quick',mode:'bookmark',previousMode:'desktop',x:200,y:50,w:350,h:270,restoreSize:{w:480,h:390}}],attachments:[],recycleBin:[],settings:{dodoScale:1},assistant:{}});
 const main=new FakeWindow(),noteWindow=new FakeWindow();main.loadFile('/tmp/index.html');noteWindow.loadFile('/tmp/index.html');
 let handler,response=0,persisted=0,opened;
 const ipcMain={handle:(name,fn)=>handler=fn,on(){}};
 const electron={ipcMain,BrowserWindow:FakeWindow,screen:{getPrimaryDisplay:()=>({workArea:{x:0,y:0,width:1920,height:1080}}),getDisplayMatching:()=>({workArea:{x:0,y:0,width:1920,height:1080}}),getCursorScreenPoint:()=>({x:0,y:0})},dialog:{showMessageBox:async()=>({response})},shell:{openPath:async value=>{opened=value;return '';}},app:{}};
 const features=registerNativeFeatures({electron,mainWindow:main,manager:{windows:new Map([['a',noteWindow]])},noteIdentity:e=>e.sender===noteWindow.webContents?'a':null,getStore:()=>store,persist:()=>persisted++,broadcast(){},indexPath:'/tmp/index.html',preloadPath:'/tmp/preload.cjs'});
 const event={sender:noteWindow.webContents,senderFrame:noteWindow.webContents.mainFrame};
 assert.equal((await handler(event,'trash')).cancelled,true);assert.equal(store.state.notes.length,2);
 await handler(event,'open-item','file');assert.equal(opened,'/tmp/project');
 assert.equal((await handler(event,'open-item','/other/path')).error.includes('路径'),true);
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'pindo-import-test-')),file=path.join(dir,'legacy.txt');
 await fs.writeFile(file,'test');
 const draft=structuredClone(store.state);draft.notes[0].desktopItems.push({id:'legacy',name:'legacy.txt'});store.setState(draft,store.revision);
 try{
  const imported=await handler(event,'import-files',[file]);assert.equal(imported.count,1);
  await handler(event,'import-files',[file]);
  const cards=store.state.notes[0].desktopItems.filter(i=>i.name==='legacy.txt');assert.equal(cards.length,1);assert.equal(cards[0].id,'legacy');assert.equal(cards[0].path,file);
  await handler(event,'open-item','legacy');assert.equal(opened,file);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
 response=1;await handler(event,'trash');assert.equal(store.state.notes.length,1);assert.equal(store.state.recycleBin[0].id,'a');assert.ok(persisted);
 const dockEvent={sender:features.dock.window.webContents,senderFrame:features.dock.window.webContents.mainFrame};
 await handler(dockEvent,'dock-restore','b');assert.equal(store.snapshot('b').note.mode,'desktop');assert.equal(store.snapshot('b').note.w,480);assert.equal(store.snapshot('b').note.h,390);
 assert.equal((await handler({sender:{},senderFrame:{}},'trash')).error,'unauthorized');
 await handler({sender:main.webContents,senderFrame:main.webContents.mainFrame},'dodo-dock',{side:'right'});assert.equal(main.bounds.x,1490);
 features.close();await new Promise(setImmediate);
});
