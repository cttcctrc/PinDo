const fs = require('node:fs');
const path = require('node:path');

const starter = () => ({ notes: [
  { id: 'todo', type: 'todo', title: '近期代办', text: '确认本周交付\n梳理设计反馈\n准备下周会议', x: 52, y: 105, width: 388, height: 470 },
  { id: 'organizer', type: 'organizer', title: '桌面整理', text: '📁 项目资料     ▦ 设计资产\n📁 本周文件     ▣ 常用软件\n\n拖动标题移动，拖动右下角缩放。', x: 485, y: 104, width: 460, height: 315 },
  { id: 'quick', type: 'quick', title: '随手记', text: '点击这里直接输入文字。\n\n便签属于同一张画布，空白区域会把点击交给 Windows 桌面。', x: 605, y: 455, width: 344, height: 250 }
] });

function validState(value) {
  if (!value || !Array.isArray(value.notes) || value.notes.length > 40) return false;
  const ids = new Set();
  for (const note of value.notes) {
    if (!note || typeof note.id !== 'string' || !/^[a-zA-Z0-9-]{1,60}$/.test(note.id) || ids.has(note.id) || !['todo', 'organizer', 'quick'].includes(note.type)) return false;
    ids.add(note.id);
    if (typeof note.title !== 'string' || note.title.length > 120 || typeof note.text !== 'string' || note.text.length > 5000) return false;
    if (!['x', 'y', 'width', 'height'].every(key => Number.isFinite(note[key]) && Math.abs(note[key]) < 10000)) return false;
    if (note.width < 230 || note.height < 170) return false;
  }
  return true;
}

function loadState(directory) {
  try { const state = JSON.parse(fs.readFileSync(path.join(directory, 'canvas-preview.json'), 'utf8')); if (validState(state)) return state; } catch {}
  return starter();
}

function saveState(directory, value) {
  if (!validState(value)) throw new Error('Invalid preview state');
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, 'canvas-preview.json');
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temp, target);
}

module.exports = { starter, validState, loadState, saveState };
