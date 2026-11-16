// Valida uma base de ocorrências (CSV/TSV) antes de usá-la no app e gera um relatório de qualidade com o que seria descartado e por quê.
// Uso: node validar-base.mjs caminho/dados.csv [--saida=nome]      Saída: saida/<nome>.md e .json (padrão: relatorio-qualidade)
// Usa a mesma caixa de BH do app (js/01-base.js) e as mesmas regras de leitura do importador (separador, vírgula decimal, datas).
// O arquivo é lido só neste computador; nada é enviado.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
if (!pos[0]) { console.error('Uso: node validar-base.mjs caminho/dados.csv [--saida=nome]'); process.exit(1); }
const ARQ = path.resolve(pos[0]);
const NOME = (args.find(a => a.startsWith('--saida=')) || '').slice(8) || 'relatorio-qualidade';
const OUT = path.join(here, 'saida'); fs.mkdirSync(OUT, {recursive: true});

// caixa de BH: lida do próprio app para não divergir
const base = fs.readFileSync(path.join(here, '..', 'geocrime-bh', 'js', '01-base.js'), 'utf8');
const mb = /const BB=\{la:\[([-\d.]+),([-\d.]+)\],ln:\[([-\d.]+),([-\d.]+)\]\}/.exec(base);
if (!mb) { console.error('Não achei a caixa BB em js/01-base.js'); process.exit(1); }
const BB = {la: [+mb[1], +mb[2]], ln: [+mb[3], +mb[4]]};

let tx = fs.readFileSync(ARQ);
try { tx = new TextDecoder('utf-8', {fatal: true}).decode(tx); } catch { tx = new TextDecoder('windows-1252').decode(tx); }
tx = tx.replace(/^﻿/, '');
const first = tx.split(/\r?\n/).find(l => l.trim()) || '';
const cnt = ch => first.split(ch).length - 1;
const sep = cnt(';') > 0 && cnt(';') >= cnt(',') ? ';' : cnt('\t') > cnt(',') ? '\t' : ',';
function linhas(t, s) { const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true; else if (ch === s) { r.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; if (r.some(x => x.trim() !== '')) rows.push(r); r = []; }
    else c += ch; }
  r.push(c); if (r.some(x => x.trim() !== '')) rows.push(r); return rows; }
const rows = linhas(tx, sep), H = rows[0].map(s => s.trim());
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/ /g, '_');
const NOMES = {lat: ['lat', 'latitude', 'y', 'coord_y', 'lat_fato', 'latitude_fato'], lng: ['lng', 'lon', 'long', 'longitude', 'x', 'coord_x', 'lon_fato', 'longitude_fato'],
  data: ['data', 'data_fato', 'data_hora', 'data_ocorrencia', 'dt_fato', 'datahora', 'data_hora_fato'], tipo: ['tipo', 'natureza', 'delito', 'natureza_principal', 'nat', 'ds_natureza']};
const col = {}; for (const k in NOMES) col[k] = H.map(norm).findIndex(h => NOMES[k].includes(h));
if (col.lat < 0 || col.lng < 0) { console.error('Colunas de latitude/longitude não encontradas. Cabeçalho: ' + H.slice(0, 8).join(', ')); process.exit(1); }
const num = s => { s = String(s ?? '').trim(); if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.'); return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN; };
const parseData = s => { s = String(s || '').trim(); let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s), y, mo, d, hh = null, mi = null, ss = null;
  if (m) { [y, mo, d] = [+m[1], +m[2], +m[3]]; if (m[4] != null) { hh = +m[4]; mi = +m[5]; ss = +(m[6] || 0); } }
  else if ((m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s))) { [d, mo, y] = [+m[1], +m[2], +m[3]]; if (m[4] != null) { hh = +m[4]; mi = +m[5]; ss = +(m[6] || 0); } }
  else return null;
  const dt = new Date(y, mo - 1, d); return dt.getMonth() === mo - 1 && dt.getDate() === d ? {y, mo, d, hh, mi, ss} : null; };

