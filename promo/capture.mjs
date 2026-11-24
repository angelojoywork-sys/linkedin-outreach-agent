// Captures real screens of the v2 prototype at 3x, plus element rects, by driving the real app in headless Chrome.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as wait } from 'node:timers/promises';
const ROOT = resolve('..'), OUT = resolve('shots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => { const p = join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p)); });
await new Promise(r => server.listen(0, '127.0.0.1', r)); const HTTP = `http://127.0.0.1:${server.address().port}`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', port = 9700 + (process.pid % 200);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), 'cap-' + port)}`, 'about:blank'], { stdio: 'ignore' });
let tg; for (let i = 0; i < 100 && !tg; i++) { try { tg = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { await wait(250); } }
const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r); let mid = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++mid; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 400)); return m.result.result.value; };
await send('Emulation.setDeviceMetricsOverride', { width: 1160, height: 960, deviceScaleFactor: 5, mobile: false });
await send('Page.navigate', { url: `${HTTP}/v2-recently-connected/index.html` }); await wait(1200);
const RECTS = `(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; };
  const sh = document.querySelector('#shell').getBoundingClientRect();
  const o = { shell: [sh.x, sh.y, sh.width, sh.height] };
  for (const [k, s] of Object.entries({ list: '.list', listHead: '.list-head', pills: '.pills', pillNew: '[data-filter=new]', pillInbox: '[data-filter=inbox]', pane: '#pane', paneHead: '.pane-head', msgs: '#msgs', composer: '#composer', assist: '.assist', assistHead: '.assist-head', basis: '.basis', field: '.assist .field', ask: '#ask', askMic: '[data-mic=ask]', apply: '#applyAsk', note: '#note-ask', chips: '.chips', compose: '#compose', toolbar: '.toolbar', send: '#sendBtn', listNote: '#listNote', sys: '.sys', badge: '#badge', bubble: '.msg.me p' })) o[k] = r(s);
  o.rows = [...document.querySelectorAll('.convo')].map(e => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
  o.basisLi = [...document.querySelectorAll('.basis li')].map(e => { const b = e.getBoundingClientRect(); return { t: e.textContent, r: [b.x, b.y, b.width, b.height] }; });
  o.chipRects = [...document.querySelectorAll('.chip')].map(e => { const b = e.getBoundingClientRect(); return { t: e.textContent, r: [b.x, b.y, b.width, b.height] }; });
  return o; })()`;
async function shot(name) {
  await wait(250);
  const rects = await ev(RECTS); const [x, y, w, h] = rects.shell;
  const r = await send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: h, scale: 1 } });
  writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64'));
  // rects relative to the shell
  const rel = v => Array.isArray(v) ? [v[0] - x, v[1] - y, v[2], v[3]] : v;
  for (const k of Object.keys(rects)) { if (k === 'rows') rects[k] = rects[k].map(rel); else if (k === 'chipRects') rects[k] = rects[k].map(c => ({ t: c.t, r: rel(c.r) })); else if (k === 'basisLi') rects[k] = rects[k].map(c => ({ t: c.t, r: rel(c.r) })); else rects[k] = rel(rects[k]); }
  writeFileSync(join(OUT, name + '.json'), JSON.stringify(rects, null, 1)); console.log(name, Math.round(w), Math.round(h));
}
const noBlink = `document.activeElement && document.activeElement.blur(); document.documentElement.style.caretColor='transparent'`;
const css = `(() => { const s = document.createElement('style'); s.textContent = '.mic[aria-pressed="true"]::after{display:none!important} *{caret-color:transparent!important}'; document.head.appendChild(s); })()`;
await ev(css);
await ev(`${noBlink}`); await shot('draft');
await ev(`(() => { const m = document.querySelector('[data-mic=ask]'); m.setAttribute('aria-pressed','true'); m.innerHTML = '<svg class="ic"><use href="#i-stop"/></svg>'; const a = document.querySelector('#ask'); a.placeholder = ''; a.value = ''; const n = document.querySelector('#note-ask'); n.textContent = 'Listening. Say what to change, for example "make it warmer and ask for a quick chat".'; ${noBlink} })()`); await shot('mic0');
await ev(`(() => { document.querySelector('#ask').value = 'make it warmer and ask for a quick chat'; document.querySelector('#applyAsk').click(); ${noBlink} })()`); await shot('warm');
await ev(`document.querySelector('#sendBtn').click(); ${noBlink}`); await wait(100);
await ev(`(() => { document.querySelector('[data-open=meera]').click(); document.querySelector('#listNote').textContent = 'Sent to Meera. Next: Daniel.'; ${noBlink} })()`); await shot('sentMeera');
ws.close(); chrome.kill(); server.close(); process.exit(0);
