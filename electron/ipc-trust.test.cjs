const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { trustedFileSender } = require('./ipc-trust.cjs');

test('accepts the expected main frame despite query strings and Windows path casing', () => {
  const mainFrame = { url: 'file:///C:/Program%20Files/PinDo/resources/app.asar/dist/index.html?canvasWindow=1' };
  const sender = { mainFrame };
  assert.equal(trustedFileSender({ sender, senderFrame: mainFrame }, sender, 'c:\\program files\\pindo\\resources\\app.asar\\dist\\index.html', 'win32'), true);
});

test('rejects subframes, other WebContents and non-file navigation', () => {
  const mainFrame = { url: pathToFileURL('/tmp/index.html').href };
  const sender = { mainFrame };
  assert.equal(trustedFileSender({ sender, senderFrame: { url: mainFrame.url } }, sender, '/tmp/index.html', 'linux'), false);
  assert.equal(trustedFileSender({ sender: {}, senderFrame: mainFrame }, sender, '/tmp/index.html', 'linux'), false);
  mainFrame.url = 'https://example.test/index.html';
  assert.equal(trustedFileSender({ sender, senderFrame: mainFrame }, sender, '/tmp/index.html', 'linux'), false);
});
