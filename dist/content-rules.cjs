(function(root){
  const defaults = new Set(['随手记','待办清单','待办便签','时间轴','桌面整理','未命名便签']);
  function entityCharacter(code,fallback=' '){
    const point=Number(code);
    return Number.isInteger(point)&&point>0&&point<=0x10ffff?String.fromCodePoint(point):fallback;
  }
  function decodeEntities(value){
    return value
      .replace(/&nbsp;|&#160;/gi,' ')
      .replace(/&(?:zwnj|zwj);|&#8203;|&#x200b;/gi,'')
      .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
      .replace(/&#(\d+);/g,(_match,code)=>entityCharacter(code))
      .replace(/&#x([0-9a-f]+);/gi,(_match,code)=>entityCharacter(parseInt(code,16)));
  }
  function plainUserText(value=''){
    if(typeof value!=='string')return '';
    const text=decodeEntities(value)
      .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi,' ')
      .replace(/<br\s*\/?>|<\/(?:div|p|li|tr|h[1-6])>/gi,' ')
      .replace(/<[^>]+>/g,' ')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g,' ')
      .replace(/\s+/g,' ').trim();
    return text;
  }
  function hasTodoContent(todo={}){return Boolean(plainUserText(todo.text)||plainUserText(todo.textHtml));}
  function hasUserContent(note={}){
    if(!note||typeof note!=='object')return false;
    if(['captureImage','pinnedImage','screenshot','imageData'].some(key=>Boolean(note[key])))return true;
    if(note.type==='organizer'&&Array.isArray(note.desktopItems)&&note.desktopItems.length>0)return true;
    if(note.type==='quick'&&(plainUserText(note.content)||plainUserText(note.contentHtml)))return true;
    if(note.type==='todo'&&(note.todos||[]).some(hasTodoContent))return true;
    if(note.type==='timeline'&&(note.events||[]).some(item=>plainUserText(item?.text)||plainUserText(item?.textHtml)))return true;
    const title=plainUserText(note.title)||plainUserText(note.titleHtml);
    return Boolean(title&&!defaults.has(title));
  }
  const api={plainUserText,hasTodoContent,hasUserContent};
  if(typeof module!=='undefined')module.exports=api;else root.PinDoContent=api;
})(globalThis);

