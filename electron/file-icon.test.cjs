const test = require('node:test');
const assert = require('node:assert/strict');
const {createFileIconReader} = require('./file-icon.cjs');
const image = value => ({isEmpty: () => false, toDataURL: () => value});
test('shortcut icon resolves its target without launching or changing the shortcut', async () => {
  const calls = [];
  const file = 'C:\\Desktop\\Chrome.lnk';
  const read = createFileIconReader({
    shell: {readShortcutLink: value => { assert.equal(value, file); return {target:'%PROGRAMFILES%\\Google\\chrome.exe'}; }},
    app: {getFileIcon: async value => {calls.push(value); return image('chrome-icon');}}
  }, 'win32', {ProgramFiles:'C:\\Program Files'});
  assert.equal(await read(file), 'chrome-icon');
  assert.deepEqual(calls, ['C:\\Program Files\\Google\\chrome.exe']);
});
test('missing target falls back to original shortcut without rejecting import', async () => {
  const calls=[];
  const read=createFileIconReader({shell:{readShortcutLink:()=>({target:'C:\\missing.exe'})},app:{getFileIcon:async value=>{
    calls.push(value);if(value.endsWith('.exe'))throw Error('missing');return image('fallback');
  }}},'win32');
  assert.equal(await read('C:\\item.lnk'),'fallback');
  assert.equal(calls.length,2);
});
test('explicit image icon is preferred; ordinary files do not resolve shortcuts',async()=>{
  let resolved=0;
  const read=createFileIconReader({shell:{readShortcutLink:()=>{resolved++;return {icon:'C:\\custom.png'};}},nativeImage:{createFromPath:()=>image('custom')},app:{getFileIcon:async()=>image('file')}},'win32');
  assert.equal(await read('C:\\item.lnk'),'custom');
  assert.equal(await read('C:\\item.txt'),'file');
  assert.equal(resolved,1);
});
