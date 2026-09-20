const box=document.querySelector('#selection');let origin=null,rect=null;
window.pindoNative.on('capture-image',value=>document.querySelector('#screen').src=value);
document.addEventListener('pointerdown',e=>{if(e.button!==0)return;origin={x:e.clientX,y:e.clientY};box.hidden=false;document.body.setPointerCapture(e.pointerId);});
document.addEventListener('pointermove',e=>{if(!origin)return;const x=Math.max(0,Math.min(innerWidth,e.clientX)),y=Math.max(0,Math.min(innerHeight,e.clientY));rect={x:Math.min(x,origin.x),y:Math.min(y,origin.y),width:Math.abs(x-origin.x),height:Math.abs(y-origin.y)};Object.assign(box.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});});
document.addEventListener('pointerup',()=>{if(rect&&rect.width>=3&&rect.height>=3)window.pindoNative.captureSelection(rect);else{origin=null;rect=null;box.hidden=true;}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.pindoNative.captureSelection({cancel:true});});
document.addEventListener('contextmenu',e=>{e.preventDefault();window.pindoNative.captureSelection({cancel:true});});
