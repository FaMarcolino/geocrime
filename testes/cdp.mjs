// Mini driver de Edge via Chrome DevTools Protocol (sem dependências: Node 22+).
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));
const EDGE = process.env.EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

/* Injetado antes do app: PRNG com semente (dados reproduzíveis) e stubs de print/download/clipboard */
const PRELUDE = `(()=>{let s=(window.__seed||12345)>>>0;Math.random=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
window.__printed=0;window.print=()=>{window.__printed++};window.__blobs=[];
const oc=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{window.__blobs.push(b);return oc(b)};
HTMLAnchorElement.prototype.click=function(){window.__dl=this.download};
window.__clip=null;try{Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window.__clip=t;return Promise.resolve()}}})}catch(e){}
window.__errs=[];addEventListener('error',e=>window.__errs.push('error: '+e.message+' @'+e.lineno));addEventListener('unhandledrejection',e=>window.__errs.push('rejection: '+(e.reason&&e.reason.message||e.reason)));
})()`;

export async function launch(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-edge-'));
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(EDGE, [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--headless=new', '--disable-gpu', '--no-first-run',
    '--allow-file-access-from-files', '--window-size=1400,850', ...(opts.args || []), 'about:blank'], {stdio: 'ignore'});
  let list;
  for (let i = 0; i < 60; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (list.find(t => t.type === 'page')) break; } catch {}
    await sleep(250);
  }
  const target = list.find(t => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map(), handlers = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { const {res, rej} = pend.get(d.id); pend.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); }
    else handlers.forEach(h => h(d));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, {res, rej}); ws.send(JSON.stringify({id: i, method, params})); });
  const consoleErrors = [];
  handlers.push(d => {
    if (d.method === 'Runtime.exceptionThrown') consoleErrors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') consoleErrors.push('console.error ' + d.params.args.map(a => a.value ?? a.description).join(' '));
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setFocusEmulationEnabled', {enabled: true});
  const seed = opts.seed ?? 12345;
  await send('Page.addScriptToEvaluateOnNewDocument', {source: `window.__seed=${seed};` + PRELUDE});

  const api = {
    send, consoleErrors,
    async viewport(w, h, mobile = false) { await send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile}); },
    async open(url, {wait = true} = {}) {
      await send('Page.navigate', {url});
      for (let i = 0; wait && i < 80; i++) { await sleep(250); try { if (await api.ev(`typeof S!=='undefined'&&S.f&&S.f.length>=0&&document.readyState==='complete'&&!!S.qt`)) break; } catch {} }
      await sleep(300);
    },
    async ev(expression) {
      const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true, userGesture: true});
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.split('\n')[0] || r.exceptionDetails.text);
      return r.result.value;
    },
    async mouse(type, x, y, extra = {}) { await send('Input.dispatchMouseEvent', {type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra}); },
    async click(x, y, extra = {}) { await api.mouse('mouseMoved', x, y, {buttons: 0, ...extra}); await api.mouse('mousePressed', x, y, extra); await api.mouse('mouseReleased', x, y, extra); },
    async drag(x0, y0, x1, y1, extra = {}, steps = 8) {
      await api.mouse('mouseMoved', x0, y0, {buttons: 0, ...extra}); await api.mouse('mousePressed', x0, y0, extra);
      for (let i = 1; i <= steps; i++) await api.mouse('mouseMoved', x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, extra);
      await api.mouse('mouseReleased', x1, y1, extra);
    },
    async wheel(x, y, dy) { await send('Input.dispatchMouseEvent', {type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy}); },
    async key(key, extra = {}) {
      const text = key.length === 1 ? key : undefined;
      await send('Input.dispatchKeyEvent', {type: 'keyDown', key, text, ...extra}); await send('Input.dispatchKeyEvent', {type: 'keyUp', key, ...extra});
    },
    async shot(file) { const r = await send('Page.captureScreenshot', {format: 'png'}); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); },
    async close() { try { await send('Browser.close'); } catch {} try { ws.close(); } catch {} proc.kill(); },
  };
  return api;
}

/* Espera até a condição (expressão JS) ficar verdadeira */
export async function until(page, expr, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await page.ev(expr)) return true; } catch {} await sleep(150); }
  return false;
}
