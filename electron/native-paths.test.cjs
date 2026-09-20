const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const vm=require('node:vm');

// Exercise the actual resolver using both Node path implementations, even
// when this suite runs on Linux. This catches Windows separator regressions.
function loadResolver(paths){
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'native-paths.cjs'),'utf8'),{
    module,__dirname,
    require:name=>{assert.equal(name,'node:path');return paths;}
  });
  return module.exports;
}

test('native script resolver handles real Windows paths, spaces and UNC paths',()=>{
  const {nativeScript}=loadResolver(path.win32);
  assert.equal(nativeScript('windows-ocr.ps1',String.raw`C:\Users\Thomas Chen\PinDo\resources\app.asar\electron`),String.raw`C:\Users\Thomas Chen\PinDo\resources\app.asar.unpacked\electron\windows-ocr.ps1`);
  assert.equal(nativeScript('windows-ocr.ps1',String.raw`C:\dev\electron`),String.raw`C:\dev\electron\windows-ocr.ps1`);
  assert.equal(nativeScript('windows-ocr.ps1','/dev/electron'),String.raw`\dev\electron\windows-ocr.ps1`);
  assert.equal(nativeScript('windows-desktop-host.ps1',String.raw`\\server\share\app.asar.unpacked\electron`),String.raw`\\server\share\app.asar.unpacked\electron\windows-desktop-host.ps1`);
});

test('native script resolver preserves POSIX development and unpacked paths',()=>{
  const {nativeScript}=loadResolver(path.posix);
  assert.equal(nativeScript('windows-ocr.ps1','/dev/electron'),'/dev/electron/windows-ocr.ps1');
  assert.equal(nativeScript('windows-ocr.ps1','/app/resources/app.asar/electron'),'/app/resources/app.asar.unpacked/electron/windows-ocr.ps1');
  assert.equal(nativeScript('windows-ocr.ps1','/app/resources/app.asar.unpacked/electron'),'/app/resources/app.asar.unpacked/electron/windows-ocr.ps1');
});
