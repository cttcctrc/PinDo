(function(root){
  function stateFor({date=new Date(),count=0,stage=1,hasReminder=false,idle=true}){
    if(!idle||hasReminder)return 'idle';
    const minute=date.getHours()*60+date.getMinutes();
    if(minute>=1320||minute<480||(minute>=720&&minute<810))return 'sleep';
    if(count>10||stage>=3)return 'depressed';
    if(count>5||stage>=2)return 'sad';
    return 'idle';
  }
  const api={stateFor};if(typeof module!=='undefined')module.exports=api;else root.PinDoDodo=api;
})(globalThis);
