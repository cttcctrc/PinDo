const test = require('node:test');
const assert = require('node:assert/strict');
const { hasTodoContent, hasUserContent, plainUserText } = require('../dist/content-rules.cjs');

test('empty HTML, whitespace and line breaks are not valid user content', () => {
  for (const value of ['', '  \n ', '<div><br></div>', '<p>&nbsp;</p>', '<span>\u200b</span>', '&#999999999;']) {
    assert.equal(plainUserText(value), '');
  }
  assert.equal(hasTodoContent({ text: '', textHtml: '<div><br></div>', due: '2026-10-12' }), false);
  assert.equal(hasTodoContent({ textHtml: '<b>完成报告</b>' }), true);
});

test('note content rules preserve meaningful text, files and images only', () => {
  assert.equal(hasUserContent({ type: 'quick', title: '随手记', contentHtml: '<p>&nbsp;</p>' }), false);
  assert.equal(hasUserContent({ type: 'todo', title: '待办清单', todos: [{ textHtml: '<br>' }] }), false);
  assert.equal(hasUserContent({ type: 'timeline', title: '时间轴', events: [{ text: '会议' }] }), true);
  assert.equal(hasUserContent({ type: 'organizer', title: '桌面整理', desktopItems: [{ path: 'C:\\Desktop\\a.lnk' }] }), true);
  assert.equal(hasUserContent({ type: 'quick', title: '自定义标题', content: '' }), true);
});

