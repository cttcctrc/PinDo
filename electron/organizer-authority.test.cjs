const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'native-features.cjs'), 'utf8');

test('desktop organizer authority is reference-only and never mutates desktop files', () => {
  assert.match(source, /fs\.stat\(file\)/);
  assert.match(source, /shell\.openPath\(item\.path\)/);
  assert.match(source, /shell\.showItemInFolder\(item\.path\)/);
  assert.doesNotMatch(source, /fs\.(?:rename|copyFile|unlink|rm|writeFile|mkdir)\(/);
  assert.doesNotMatch(source, /shell\.(?:trashItem|writeShortcutLink)\(/);
});

test('Desktop and OneDrive Desktop paths remain opaque local references', () => {
  const paths = [
    'C:\\Users\\Thomas\\Desktop\\Folder',
    'C:\\Users\\Thomas\\OneDrive\\Desktop\\Shortcut.lnk'
  ];
  for (const value of paths) {
    assert.equal(path.win32.isAbsolute(value), true);
    assert.equal(path.win32.normalize(value), value);
  }
});

