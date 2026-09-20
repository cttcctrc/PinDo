const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2] || 'release-update');
const port = Number(process.argv[3] || 8787);
if (!fs.existsSync(root)) {
  console.error(`[PinDo] 找不到更新目录：${root}`);
  console.error('[PinDo] 请先运行“Windows-生成升级测试版.cmd”。');
  process.exit(1);
}

const types = { '.yml': 'text/yaml; charset=utf-8', '.yaml': 'text/yaml; charset=utf-8', '.exe': 'application/octet-stream', '.blockmap': 'application/octet-stream' };
const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`).pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  const requested = pathname === '/' ? '/latest.yml' : pathname;
  const file = path.resolve(root, `.${requested}`);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
  let stat;
  try { stat = fs.statSync(file); } catch { response.writeHead(404); response.end('Not found'); return; }
  if (!stat.isFile()) { response.writeHead(404); response.end('Not found'); return; }
  const common = { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
  const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if (range) {
    const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    if (!Number.isSafeInteger(start) || start > end || start >= stat.size) { response.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); response.end(); return; }
    response.writeHead(206, { ...common, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
    if (request.method === 'HEAD') response.end(); else fs.createReadStream(file, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, { ...common, 'Content-Length': stat.size });
  if (request.method === 'HEAD') response.end(); else fs.createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[PinDo] 本地更新服务器已启动：http://127.0.0.1:${port}/`);
  console.log(`[PinDo] 正在提供：${root}`);
  console.log('[PinDo] 测试期间请保持此窗口打开，按 Ctrl+C 停止。');
});
