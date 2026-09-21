const {test}=require('node:test');const assert=require('node:assert/strict');
const {normalizeGroups,findSnap,createGroupGestures}=require('./native-groups.cjs');
const {NoteStateStore}=require('./note-state-store.cjs');
const note=(id,x,y,w=350,h=300)=>({id,type:'quick',mode:'desktop',x,y,w,h,locked:false,pinEnabled:true,content:''});
test('native vertical groups keep equal width, independent heights, lock propagation, and reject cycles',()=>{
 const state={notes:[note('a',50,50,400,320),note('b',500,0,300,260),note('c',800,0,280,210)],attachments:[{parentId:'a',childId:'b'},{parentId:'b',childId:'c'},{parentId:'c',childId:'a'}]};
 state.notes[0].locked=true;normalizeGroups(state);
 assert.equal(state.attachments.length,2);assert.deepEqual(state.notes.map(n=>[n.x,n.y,n.w,n.h,n.locked]),[[50,50,400,320,true],[50,370,400,260,true],[50,630,400,210,true]]);
});
test('snap only matches vertical seams, not left/right contact',()=>{
 const state={notes:[note('a',0,0),note('b',600,500)],attachments:[]};
 assert.equal(findSnap(state,'b',{x:350,y:0,width:350,height:300},['b']),null);
 assert.equal(findSnap(state,'b',{x:12,y:300,width:350,height:300},['b']).parentId,'a');
});
test('group drag commits latest text, detach restores free movement, and resize keeps child height',()=>{
 const store=new NoteStateStore({notes:[note('a',50,50),note('b',50,318,350,240)],attachments:[{parentId:'a',childId:'b'}]});
 const windows=new Map(store.state.notes.map(n=>[n.id,{bounds:{x:n.x,y:n.y,width:n.w,height:n.h},webContents:{send(){}},isDestroyed:()=>false,setBounds(b){this.bounds=b;}}]));
 const hooks=createGroupGestures({manager:{windows},getStore:()=>store,commit:s=>store.setState(s,store.revision)});
 let meta=hooks.begin(windows.get('a'),'resize');hooks.update(meta,{x:50,y:50,width:500,height:350});
 assert.equal(windows.get('b').bounds.width,500);assert.equal(windows.get('b').bounds.height,240);
 const b=store.snapshot('b');b.note.content='typed while another window moved';store.update('b',b.version,b.note);
 hooks.end(meta,{x:50,y:50,width:500,height:350},'end');assert.equal(store.snapshot('b').note.content,b.note.content);
 meta=hooks.begin(windows.get('b'),'move');hooks.update(meta,{x:900,y:50,width:500,height:240});hooks.end(meta,{x:900,y:50,width:500,height:240},'end');
 assert.equal(store.state.attachments.length,0);assert.equal(store.snapshot('b').note.locked,false);assert.equal(store.snapshot('b').note.x,900);
});
