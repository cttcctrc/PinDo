(function(root){
  const pad=n=>String(n).padStart(2,'0');
  const localDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  function allowed(date,hour,minute,now=Date.now()){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(hour)||hour<0||hour>24||!Number.isInteger(minute)||minute<0||minute>59)return false;
    const d=new Date(`${date}T00:00:00`);d.setHours(hour,minute,0,0);return d.getTime()>=now;
  }
  function nextMinute(now=Date.now()){const d=new Date(Math.ceil(now/60000)*60000);return {date:localDate(d),hour:d.getHours(),minute:d.getMinutes()};}
  const api={allowed,nextMinute,localDate};if(typeof module!=='undefined')module.exports=api;else root.PinDoDates=api;
})(globalThis);
