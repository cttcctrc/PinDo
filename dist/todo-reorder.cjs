(function(root){
  function resolveTodoDrop(items,movingId,{targetId='',after=false,quadrant='',previousId='',nextId=''}={}){
    const remaining=(items||[]).filter(item=>item.id!==movingId);
    let index=nextId?remaining.findIndex(item=>item.id===nextId):-1;
    if(index<0&&previousId){const previousIndex=remaining.findIndex(item=>item.id===previousId);if(previousIndex>=0)index=previousIndex+1;}
    if(index<0&&targetId){const targetIndex=remaining.findIndex(item=>item.id===targetId);if(targetIndex>=0)index=targetIndex+(after?1:0);}
    if(index<0){const matching=remaining.map((item,itemIndex)=>({item,itemIndex})).filter(entry=>(entry.item.quadrant||'')===quadrant);index=matching.length?matching.at(-1).itemIndex+1:remaining.length;}
    return {index:Math.max(0,Math.min(index,remaining.length)),quadrant};
  }
  function applyTodoDrop(items,movingId,slot={}){
    const source=[...(items||[])],from=source.findIndex(item=>item.id===movingId);
    if(from<0)return {items:source,changed:false,fromIndex:-1,toIndex:-1};
    const placement=resolveTodoDrop(source,movingId,slot),[moving]=source.splice(from,1);
    const previousQuadrant=moving.quadrant||'';moving.quadrant=placement.quadrant||'';
    source.splice(placement.index,0,moving);
    return {items:source,changed:from!==placement.index||previousQuadrant!==moving.quadrant,fromIndex:from,toIndex:placement.index};
  }
  function slotFromGeometry(rows,pointerY){
    const ordered=[...(rows||[])].sort((a,b)=>a.top-b.top);
    const nextIndex=ordered.findIndex(row=>pointerY<(row.top+row.bottom)/2);
    if(nextIndex<0)return {previousId:ordered.at(-1)?.id||'',nextId:''};
    return {previousId:nextIndex?ordered[nextIndex-1].id:'',nextId:ordered[nextIndex].id};
  }
  function autoScrollDelta(pointerY,top,bottom,{edge=48,max=18}={}){
    if(pointerY<top+edge)return -Math.round(max*Math.min(1,(top+edge-pointerY)/edge));
    if(pointerY>bottom-edge)return Math.round(max*Math.min(1,(pointerY-(bottom-edge))/edge));
    return 0;
  }
  function createDropCommit(callback){
    let ended=false,cancelled=false;
    return {cancel(){if(ended)return false;cancelled=true;ended=true;return true;},finish(value){if(ended||cancelled)return false;ended=true;callback(value);return true;}};
  }
  const api={resolveTodoDrop,applyTodoDrop,slotFromGeometry,autoScrollDelta,createDropCommit};
  if(typeof module!=='undefined')module.exports=api;else root.PinDoTodoReorder=api;
})(globalThis);

