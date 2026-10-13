(function(root){
  const shellKeys = Object.freeze(['x','y','w','h','z','locked','mode','pinEnabled']);
  function mergeDraft(latest,draft){
    const merged={...(latest||{}),...(draft||{})};
    for(const key of shellKeys)if(latest&&Object.hasOwn(latest,key))merged[key]=latest[key];
    return merged;
  }
  function shouldDeferSnapshot({noteWindowId,compositionDepth,editorActive}){
    return Boolean(noteWindowId&&(Number(compositionDepth)>0||editorActive));
  }
  const api={shellKeys,mergeDraft,shouldDeferSnapshot};
  if(typeof module!=='undefined')module.exports=api;else root.PinDoEditorStability=api;
})(globalThis);