const n = rows.length - 1, c = {ok: 0, semCoord: 0, foraBH: 0, semData: 0, semHoraNaData: 0, horaZero: 0};
const fora = [], porAno = {}, porMes = {}, coord = new Map(), coordTxt = new Set(), casas = {}, inst = new Map(), exatas = new Map(), tipos = new Map(), semCoordEx = [], semDataEx = [];
let dmin = null, dmax = null;
const KM_LAT = 111.0, KM_LON = 111.0 * Math.cos(-19.92 * Math.PI / 180);
for (let k = 1; k < rows.length; k++) {
  const r = rows[k], la = num(r[col.lat]), ln = num(r[col.lng]);
  if (isNaN(la) || isNaN(ln)) { c.semCoord++; if (semCoordEx.length < 5) semCoordEx.push({linha: k + 1, lat: r[col.lat], lng: r[col.lng]}); continue; }
  if (!(la >= BB.la[0] && la <= BB.la[1] && ln >= BB.ln[0] && ln <= BB.ln[1])) {
    c.foraBH++; const dx = Math.max(BB.ln[0] - ln, 0, ln - BB.ln[1]) * KM_LON * 1000, dy = Math.max(BB.la[0] - la, 0, la - BB.la[1]) * KM_LAT * 1000;
    fora.push({linha: k + 1, lat: la, lng: ln, alem_da_caixa_m: Math.round(Math.hypot(dx, dy)), data: col.data >= 0 ? r[col.data] : ''}); continue; }
  c.ok++;
  const key = la.toFixed(7) + ',' + ln.toFixed(7); coord.set(key, (coord.get(key) || 0) + 1);
  const txtLa = String(r[col.lat]).trim(), txtLn = String(r[col.lng]).trim(), kt = txtLa + ',' + txtLn; coordTxt.add(kt);
  const nd = (txtLa.split(/[.,]/)[1] || '').length;
  if (col.tipo >= 0) { const t = (r[col.tipo] || '').trim(); tipos.set(t, (tipos.get(t) || 0) + 1); }
  if (col.data >= 0) {
    const d = parseData(r[col.data]);
    if (!d) { c.semData++; if (semDataEx.length < 5) semDataEx.push({linha: k + 1, valor: r[col.data]}); continue; }
    const iso = `${d.y}-${String(d.mo).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    porAno[d.y] = porAno[d.y] || {n: 0, horaZero: 0}; porAno[d.y].n++;
    const ym = iso.slice(0, 7); porMes[ym] = (porMes[ym] || 0) + 1;
    if (!dmin || iso < dmin) dmin = iso; if (!dmax || iso > dmax) dmax = iso;
    if (d.hh == null) c.semHoraNaData++;
    else { if (d.hh === 0 && d.mi === 0 && d.ss === 0) { c.horaZero++; porAno[d.y].horaZero++; } }
    const ik = String(r[col.data]).trim(); inst.set(ik, (inst.get(ik) || 0) + 1);
    const ek = kt + '|' + ik; exatas.set(ek, (exatas.get(ek) || 0) + 1);
    const cy = casas[d.y] = casas[d.y] || {baixa: 0, n: 0, dist: {}}; cy.n++; if (nd <= 4) cy.baixa++; cy.dist[nd] = (cy.dist[nd] || 0) + 1;
  }
}
const pct = (a, b) => b ? (100 * a / b).toFixed(1).replace('.', ',') + '%' : '—';
const fmt = v => v.toLocaleString('pt-BR');
const topCoord = [...coord].sort((a, b) => b[1] - a[1]).slice(0, 5);
const repetidas = [...coord.values()].filter(v => v > 1).length;
const exatasDup = [...exatas.values()].filter(v => v > 1).reduce((s, v) => s + v - 1, 0);
const instRep = [...inst.values()].filter(v => v > 1).length;
// meses sem nenhum registro entre o primeiro e o último
const meses = Object.keys(porMes).sort(), vazios = [];
if (meses.length) { let [y, m] = meses[0].split('-').map(Number); const [y1, m1] = meses.at(-1).split('-').map(Number);
  while (y < y1 || (y === y1 && m <= m1)) { const k = `${y}-${String(m).padStart(2, '0')}`; if (!porMes[k]) vazios.push(k); if (++m > 12) { m = 1; y++; } } }
const anos = Object.keys(porAno).sort();

const R = {arquivo: path.basename(ARQ), separador: sep === '\t' ? 'TAB' : sep, colunas: {lat: H[col.lat], lng: H[col.lng], data: col.data >= 0 ? H[col.data] : null, tipo: col.tipo >= 0 ? H[col.tipo] : null},
  caixa_BH: BB, linhas: n, importaveis: c.ok, descartes: {sem_coordenada: c.semCoord, fora_da_caixa_de_BH: c.foraBH}, sem_data_valida: c.semData, sem_hora_na_data: c.semHoraNaData, hora_00_00_00: c.horaZero,
  periodo: {de: dmin, ate: dmax}, por_ano: porAno, meses_sem_registro: vazios, coordenadas_unicas_texto_exato: coordTxt.size, coordenadas_unicas_7_casas: coord.size, casas_decimais_por_ano: casas, coordenadas_repetidas: repetidas, mais_repetidas: topCoord.map(([k, v]) => ({coord: k, vezes: v})),
  duplicatas_exatas: exatasDup, instantes_repetidos: instRep, fora_da_caixa: fora, naturezas: [...tipos].sort((a, b) => b[1] - a[1]).slice(0, 15)};
fs.writeFileSync(path.join(OUT, NOME + '.json'), JSON.stringify(R, null, 1));

let md = `# Relatório de qualidade da base: ${R.arquivo}\n\n`;
md += `Separador **${R.separador}**; colunas usadas: latitude \`${R.colunas.lat}\`, longitude \`${R.colunas.lng}\`, data \`${R.colunas.data ?? '(nenhuma)'}\`, natureza \`${R.colunas.tipo ?? '(nenhuma: todos os registros contam como um único tipo)'}\`.\n`;
md += `Caixa de BH usada pelo app: latitude ${BB.la[0]} a ${BB.la[1]}, longitude ${BB.ln[0]} a ${BB.ln[1]}.\n\n`;
md += `## Resumo\n\n| Item | Quantidade |\n|---|---|\n| Linhas de dados | ${fmt(n)} |\n| **Importáveis** | **${fmt(c.ok)}** (${pct(c.ok, n)}) |\n| Descartadas: sem coordenada numérica | ${fmt(c.semCoord)} |\n| Descartadas: fora da caixa de BH | ${fmt(c.foraBH)} |\n`;
if (col.data >= 0) md += `| Importáveis sem data válida (o app assume "hoje") | ${fmt(c.semData)} |\n| Período | ${dmin ?? '—'} a ${dmax ?? '—'} |\n`;
md += `\n`;
if (fora.length) { md += `### Descartadas por estarem fora da caixa de BH${fora.length > 20 ? ' (20 primeiras)' : ''}\n\n| Linha | Latitude | Longitude | Além da caixa | Data |\n|---|---|---|---|---|\n`;
  for (const f of fora.slice(0, 20)) md += `| ${f.linha} | ${f.lat} | ${f.lng} | ${f.alem_da_caixa_m} m | ${f.data} |\n`;
  const perto = fora.filter(f => f.alem_da_caixa_m <= 2000).length;
  md += perto ? `\n${perto} ponto(s) ficam a menos de 2 km da borda e podem ser de BH; se forem muitos, a caixa do app (js/01-base.js) pode estar estreita.\n\n` : `\nTodos ficam a mais de 2 km da caixa: provavelmente são de outro município ou erro de coordenada.\n\n`; }
if (semCoordEx.length) md += `### Exemplos sem coordenada numérica\n\n${semCoordEx.map(e => `- linha ${e.linha}: lat="${e.lat}", lng="${e.lng}"`).join('\n')}\n\n`;
if (semDataEx.length) md += `### Exemplos sem data válida\n\n${semDataEx.map(e => `- linha ${e.linha}: "${e.valor}"`).join('\n')}\n\n`;
if (col.data >= 0) {
  md += `## Registros por ano\n\n| Ano | Registros | % do total | Horário 00:00:00 |\n|---|---|---|---|\n`;
  for (const a of anos) md += `| ${a} | ${fmt(porAno[a].n)} | ${pct(porAno[a].n, c.ok - c.semData)} | ${fmt(porAno[a].horaZero)} (${pct(porAno[a].horaZero, porAno[a].n)}) |\n`;
  md += `\n- **Horário exatamente 00:00:00:** ${fmt(c.horaZero)} registros (${pct(c.horaZero, c.ok - c.semData)}). Pode significar "hora desconhecida"; o app trataria como meia-noite e isso distorce análises por hora do dia.\n`;
  if (c.semHoraNaData) md += `- **Datas sem horário:** ${fmt(c.semHoraNaData)} registros (o app assume 12h).\n`;
  md += `- **Meses sem nenhum registro** entre o primeiro e o último: ${vazios.length ? vazios.join(', ') : 'nenhum'}.\n`;
  const v = anos.map(a => porAno[a].n), mx = Math.max(...v), mn = Math.min(...v);
  if (mn > 0 && mx / mn >= 4) md += `- **Volume muito desigual entre anos** (de ${fmt(mn)} a ${fmt(mx)}): o aumento pode refletir mudança na coleta e não no fenômeno; confirmar com a fonte antes de usar o histórico antigo. O último ano pode estar incompleto (período termina em ${dmax}).\n`;
  md += `\n`; }
md += `## Coordenadas repetidas\n\n- Coordenadas únicas: ${fmt(coordTxt.size)} (texto exato) ou ${fmt(coord.size)} (arredondando a 7 casas, ~1 cm) em ${fmt(c.ok)} registros importáveis; ${fmt(repetidas)} coordenadas aparecem mais de uma vez.\n`;
md += `- Mais repetidas: ${topCoord.map(([k, v]) => `${k} (${v}×)`).join('; ')}.\n`;
if (col.data >= 0) md += `- **Duplicatas exatas** (mesmo texto de latitude, longitude e data/hora): ${fmt(exatasDup)} registros extras. Se a fonte afirma tê-las removido, há divergência com o arquivo.\n- Instantes que se repetem em mais de um registro: ${fmt(instRep)}.\n`;
const baixas = Object.entries(casas).filter(([, v]) => v.baixa / v.n >= .02);
if (anos.length) { md += `\n## Precisão das coordenadas (casas decimais da latitude)\n\n| Ano | Registros | Com ≤ 4 casas (~11 m ou pior) | Casas mais comuns |\n|---|---|---|---|\n`;
  for (const a of anos) { const v = casas[a]; if (!v) continue; md += `| ${a} | ${fmt(v.n)} | ${fmt(v.baixa)} (${pct(v.baixa, v.n)}) | ${Object.entries(v.dist).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, q]) => k + ' (' + fmt(q) + ')').join(', ')} |\n`; }
  md += baixas.length ? `\nNos anos ${baixas.map(([a]) => a).join(', ')} há coordenadas arredondadas a ~11 m ou mais grosseiras: pontos diferentes viram o mesmo ponto e a repetição de coordenada fica artificialmente alta. Convém tratar como baixa precisão ou confirmar a origem com a fonte.\n` : `\nNenhum ano com proporção relevante de coordenadas grosseiras.\n`; }
md += `\nRepetição de coordenada costuma indicar ponto fixo (endereço, poste, equipamento) ou geocodificação por endereço; é característica da base, não erro, mas afeta métodos que supõem pontos distintos (ex.: DBSCAN).\n`;
if (tipos.size) { md += `\n## Naturezas (${tipos.size} valores distintos; 15 mais frequentes)\n\n| Natureza | Registros |\n|---|---|\n` + R.naturezas.map(([t, v]) => `| ${t || '(vazio)'} | ${fmt(v)} |`).join('\n') + '\n'; }
fs.writeFileSync(path.join(OUT, NOME + '.md'), md);
console.log(md);
console.log(`Salvo em ${path.join(OUT, NOME + '.md')} e .json`);
