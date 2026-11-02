// Junta index.html + css/ + js/ num único arquivo portátil: node build.mjs  →  dist/geocrime_bh.html
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(here, f), 'utf8');
let html = read('index.html');

const css = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">/g)];
const js = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)];
if (!css.length || !js.length) throw new Error('index.html sem css/js locais');

html = html.replace(css[0][0], () => '<style>\n' + css.map(m => read(m[1])).join('\n') + '</style>');
for (const m of css.slice(1)) html = html.replace(m[0], '');
html = html.replace(js[0][0], () => '<script>\n' + js.map(m => read(m[1])).join('\n') + '</script>');
for (const m of js.slice(1)) html = html.replace(m[0], '');

fs.mkdirSync(path.join(here, 'dist'), {recursive: true});
fs.writeFileSync(path.join(here, 'dist', 'geocrime_bh.html'), html);
console.log('dist/geocrime_bh.html gerado:', (html.length / 1024).toFixed(1), 'KB');
