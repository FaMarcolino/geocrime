// Gera o PDF do relatório com o Edge (respeita @page) para conferir o layout A4/ABNT: node pdf.mjs [index.html] [saida.pdf]
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {launch, sleep} from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(process.argv[2] || path.join(here, '..', 'geocrime-bh', 'index.html'));
const OUT = path.resolve(process.argv[3] || path.join(here, 'saida', 'relatorio_abnt.pdf'));
fs.mkdirSync(path.dirname(OUT), {recursive: true});
const page = await launch();
await page.viewport(1400, 850);
await page.open(pathToFileURL(FILE).href);
await page.ev(`localStorage.clear()`);
await page.ev(`document.getElementById('wx')&&document.getElementById('wx').click()`);
await page.ev(`pmOpen()`); await sleep(3500); await page.ev(`ronda()`); await sleep(4500);
await page.ev(`document.querySelector('#vt [data-v=rel]').click()`); await sleep(1200);
await page.shot(path.join(path.dirname(OUT), 'relatorio_previa.png'));
await page.ev(`(()=>{const p=document.getElementById('rep');p.className='';p.innerHTML=relMontar()})()`);
await page.send('Emulation.setEmulatedMedia', {media: 'print'}); await sleep(500);
const r = await page.send('Page.printToPDF', {preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false});
fs.writeFileSync(OUT, Buffer.from(r.data, 'base64'));
console.log('PDF:', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB', 'folhas no DOM:', await page.ev(`document.querySelectorAll('#rep .folha').length`));
/* uma imagem por folha (mídia de tela, tamanho real) para conferir o visual */
await page.send('Emulation.setEmulatedMedia', {media: ''});
await page.viewport(900, 1200);
await page.ev(`(()=>{const c=document.createElement('div');c.id='ov';c.style.cssText='position:absolute;left:0;top:0;width:900px;z-index:99999;background:#ccc;padding:0';c.innerHTML=document.querySelector('#rpaper .folhas').outerHTML;c.firstChild.style.zoom=1;document.body.appendChild(c);document.documentElement.style.overflow='auto'})()`);
await sleep(400);
const n = await page.ev(`document.querySelectorAll('#ov .folha').length`);
for (let i = 0; i < n; i++) {
  const b = await page.ev(`(()=>{const r=document.querySelectorAll('#ov .folha')[${i}].getBoundingClientRect();return[r.left+scrollX,r.top+scrollY,r.width,r.height]})()`);
  const s = await page.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true, clip: {x: b[0], y: b[1], width: b[2], height: b[3], scale: 0.9}});
  fs.writeFileSync(path.join(path.dirname(OUT), `folha_${String(i + 1).padStart(2, '0')}.png`), Buffer.from(s.data, 'base64'));
}
await page.close();