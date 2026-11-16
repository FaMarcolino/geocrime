// Roda a comparação de algoritmos (grade uniforme × recorte por células da QuadTree) nos cenários de teste e salva os resultados.
// Uso: node comparar-bases.mjs [sementes=5] [index.html]     Saída: saida/comparacao_bases.json e .md
//      node comparar-bases.mjs --csv=caminho/dados.csv [index.html]   (base real; saída: saida/comparacao_real.json e .md)
// Com --csv, o arquivo é lido e importado só no navegador de teste (perfil temporário); nada sai do computador.
// A importação é automática (mesmas regras do app: colunas lat/lng/natureza/hora/data detectadas pelo cabeçalho).
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {launch} from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const CSV = (args.find(a => a.startsWith('--csv=')) || '').slice(6);
const DEP = +(args.find(a => a.startsWith('--dep=')) || '').slice(6) || 0;   // profundidade máxima da QuadTree (padrão do app: 9)
const SEM = +pos[0] || 5;
const FILE = path.resolve((CSV ? pos[0] : pos[1]) || path.join(here, '..', 'geocrime-bh', 'index.html'));
const OUT = path.join(here, 'saida'); fs.mkdirSync(OUT, {recursive: true});
const page = await launch();
await page.viewport(1400, 850);
await page.open(pathToFileURL(FILE).href);
await page.ev(`localStorage.clear();document.getElementById('wx')&&document.getElementById('wx').click()`);
if (DEP) await page.ev(`(()=>{const d=document.getElementById('dep');d.value=${DEP};d.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const t0 = Date.now();
let R;
if (CSV) {
  const b64 = fs.readFileSync(path.resolve(CSV)).toString('base64');
  await page.ev(`(async()=>{const b=Uint8Array.from(atob('${b64}'),c=>c.charCodeAt(0));await importCSV(new File([b],${JSON.stringify(path.basename(CSV))}),{auto:true})})()`);
  const info = await page.ev(`({n:S.all.length,chip:document.getElementById('dc').textContent})`);
  console.log(`Base importada: ${info.n} registros (${info.chip.trim()})`);
  if (!(info.n >= 100)) { await page.close(); console.error('Poucos registros importados (menos de 100): confira colunas, coordenadas dentro de BH e datas.'); process.exit(1); }
  R = await page.ev(`cmpRodar({fonte:'carregada'}).then(r=>JSON.parse(JSON.stringify(r)))`);
} else R = await page.ev(`cmpRodar({fonte:'cenarios',sementes:${SEM}}).then(r=>JSON.parse(JSON.stringify(r)))`);
await page.close();
R.segundos = Math.round((Date.now() - t0) / 1000);
const BASE = (CSV ? 'comparacao_real' : 'comparacao_bases') + (DEP ? '_prof' + DEP : '');
fs.writeFileSync(path.join(OUT, BASE + '.json'), JSON.stringify(R, null, 1));
const n1 = (v, c = 1) => Number.isFinite(v) ? v.toFixed(c) : '—', p3 = p => p == null ? '—' : p < 0.001 ? '<0,001' : p.toFixed(3);
let md = `# Comparação de algoritmos ${CSV ? 'na base carregada (' + path.basename(CSV) + ')' : `nos cenários de teste (${SEM} sementes)`}, ${R.segundos} s\n\nR=${R.params.R} m, profundidade máxima da QuadTree=${R.params.profundidade}.\n\n`;
for (const c of R.cenarios) {
  md += `## ${c.nome}\n${c.n} janelas de ${c.W} d${CSV ? '' : ` (${c.sementes} sementes)`}; ~${c.nFolhas} células na QuadTree\n\n| Método | Grade acerto | PAI | PEI | QT acerto | PAI | PEI | Δ vs KDE (p.p.) | p | Δ recorte (p.p.) [IC95] | p |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const l of c.linhas) md += `| ${l.nome}${l.ref ? ' †' : ''} | ${n1(l.grade.hit)} | ${n1(l.grade.pai)} | ${n1(l.grade.pei, 2)} | ${n1(l.qt.hit)} | ${n1(l.qt.pai)} | ${n1(l.qt.pei, 2)} | ${l.id === 'B' ? '—' : n1(l.dBase.m)} | ${l.id === 'B' ? '—' : p3(l.dBase.padj)} | ${n1(l.dCorte.m)} [${n1(l.dCorte.ic[0])}; ${n1(l.dCorte.ic[1])}] | ${p3(l.dCorte.padj)} |\n`;
  for (const l of c.linhas) if (l.dVs) {
    const ref = c.linhas.find(x => x.id === l.dVs.vs);
    md += `\n${l.nome} × ${ref.nome} (mesmo peso temporal, só muda a largura de banda): Δ acerto na grade = ${n1(l.dVs.m)} p.p. [${n1(l.dVs.ic[0])}; ${n1(l.dVs.ic[1])}], p = ${p3(l.dVs.p)} (sem correção de Holm; comparação única planejada)\n`;
  }
  md += '\n';
}
md += `Resumo: ${R.resumo.total} combinações; recorte QuadTree significativamente melhor em ${R.resumo.fav}, pior em ${R.resumo.contra}, sem diferença em ${R.resumo.neutro}.\n`;
fs.writeFileSync(path.join(OUT, BASE + '.md'), md);
console.log(md);
