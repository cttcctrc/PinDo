const query=new URLSearchParams(location.search);if(query.get('transparent')!=='1')document.body.classList.add('opaque');
const title=document.querySelector('#title'),summary=document.querySelector('#summary'),count=document.querySelector('#count');
window.pindoNative.on('cf07-preview-state',note=>{title.textContent=note?.title||'Preview';const detail=note?.summary||'';summary.textContent=note?.type==='timeline'&&detail?`本周要进行【${detail}】`:detail;summary.hidden=!detail;count.textContent=Number(note?.count)||0;count.hidden=note?.type!=='todo';});
