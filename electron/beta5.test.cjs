const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {allowed,nextMinute}=require('../dist/date-rules.cjs');
const {stateFor}=require('../dist/dodo-rules.cjs');
const {nativeScript,resolveUnpackedBase}=require('./native-paths.cjs');
test('deadline rejects yesterday and elapsed minutes today; preserves future and 24:00 boundary',()=>{
 const now=new Date(2026,8,16,15,30,20).getTime();
 assert.equal(allowed('2026-09-15',23,59,now),false);
 assert.equal(allowed('2026-09-16',15,30,now),false);
 assert.equal(allowed('2026-09-16',15,31,now),true);
 assert.equal(allowed('2026-09-16',24,0,now),true);
 assert.equal(allowed('2026-09-17',0,0,now),true);
 assert.deepEqual(nextMinute(new Date(2026,8,16,23,59,59).getTime()),{date:'2026-09-17',hour:0,minute:0});
});
test('sleep hours include night and lunch, with reminders and interaction interrupting sleep',()=>{
 const at=(h,m=0)=>new Date(2026,8,16,h,m);
 for(const date of [at(22),at(7,59),at(12),at(13,29)])assert.equal(stateFor({date}),'sleep');
 for(const date of [at(8),at(11,59),at(13,30),at(21,59)])assert.equal(stateFor({date}),'idle');
 assert.equal(stateFor({date:at(23),hasReminder:true}),'idle');
 assert.equal(stateFor({date:at(23),idle:false}),'idle');
 assert.equal(stateFor({date:at(15),count:6}),'sad');
 assert.equal(stateFor({date:at(15),count:11}),'depressed');
 assert.equal(stateFor({date:at(15),stage:3}),'depressed');
});
test('Windows helpers resolve outside ASAR while development path is untouched',()=>{
 assert.equal(resolveUnpackedBase('/app/resources/app.asar/electron'),'/app/resources/app.asar.unpacked/electron');
 assert.equal(resolveUnpackedBase(String.raw`C:\app\resources\app.asar\electron`),String.raw`C:\app\resources\app.asar.unpacked\electron`);
 assert.equal(nativeScript('windows-ocr.ps1','/dev/electron'),path.join('/dev/electron','windows-ocr.ps1'));
 assert.equal(resolveUnpackedBase('/dev/electron'),'/dev/electron');
});
