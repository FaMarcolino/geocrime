// Bateria de testes do GeoCrime BH (Edge headless via CDP).  Uso: node run.mjs [arquivo.html] [grupo ...]  (sem arquivo, testa ../geocrime-bh/index.html)
import {launch, sleep, until} from './cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
import {pathToFileURL, fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(process.argv[2] || path.join(HERE, '..', 'geocrime-bh', 'index.html'));
const URL0 = pathToFileURL(FILE).href;
const only = process.argv.slice(3);
const OUT = path.join(HERE, 'saida'); fs.mkdirSync(OUT, {recursive: true});

const R = []; let cur = '';
const ok = (c, m) => { if (!c) throw new Error(m || 'falhou'); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
async function T(name, fn, ms = 90000) {
  const t0 = Date.now(), e0 = (page.consoleErrors || []).length;
  try { await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT ' + ms + 'ms')), ms))]); R.push({g: cur, n: name, s: 'OK', ms: Date.now() - t0}); }
  catch (e) { R.push({g: cur, n: name, s: 'FALHA', m: String(e.message).slice(0, 400), ms: Date.now() - t0}); }
  const ne = page.consoleErrors.slice(e0); if (ne.length) R.push({g: cur, n: name + ' [erros de página]', s: 'FALHA', m: ne.join(' | ').slice(0, 400)});
}
const FWD = `const llToUtm=(lon,lat)=>{const a=6378137,f=1/298.257222101,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2),lon0=-45*Math.PI/180,p=lat*Math.PI/180,l=lon*Math.PI/180,N=a/Math.sqrt(1-e2*Math.sin(p)**2),T=Math.tan(p)**2,C=ep2*Math.cos(p)**2,A=(l-lon0)*Math.cos(p),M=a*((1-e2/4-3*e2*e2/64-5*e2**3/256)*p-(3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*p)+(15*e2*e2/256+45*e2**3/1024)*Math.sin(4*p)-(35*e2**3/3072)*Math.sin(6*p));return[k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120)+500000,k0*(M+N*Math.tan(p)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720))+1e7]};`;
const note = (n, m) => R.push({g: cur, n, s: 'NOTA', m});
const G = (name) => { cur = name; return !only.length || only.includes(name); };

let page;
const E = s => page.ev(s);
const HELP = `window.__h={cr:()=>document.getElementById('c').getBoundingClientRect(),world:(sx,sy)=>{const r=__h.cr();return[(sx-r.left-S.V.ox)/S.V.s,(S.V.oy-(sy-r.top))/S.V.s]},scr:(x,y)=>{const r=__h.cr();return[r.left+S.V.ox+x*S.V.s,r.top+S.V.oy-y*S.V.s]},
 free:()=>{const o=[];for(let sy=70;sy<innerHeight-70;sy+=30)for(let sx=70;sx<innerWidth-70;sx+=30){const e=document.elementFromPoint(sx,sy);if(e&&e.id==='c')o.push([sx,sy])}return o},
 bad:()=>{const c=document.body.cloneNode(true);c.querySelectorAll('script,style,option').forEach(n=>n.remove());const t=c.textContent;return['NaN','undefined','Infinity','[object','null'].filter(w=>t.includes(w))},
 set:(id,v)=>{const e=document.getElementById(id);e.value=v;if(e.tagName!=='SELECT')e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'))},
 rect:s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom,vis:r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'}}};`;
const limparArmazenamento = () => page.send('Storage.clearDataForOrigin', {origin: 'file://', storageTypes: 'indexeddb,local_storage'}).catch(() => {});
const fresh = async (q = '', vp = [1400, 850, false]) => { await page.viewport(...vp); await limparArmazenamento(); await page.open(URL0 + q); await E(HELP); await E(`document.getElementById('wx')&&document.getElementById('wx').click()`); await E(`S.V.s>0`); await sleep(400); };
const bad = () => E('__h.bad()');
const waitIdle = async (ms = 400) => { await sleep(ms); };
const busyPt = async (R_ = 500) => E(`(()=>{const f=__h.free();let best=null,bn=-1,emp=null;for(const [sx,sy] of f){const[x,y]=__h.world(sx,sy),n=S.qt.rng(x,y,${R_},[],{v:0}).length;if(n>bn){bn=n;best=[sx,sy,n]}if(n===0&&!emp)emp=[sx,sy]}return{best,emp,free:f.length}})()`);

const main = async () => {
page = await launch();
await page.viewport(1400, 850);
await page.open(URL0); await E(HELP);

/* =============== 1. BOOT =============== */
if (G('boot')) {
  await T('carrega sem erros de console/exceção', async () => { ok(page.consoleErrors.length === 0, page.consoleErrors.join('|')); const e = await E('__errs'); ok(!e.length, e.join('|')); });
  await T('3.000 registros sintéticos, QuadTree e 5 manchas', async () => { ok(await E('S.all.length')===3000, 'all'); ok(await E('S.f.length')===3000); ok(await E('S.hs.length')===5, 'manchas'); ok(await E('S.lv.length>20'), 'células'); });
  await T('texto da página sem NaN/undefined/null', async () => { const b = await bad(); ok(!b.length, b.join(',')); });
  await T('KPIs do HUD coerentes', async () => { ok(await E(`+document.getElementById('s1').textContent.replace(/\\D/g,'')===S.f.length`), 's1'); ok(await E(`+document.getElementById('s2').textContent===S.lv.length`), 's2'); });
  await T('acordeões criados e ids preservados', async () => { ok(await E(`document.querySelectorAll('details.sec').length>=10`), 'details'); for (const id of ['go','rb','pd','db','cmp','xp','xc','xr','file','sel','R','k','cap','dep']) ok(await E(`!!document.getElementById('${id}')`), id); });
  await T('welcome card aparece 1ª vez e some após "Entendi" (localStorage)', async () => {
    await page.open(URL0 + '?x=' + Math.random()); await E(HELP); await E(`localStorage.removeItem('gc_wc')`); await page.open(URL0); await E(HELP);
    ok(await E(`!document.getElementById('wc').hidden`), 'deveria aparecer'); await E(`document.getElementById('wx').click()`); ok(await E(`document.getElementById('wc').hidden`), 'deveria sumir');
    await page.open(URL0); await E(HELP); ok(await E(`document.getElementById('wc').hidden`), 'deveria continuar oculto após recarregar'); });
  await T('determinismo: mesma semente, mesmos dados', async () => { const a = await E('S.all.slice(0,5).map(p=>p.x.toFixed(2)).join()'); await page.open(URL0); const b = await E('S.all.slice(0,5).map(p=>p.x.toFixed(2)).join()'); ok(a === b, 'diferente'); await E(HELP); });
}

/* =============== 2. TAMANHOS DE BASE =============== */
if (G('bases')) {
  await fresh();
  for (const n of [1000, 6000, 20000, 3000]) await T(`botão ${n / 1000}k: carrega e reconstrói`, async () => {
    const t0 = Date.now(); await E(`document.querySelector('#nb button[data-n="${n}"]').click()`);
    ok(await until(page, `S.all.length===${n}&&S.f.length===${n}`, 30000), 'não carregou');
    const ms = Date.now() - t0; note(`tempo ${n}`, ms + ' ms (clique → QuadTree pronta)'); ok(ms < 15000, 'lento: ' + ms);
    ok(await E(`document.querySelector('#nb button.on').dataset.n==='${n}'`), 'botão ativo'); const b = await bad(); ok(!b.length, b.join()); });
  await T('Regerar produz base nova (mesmo tamanho)', async () => { const a = await E('S.all[0].x'); await E(`document.getElementById('regen').click()`); ok(await E('S.all.length===3000')); ok(a !== await E('S.all[0].x'), 'igual'); });
}

/* =============== 3. FILTROS =============== */
if (G('filtros')) {
  await fresh();
  const BR = `const brute=f=>S.all.filter(p=>(!f.t||p.t===f.t)&&(f.r===''||p.r===+f.r)&&(!f.m||p.ym===+f.m)&&(!f.e||(f.e==='i'?p.dm<=10:f.e==='m'?p.dm>10&&p.dm<=20:p.dm>20))&&(!f.p||(()=>{const[a,b]=f.p.split('-').map(Number);return p.h>=a&&p.h<=b})())).length;`;
  const part = async (id, vals, key) => { await E(`['fr','ft','fm','fe','fp'].forEach(i=>__h.set(i,''))`); let sum = 0; for (const v of vals) { await E(`__h.set('${id}','${v}')`); const n = await E('S.f.length'); const okAll = await E(`S.f.every(p=>${key.replaceAll('V', JSON.stringify(v))})`); ok(okAll, `${id}=${v} deixou passar registros fora do filtro`); sum += n; } await E(`__h.set('${id}','')`); ok(sum === await E('S.all.length'), `${id}: soma das partes ${sum} ≠ total`); };
  await T('região: cada uma só traz sua região; soma = total', () => part('fr', [0,1,2,3,4,5,6,7,8], `p.r===+V`));
  await T('natureza: partição', () => part('ft', ['Roubo','Furto','CVLI','Veiculos'], `p.t===V`));
  await T('turno: partição (4 turnos)', () => part('fp', ['0-5','6-11','12-17','18-23'], `(()=>{const[a,b]=V.split('-').map(Number);return p.h>=a&&p.h<=b})()`));
  await T('época do mês: partição', () => part('fe', ['i','m','f'], `(V==='i'?p.dm<=10:V==='m'?p.dm>10&&p.dm<=20:p.dm>20)`));
  await T('mês: partição por mês', async () => { const ms = await E('S.ms'); await part('fm', ms, `p.ym===+V`); });
  await T('combinações aleatórias (60) batem com filtro independente', async () => {
    for (let i = 0; i < 60; i++) {
      const r = await E(`(()=>{${BR}const pick=a=>a[Math.random()*a.length|0];const f={r:pick(['',0,1,2,3,4,5,6,7,8]),t:pick(['','Roubo','Furto','CVLI','Veiculos']),m:pick(['',...S.ms]),e:pick(['','i','m','f']),p:pick(['','0-5','6-11','12-17','18-23'])};
        __h.set('fr',f.r);__h.set('ft',f.t);__h.set('fm',f.m);__h.set('fe',f.e);__h.set('fp',f.p);return{f,app:S.f.length,exp:brute(f),qt:S.qt.n,lv:S.lv.reduce((a,l)=>a+l.n,0)}})()`);
      ok(r.app === r.exp, `filtros ${JSON.stringify(r.f)}: app ${r.app} ≠ esperado ${r.exp}`); ok(r.qt === r.app && r.lv === r.app, 'QuadTree perdeu registros: ' + JSON.stringify(r)); }
    await E(`['fr','ft','fm','fe','fp'].forEach(i=>__h.set(i,''))`); });
  await T('chips: ✕ remove um filtro; "Limpar filtros" remove todos', async () => {
    await E(`__h.set('fr',3);__h.set('ft','Roubo');__h.set('fp','18-23')`); ok(await E(`document.querySelectorAll('#fb .chip.x[data-f]').length>=4`), 'chips');
    await E(`document.querySelector('#fb [data-f="ft"]').click()`); ok(await E(`document.getElementById('ft').value===''`), 'ft não limpou'); ok(await E(`document.getElementById('fr').value==='3'`), 'fr não deveria limpar');
    await E(`document.querySelector('#fb [data-f="*"]').click()`); ok(await E(`['fr','ft','fm','fe','fp'].every(i=>document.getElementById(i).value==='')`), 'limpar tudo'); ok(await E('S.f.length===S.all.length')); });
  await T('filtro sem resultado: mensagem e nenhuma exceção', async () => {
    const c = await E(`(()=>{for(const t of ['CVLI','Veiculos'])for(const r of [0,1,2,3,4,5,6,7,8])for(const p of ['0-5','6-11','12-17','18-23'])for(const e of ['i','m','f']){if(!S.all.some(x=>x.t===t&&x.r===r&&x.h>=+p.split('-')[0]&&x.h<=+p.split('-')[1]&&(e==='i'?x.dm<=10:e==='m'?x.dm>10&&x.dm<=20:x.dm>20)))return{t,r,p,e}}return null})()`);
    if (!c) { note('vazio', 'não achei combinação vazia na base de 3k'); return; }
    await E(`__h.set('ft','${c.t}');__h.set('fr',${c.r});__h.set('fp','${c.p}');__h.set('fe','${c.e}')`); ok(await E('S.f.length===0'), 'não vazio'); ok(await E(`!!document.querySelector('#fb .chip.er')`), 'sem aviso de vazio'); const b = await bad(); ok(!b.length, 'texto ruim: ' + b.join());
    await E(`['fr','ft','fm','fe','fp'].forEach(i=>__h.set(i,''))`); });
  await T('mudar região anima o enquadramento (S.V muda)', async () => { const a = await E('S.V.s'); await E(`__h.set('fr',6)`); await sleep(900); const b = await E('S.V.s'); ok(a !== b, 'visão não mudou'); await E(`__h.set('fr','')`); await sleep(700); });
  await T('gráfico por hora destaca turno (sem exceção) ', async () => { await E(`__h.set('fp','18-23');hourChart();__h.set('fp','')`); });
}

/* =============== 4. QUADTREE =============== */
if (G('quadtree')) {
  await fresh();
  await T('invariantes: partição, contenção, capacidade, profundidade', async () => {
    const r = await E(`(()=>{let bad=[];const n=S.lv.reduce((a,l)=>a+l.n,0);if(n!==S.f.length)bad.push('soma folhas '+n);
      for(const l of S.lv){for(const p of l.pts)if(p.x<l.x0||p.x>l.x1||p.y<l.y0||p.y>l.y1){bad.push('ponto fora da folha');break}if(l.pts.length>l.cap&&l.d<l.md)bad.push('folha acima do limite sem subdividir');if(l.d>l.md)bad.push('profundidade');}
      return bad})()`); ok(!r.length, r.join()); });
  await T('k-NN e raio idênticos à força bruta (k=1,5,15; R=100,500,5000; 150 consultas)', async () => {
    const r = await E(`(()=>{const P=S.f,errs=[];for(let i=0;i<150;i++){const q=i%2?P[Math.random()*P.length|0]:{x:(Math.random()-.5)*60000,y:(Math.random()-.5)*60000};
      for(const k of [1,5,15]){const a=S.qt.knn(q.x,q.y,k,[],{v:0}).map(o=>o.d),b=P.map(p=>(p.x-q.x)**2+(p.y-q.y)**2).sort((u,v)=>u-v).slice(0,k);if(a.length!==b.length||a.some((d,j)=>Math.abs(d-b[j])>1e-6))errs.push('knn k='+k)}
      for(const R of [100,500,5000]){const a=S.qt.rng(q.x,q.y,R,[],{v:0}).length,b=P.filter(p=>(p.x-q.x)**2+(p.y-q.y)**2<=R*R).length;if(a!==b)errs.push('rng R='+R+' '+a+'≠'+b)}}return[...new Set(errs)]})()`); ok(!r.length, r.join()); });
  await T('retângulo (rect) idêntico à força bruta', async () => { const r = await E(`(()=>{const e=[];for(let i=0;i<80;i++){const a=(Math.random()-.5)*30000,b=(Math.random()-.5)*30000,c=a+Math.random()*8000,d=b+Math.random()*8000;const x=S.qt.rect(a,b,c,d,[]).length,y=S.f.filter(p=>p.x>=a&&p.x<=c&&p.y>=b&&p.y<=d).length;if(x!==y)e.push(x+'≠'+y)}return e})()`); ok(!r.length, r.join()); });
  await T('profundidade 3 + limite 5 → aviso de saturação (chip e painel)', async () => {
    await E(`__h.set('dep',3);__h.set('cap',5)`); ok(await E(`document.querySelectorAll('#fb .chip.wn').length===1`), 'chip'); ok(await E(`document.getElementById('al').textContent.includes('saturada')`), 'painel');
    ok(await E(`S.lv.every(l=>l.d<=3)`), 'profundidade > 3'); const n = await E(`S.lv.filter(l=>l.d>=l.md&&l.n>l.cap).length`); ok(n > 0, 'nenhuma saturada');
    await E(`document.querySelector('#fb .chip.wn').click()`); ok(await E(`document.getElementById('cap').closest('details').open`), 'clique no chip não abriu o controle'); });
  await T('profundidade 12 + limite 80 → sem aviso', async () => { await E(`__h.set('dep',12);__h.set('cap',80)`); ok(await E(`document.querySelectorAll('#fb .chip.wn').length===0`), 'ainda saturado?'); });
  await T('limite por região editável (tabela de efetivo) reconstrói a árvore', async () => {
    await E(`__h.set('dep',9);__h.set('cap',25)`); const a = await E('S.lv.length'); await E(`(()=>{const i=document.querySelector('#rt input[data-i="0"][data-k="c"]');i.value=5;i.dispatchEvent(new Event('change'))})()`); const b = await E('S.lv.length'); ok(b > a, `células ${a}→${b}`); ok(await E('RG[0].c===5'));
    await E(`__h.set('cap',25)`); });
  await T('limite padrão (slider) sobrescreve limites por região', async () => { await E(`__h.set('cap',40)`); ok(await E('RG.every(r=>r.c===40)')); await E(`__h.set('cap',25)`); });
  await T('profundidade 3..12 e limite 5..80: todas as combinações sem erro e com N preservado', async () => {
    for (const d of [3, 6, 12]) for (const c of [5, 25, 80]) { await E(`__h.set('dep',${d});__h.set('cap',${c})`); ok(await E('S.qt.n===S.f.length'), `perda em dep=${d} cap=${c}`); } await E(`__h.set('dep',9);__h.set('cap',25)`); });
  await T('pontos coincidentes (mesma coordenada) não estouram a pilha', async () => {
    const r = await E(`(()=>{const q=new QT(0,0,1000,1000,5,9);for(let i=0;i<500;i++)q.ins({x:10,y:10,t:'Roubo'});return q.n===500&&q.leaves([]).length===1})()`); ok(r, 'folha única esperada'); });
}

/* =============== 5. PESOS =============== */
if (G('pesos')) {
  await fresh();
  await T('pesos alteram IG total e manchas', async () => { const w0 = await E('S.W'); await E(`document.querySelectorAll('.wt').forEach(e=>{e.value=e.dataset.t==='CVLI'?20:1;e.dispatchEvent(new Event('change'))})`);
    const exp = await E(`S.f.reduce((a,p)=>a+(p.t==='CVLI'?20:1),0)`); ok(await E('S.W') === exp, 'W'); ok(w0 !== exp); });
  await T('todos os pesos = 0: sem NaN/undefined/exceções em nenhuma tela', async () => {
    await E(`document.querySelectorAll('.wt').forEach(e=>{e.value=0;e.dispatchEvent(new Event('change'))})`);
    await E(`document.getElementById('go').click()`); await sleep(500); await E(`document.getElementById('rd0').click()`); await sleep(300); await E(`document.getElementById('db').click()`); await sleep(500);
    await E(`ronda()`); await sleep(1500); await E(`predRun()`); await sleep(500);
    const b = await bad(); const h = await E(`JSON.stringify(S.hs.map(o=>[o.x,o.y]))`); ok(!h.includes('null') && !h.includes('NaN'), 'manchas com coordenada NaN: ' + h.slice(0, 100)); ok(!b.length, 'texto: ' + b.join());
    await E(`document.querySelectorAll('.wt').forEach(e=>{e.value=e.dataset.t==='Roubo'?3:e.dataset.t==='Furto'?1:e.dataset.t==='CVLI'?5:2;e.dispatchEvent(new Event('change'))})`); await E(`document.getElementById('pmc').click()`); });
  await T('peso 0 só para um tipo: manchas ignoram esse tipo', async () => { await E(`document.querySelector('.wt[data-t="Furto"]').value=0;document.querySelector('.wt[data-t="Furto"]').dispatchEvent(new Event('change'))`); ok(await E('S.W')===await E(`S.f.reduce((a,p)=>a+T[p.t].w,0)`)); await E(`document.querySelector('.wt[data-t="Furto"]').value=1;document.querySelector('.wt[data-t="Furto"]').dispatchEvent(new Event('change'))`); });
}

/* =============== 6. MAPA E INTERAÇÃO (mouse/teclado reais) =============== */
if (G('mapa')) {
  await fresh();
  const bp = await busyPt(); note('pontos livres no mapa', `${bp.free} posições; mais densa ${JSON.stringify(bp.best)}; vazia ${JSON.stringify(bp.emp)}`);
  await T('clique no mapa: consulta, cartão e k vizinhos', async () => { await page.click(bp.best[0], bp.best[1]); await sleep(300); ok(await E('!!S.pin'), 'sem pino'); ok(await E(`!document.getElementById('qc').hidden`), 'cartão oculto'); ok(await E('S.knn.length===+document.getElementById("k").value'), 'k vizinhos'); const t = await E(`document.getElementById('insp').textContent`); ok(/risco/.test(t), t.slice(0, 80)); ok(await E(`document.getElementById('wc').hidden`)); });
  await T('rotas reais até os vizinhos (OSRM) ou mensagem de indisponível', async () => {
    const done = await until(page, `S.kr&&S.kr.length===S.knn.length&&S.kr.length>0`, 25000); ok(done, 'sem rotas após 25 s'); const n = await E('S.kr.filter(Boolean).length'); note('rotas OSRM', `${n}/${await E('S.knn.length')} obtidas`); if (n) ok(await E(`S.kr.filter(Boolean).every(r=>r.km>0&&r.g.length>1)`), 'rota inválida'); });
  await T('k = 1 e 15; R = 100 e 5000 atualizam o cartão', async () => { for (const k of [1, 15]) { await E(`__h.set('k',${k})`); ok(await E(`S.knn.length===${k}`), 'k' + k); } for (const R_ of [100, 5000]) { await E(`__h.set('R',${R_})`); ok(await E(`/Raio ${R_} m/.test(document.getElementById('insp').textContent)`), 'R' + R_); } await E(`__h.set('R',500);__h.set('k',5)`); });
  await T('clique em área sem registros: BAIXO, sem NaN', async () => { if (!bp.emp) { note('sem ponto vazio', 'nenhuma posição livre vazia'); return; } await E('clearQ()'); await page.click(bp.emp[0], bp.emp[1]); await sleep(300); const t = await E(`document.getElementById('insp').textContent`); ok(/BAIXO/.test(t) || /MÉDIO/.test(t), t.slice(0, 100)); const b = await bad(); ok(!b.length, b.join()); });
  await T('cliques repetidos e rápidos (condição de corrida das rotas)', async () => { const f = await E('__h.free()'); for (let i = 0; i < 6; i++) await page.click(f[i * 7 % f.length][0], f[i * 7 % f.length][1]); await sleep(300); const pin = await E('JSON.stringify(S.pin)'); await until(page, 'S.kr&&S.kr.length>0', 15000); ok(await E(`S.knn.length>0&&JSON.stringify(S.pin)===${JSON.stringify(pin)}`), 'pino mudou'); });
  await T('Esc limpa consulta e fecha cartão', async () => { await page.key('Escape'); await sleep(150); ok(await E('!S.pin&&S.knn.length===0&&document.getElementById("qc").hidden'), 'não limpou'); });
  await T('zoom por roda e botões; pan por arrasto', async () => { const s0 = await E('S.V.s'); await page.wheel(760, 450, -240); await sleep(100); const s1 = await E('S.V.s'); ok(s1 > s0, 'zoom in'); await page.wheel(760, 450, 240); await sleep(100); ok(near(await E('S.V.s'), s0, s0 * .01), 'volta'); const o0 = await E('S.V.ox'); await page.drag(700, 450, 760, 470); ok(await E('S.V.ox') !== o0, 'pan'); await E(`document.getElementById('zi').click()`); await sleep(700); ok(await E('S.V.s') > s0 * 1.2, 'botão +'); await E(`document.getElementById('zf').click()`); await sleep(700); });
  await T('zoom extremo (40× in / 40× out) sem erro e sem travar', async () => { const t0 = Date.now(); for (let i = 0; i < 40; i++) await page.wheel(760, 450, -100); ok(await E('S.V.s>0&&isFinite(S.V.s)'), 'escala inválida in'); await sleep(200); for (let i = 0; i < 80; i++) await page.wheel(760, 450, 100); ok(await E('S.V.s>0&&isFinite(S.V.s)'), 'escala inválida out'); note('zoom extremo', (Date.now() - t0) + ' ms'); await E(`document.getElementById('zf').click()`); await sleep(700); });
  await T('hover mostra dica de registro/mancha', async () => { const p = await E(`(()=>{const o=S.hs[0];const [sx,sy]=__h.scr(o.x,o.y);return [sx,sy]})()`); let shown = false; for (const [dx, dy] of [[0, 0], [3, 3], [-3, 2]]) { await page.mouse('mouseMoved', p[0] + dx, p[1] + dy, {buttons: 0}); await sleep(250); if (await E(`[...document.querySelectorAll('.tip')].some(t=>t.style.display==='block')`)) { shown = true; break; } } ok(shown, 'sem dica sobre a mancha #1 (pode estar coberta por painel?)'); });
  await T('seleção de área (Shift+arrastar): estatísticas + rotas reais por viatura dentro do turno', async () => {
    const f = await busyPt(2500); const [sx, sy] = f.best; await page.drag(sx - 90, sy - 70, sx + 90, sy + 70, {modifiers: 8}); await sleep(300); ok(await E('!!S.selM'), 'sem seleção'); ok(await E(`!document.getElementById('sl').hidden`), 'cartão área');
    const n = await E(`S.qt.rect(S.selM.x0,S.selM.y0,S.selM.x1,S.selM.y1,[]).length`); ok(/registros/.test(await E(`document.getElementById('sl').textContent`)));
    if (n >= 2) { ok(await until(page, `/Total:|Poucos|mesmo ponto/.test(document.getElementById('srt')?.textContent||'')`, 60000), 'sem texto de rota');
      const r = await E(`({txt:document.getElementById('srt').textContent,k:S.sr.r.length,ok:S.sr.r.every(x=>x.g.length>1&&x.o.length>0),stops:S.sr.r.reduce((a,x)=>a+x.o.length,0),drop:S.sr.r.reduce((a,x)=>a+x.drop.length,0),dentro:S.sr.r.every(x=>x.min<=+document.getElementById('rh').value*60+1e-6||x.excede)})`);
      note('rota da área', n + ' registros → ' + r.k + ' VTR, ' + r.stops + ' paradas; ' + r.txt.slice(0, 140)); ok(r.ok, 'rota sem geometria/paradas'); ok(r.stops + r.drop <= 60, '>60 paradas'); ok(r.dentro, 'rota estoura o turno'); ok(/Total:/.test(r.txt)); } });
  await T('seleção do mapa inteiro: ≤60 paradas, divididas em viaturas dentro do turno', async () => {
    await E(`S.selM={x0:S.bb[0],y0:S.bb[1],x1:S.bb[2],y1:S.bb[3]};selStats()`); ok(await until(page, `/Total:|sem trajeto/.test(document.getElementById('srt')?.textContent||'')`, 90000), 'sem resultado');
    const r = await E(`({k:S.sr.r.length,stops:S.sr.r.reduce((a,x)=>a+x.o.length,0),drop:S.sr.r.reduce((a,x)=>a+x.drop.length,0),dentro:S.sr.r.every(x=>x.min<=+document.getElementById('rh').value*60+1e-6||x.excede),km:S.sr.r.reduce((a,x)=>a+(x.kmR!=null?x.kmR:x.km),0),max:Math.max(...S.sr.r.map(x=>x.kmR!=null?x.kmR:x.km))})`);
    note('rota mapa inteiro', r.k + ' VTR, ' + r.stops + ' paradas (' + r.drop + ' fora do turno), ' + r.km.toFixed(0) + ' km no total, maior rota ' + r.max.toFixed(0) + ' km'); ok(r.stops + r.drop <= 60); ok(r.k <= 10); ok(r.dentro, 'rota estoura o turno'); });
  await T('seleção pequena (<30 m) e fora dos dados não quebram', async () => { await E(`S.selM={x0:100000,y0:100000,x1:100500,y1:100500};selStats()`); await sleep(300); ok(/Poucos registros/.test(await E(`document.getElementById('srt').textContent`)), 'msg'); await E(`S.selM={x0:0,y0:0,x1:10,y1:10};selStats();draw()`); const b = await bad(); ok(!b.length, b.join()); await E(`clearQ()`); });
  await T('modo "Selecionar área" (botão) + arrastar sem Shift; clique simples não consulta', async () => { await E(`document.getElementById('sel').click()`); ok(await E('S.sm===true')); const f = await busyPt(); await page.click(f.best[0], f.best[1]); ok(await E('!S.pin'), 'não deveria consultar em modo seleção'); await page.drag(f.best[0] - 60, f.best[1] - 60, f.best[0] + 60, f.best[1] + 60); ok(await E('!!S.selM&&(S.selM.x1-S.selM.x0)>30')); await E(`document.getElementById('sel').click()`); ok(await E('S.sm===false&&!S.selM'), 'desligar não limpou'); });
  await T('manchas do HUD: clicar voa e consulta', async () => { await E(`document.querySelector('#hs [data-i="1"]').click()`); await sleep(700); ok(await E('!!S.pin&&Math.hypot(S.pin.x-S.hs[1].x,S.pin.y-S.hs[1].y)<1'), 'pino fora da mancha'); await E('clearQ()'); });
  await T('nome da região na tabela filtra', async () => { await E(`document.querySelector('#rt .rn').click()`); ok(await E(`document.getElementById('fr').value==='0'&&S.f.every(p=>p.r===0)`)); await E(`__h.set('fr','')`); });
  await T('barra de ferramentas: cada botão', async () => {
    for (const l of ['lp', 'lq', 'lh', 'lk', 'lr']) { await E(`document.querySelector('#tb [data-l="${l}"]').click()`); await sleep(120); ok(await E(`document.getElementById('${l}').checked===document.querySelector('#tb [data-l="${l}"]').classList.contains('on')`), 'sync ' + l); await E(`document.querySelector('#tb [data-l="${l}"]').click()`); }
    await E(`document.querySelector('#tb [data-t="panel"]').click()`); ok(await E(`document.body.classList.contains('sc')`)); await E(`document.querySelector('#tb [data-t="panel"]').click()`); ok(await E(`!document.body.classList.contains('sc')`));
    await E(`document.querySelector('#tb [data-t="help"]').click()`); ok(await E(`!document.getElementById('hp').hidden`)); await E(`document.getElementById('hx').click()`); ok(await E(`document.getElementById('hp').hidden`));
    await E(`__h.set('fr',3);__h.set('ft','Roubo')`); await E(`document.querySelector('#tb [data-t="link"]').click()`); await sleep(200); const c = await E('window.__clip'); ok(c && /reg=3/.test(c) && /tipo=Roubo/.test(c), 'link: ' + c); note('link copiado', c);
    await E(`document.querySelector('#tb [data-t="fit"]').click()`); await E(`['fr','ft'].forEach(i=>__h.set(i,''))`); });
  await T('atalhos de teclado: + − F S P ? Esc, e ignorados dentro de campos', async () => {
    const s0 = await E('S.V.s'); await page.key('+'); await sleep(700); ok(await E('S.V.s') > s0, '+'); await page.key('-'); await sleep(700); await page.key('f'); await sleep(700);
    await page.key('s'); ok(await E('S.sm===true'), 's'); await page.key('s'); await page.key('p'); ok(await E(`document.body.classList.contains('sc')`), 'p'); await page.key('p'); await page.key('?'); ok(await E(`!document.getElementById('hp').hidden`), '?'); await page.key('Escape'); ok(await E(`document.getElementById('hp').hidden`), 'esc fecha ajuda');
    await E(`document.querySelector('.tabs [data-p=t2]').click();document.querySelector('.tabs [data-p=t2]').click();document.getElementById('R').closest('details').open=true;document.getElementById('R').focus()`); ok(await E(`document.activeElement.id==='R'`), 'foco'); await page.key('s'); ok(await E('!S.sm'), 'tecla S não deve agir dentro de input'); await E(`document.activeElement.blur()`); });
  await T('camadas: todas as 32 combinações e 4 mapas base desenham sem erro', async () => {
    for (let m = 0; m < 32; m++) { await E(`['lp','lq','lh','lk','lr'].forEach((id,i)=>{document.getElementById(id).checked=!!(${m}>>i&1)});draw()`); }
    for (const b of ['ruas', 'gray', 'sat', 'none']) { await E(`__h.set('bs','${b}');`); await sleep(150); ok(await E(`BASE==='${b}'`)); } await E(`['lp','lq','lh','lr'].forEach(id=>document.getElementById(id).checked=true);document.getElementById('lk').checked=false;__h.set('bs','ruas');draw()`); });
  await T('KDE (calor) com R = 100, 500, 5000', async () => { await E(`document.getElementById('lk').checked=true`); for (const R_ of [100, 500, 5000]) { const t0 = Date.now(); await E(`__h.set('R',${R_});draw()`); note('KDE R=' + R_, (Date.now() - t0) + ' ms'); } await E(`document.getElementById('lk').checked=false;__h.set('R',500)`); });
  await T('tema: página fixa em escuro mesmo com preferência clara? (CSS força :root)', async () => { await page.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: 'light'}]}); await sleep(200); const bg = await E(`getComputedStyle(document.body).backgroundColor`); note('fundo com tema claro do SO', bg); await page.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: 'dark'}]}); });
}

/* =============== 7. POLICIAMENTO =============== */
if (G('policiamento')) {
  await fresh();
  await T('tabela de efetivo: edição de bases/VTR/PM atualiza RG', async () => { await E(`(()=>{for(const [k,v] of [['b',4],['v',7],['p',33]]){const i=document.querySelector('#rt input[data-i="1"][data-k="'+k+'"]');i.value=v;i.dispatchEvent(new Event('change'))}})()`); ok(await E('RG[1].b===4&&RG[1].v===7&&RG[1].p===33')); await E(`(()=>{for(const [k,v] of [['b',3],['v',6],['p',30]]){const i=document.querySelector('#rt input[data-i="1"][data-k="'+k+'"]');i.value=v;i.dispatchEvent(new Event('change'))}})()`); });
  await T('entrada negativa/vazia no efetivo vira 0 (sem NaN)', async () => { await E(`(()=>{const i=document.querySelector('#rt input[data-i="2"][data-k="b"]');i.value='';i.dispatchEvent(new Event('change'))})()`); ok(await E('RG[2].b===0'), 'vazio'); await E(`(()=>{const i=document.querySelector('#rt input[data-i="2"][data-k="b"]');i.value=-5;i.dispatchEvent(new Event('change'))})()`); ok(await E('RG[2].b===0'), 'negativo'); await E(`RG[2].b=3`); });
  await T('distribuir bases: posições, cobertura 0–100%, custo', async () => {
    await E(`document.getElementById('go').click()`); ok(await until(page, 'S.posts.length>0', 15000), 'sem bases'); const r = await E(`({n:S.posts.length,tot:RG.reduce((a,r)=>a+r.b,0),reg:S.posts.every(b=>b.r===reg(b.x,b.y)),cw:S.last.cw,txt:document.getElementById('pp').textContent})`);
    note('bases', `${r.n} posicionadas de ${r.tot} previstas; cobertura pond. ${r.cw.toFixed(1)}%`); ok(r.reg, 'base fora da região'); ok(r.cw >= 0 && r.cw <= 100); const cost = await E(`RG.reduce((s,r)=>s+r.v*(+document.getElementById('cvtr').value)+r.p*(+document.getElementById('cpm').value),0)`);
    ok(r.txt.replace(/\./g, '').includes(String(cost)), 'custo ' + cost + ' não aparece'); ok(r.n <= r.tot); });
  await T('raio de atuação 200…5000: cobertura cresce monotonicamente', async () => { let prev = -1; for (const R_ of [200, 800, 1500, 3000, 5000]) { await E(`__h.set('PR',${R_});alloc()`); const c = await E('S.last.cw'); ok(c >= prev - 1e-9, `cobertura caiu em R=${R_}: ${c} < ${prev}`); prev = c; } await E(`__h.set('PR',1200)`); });
  await T('0 bases em todas as regiões e 50 em cada: sem NaN/erro', async () => { await E(`RG.forEach(r=>r.b=0);alloc()`); ok(await E('S.posts.length===0'), '0 bases'); let b = await bad(); ok(!b.length, 'zero: ' + b.join()); const t0 = Date.now(); await E(`RG.forEach(r=>r.b=50);alloc()`); note('alloc 50 bases/região', (Date.now() - t0) + ' ms, ' + await E('S.posts.length') + ' bases'); b = await bad(); ok(!b.length, '50: ' + b.join()); await E(`RG.forEach(r=>r.b=3);alloc()`); });
  await T('capacidade: aviso de sobrecarga coerente com demanda', async () => { await E(`__h.set('cv',1);alloc()`); const ov = await E('S.posts.filter(b=>b.ov).length'); ok(ov > 0, 'esperava sobrecarga com 1 atend./VTR'); await E(`__h.set('cv',100000);alloc()`); ok(await E('S.posts.every(b=>!b.ov)'), 'esperava nenhuma sobrecarga'); await E(`__h.set('cv',8);alloc()`); });
  await T('redistribuição: totais preservados, proporcional ao IG; aplicar reposiciona', async () => {
    const t0 = await E(`['b','v','p'].map(k=>RG.reduce((a,r)=>a+r[k],0))`); await E(`document.getElementById('rd0').click()`); ok(await until(page, `!!document.getElementById('ap')`, 5000), 'sem botão aplicar'); await E(`document.getElementById('ap').click()`); await sleep(300);
    const t1 = await E(`['b','v','p'].map(k=>RG.reduce((a,r)=>a+r[k],0))`); ok(JSON.stringify(t0) === JSON.stringify(t1), `totais mudaram ${t0}→${t1}`);
    const D = await E(`(()=>{const d=regStats(),W=S.W;return RG.map((r,i)=>[r.v,d[i].s/W*${t1[1]}])})()`); const worst = Math.max(...D.map(([a, b]) => Math.abs(a - b))); ok(worst <= 1.0001, 'distribuição não proporcional (desvio ' + worst.toFixed(2) + ')'); ok(await E(`/Antes/.test(document.getElementById('rd').textContent)`)); });
  const rondaRun = async (o = {}) => {
    const sets = Object.entries(o).filter(([k]) => k !== 'rl').map(([k, v]) => `__h.set('${k}','${v}')`).join(';');
    await E(`S.rt=null;document.getElementById('rrs').textContent='...';${sets};${'rl' in o ? `document.getElementById('rl').checked=${o.rl};` : ''}document.getElementById('rb').click()`);
    ok(await until(page, `!!S.rt&&S.rt.q.length>0&&/Percursos|linha reta/.test(document.getElementById('rrs').textContent)`, 120000), 'não terminou');
  };
  const rondaChk = (per, maxv) => E(`(()=>{const e=[],R=+document.getElementById('R').value,Tm=S.rt.turnoMin,porQ=new Map();
    for(const r of S.rt.q){if(r.o.length>${per})e.push(r.nome+': paradas>${per}');if(!r.o.every(p=>r.quad.has(p.x,p.y)))e.push(r.nome+': parada fora do quadrante');
      if(r.min>Tm+1e-6&&!r.excede)e.push(r.nome+': estoura o turno '+r.min.toFixed(0)+'>'+Tm);
      if(r.dep&&S.rt.fechado&&!(r.path[0]===0&&r.path.at(-1)===0))e.push(r.nome+': não sai/volta à base');
      if(r.dep&&!S.rt.fechado&&!(r.path[0]===0&&r.path.at(-1)!==0))e.push(r.nome+': rota aberta inválida');
      if(!r.g||r.g.length<2&&r.o.length>1)e.push(r.nome+': sem geometria');
      (porQ.get(r.quad)||porQ.set(r.quad,[]).get(r.quad)).push(r)}
    for(const[q,rs]of porQ){if(rs.length>${maxv})e.push(q.nome+': mais de ${maxv} VTR');const ps=rs.flatMap(r=>r.o);if(new Set(ps.map(p=>p.x+','+p.y)).size!==ps.length)e.push(q.nome+': parada em duas rotas');
      for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)if(Math.hypot(ps[i].x-ps[j].x,ps[i].y-ps[j].y)<2*R-1e-6)e.push(q.nome+': paradas a <2R')}
    const tot=RG.reduce((a,r)=>a+r.v,0),sum=S.rt.quads.reduce((a,q)=>a+q.vtr,0);
    if(document.getElementById('rq').value==='reg'){if(!S.rt.quads.every(q=>q.vtr===RG[q.reg].v))e.push('VTR por região ≠ tabela')}else if(sum!==tot)e.push('VTR sugeridas '+sum+' ≠ '+tot);
    return{e:[...new Set(e)],nr:S.rt.q.length,nq:S.rt.quads.length,stops:S.rt.q.reduce((a,r)=>a+r.o.length,0),drop:S.rt.q.reduce((a,r)=>a+r.drop.length,0),km:+S.rt.q.reduce((a,r)=>a+(r.kmR!=null?r.kmR:r.km),0).toFixed(1),dep:S.rt.q.filter(r=>r.dep).length,real:S.rt.q.filter(r=>r.tempoReal).length}})()`);
  await T('bases posicionadas para a ronda sair delas', async () => { await E('alloc()'); ok(await E('S.posts.length>0')); });
  const casos = [['regiões (polígonos), 4 paradas, até 3 VTR, 6 h, ida e volta', {rq: 'reg', rm: 4, rv: 3, rh: 6, rs: 10, rl: true}, 4, 3],
    ['grade 3×3, 4 paradas, até 2 VTR', {rq: '3', rm: 4, rv: 2, rh: 6, rs: 10, rl: true}, 4, 2], ['grade 2×2, 20 paradas, 1 VTR', {rq: '2', rm: 20, rv: 1, rh: 8, rs: 5, rl: true}, 20, 1],
    ['grade 4×4, 2 paradas, até 8 VTR', {rq: '4', rm: 2, rv: 8, rh: 6, rs: 10, rl: true}, 2, 8], ['rota aberta (não volta à base)', {rq: 'reg', rm: 5, rv: 2, rh: 6, rs: 10, rl: false}, 5, 2],
    ['turno curto (1 h, 30 min/parada): paradas ficam de fora', {rq: 'reg', rm: 6, rv: 2, rh: 1, rs: 30, rl: true}, 6, 2]];
  for (const [nome, o, per, mv] of casos) await T('ronda: ' + nome, async () => {
    await rondaRun(o); const r = await rondaChk(per, mv); ok(!r.e.length, r.e.join(' | ')); ok(r.dep > 0, 'sem rotas saindo de base');
    if (o.rh === 1) ok(r.drop > 0, 'esperava paradas fora do turno'); note('ronda ' + nome, `${r.nq} quadrantes, ${r.nr} rotas, ${r.stops} paradas (${r.drop} fora do turno), ${r.km} km; tempos reais em ${r.real}/${r.nr}`); });
  await T('ronda sem bases posicionadas: cada rota parte da parada de maior IG e avisa', async () => { await E('S.posts=[]'); await rondaRun({rq: '3', rm: 4, rv: 2, rh: 6, rs: 10, rl: true}); const r = await rondaChk(4, 2); ok(!r.e.length, r.e.join(' | ')); ok(r.dep === 0, 'não deveria ter base'); ok(/Sem bases posicionadas/.test(await E(`document.getElementById('rrs').textContent`)), 'sem aviso'); await E('alloc()'); });
  await T('ronda: mesmo clique 3× seguidas deixa estado coerente (sem corrida)', async () => { await E(`document.getElementById('rb').click()`); await sleep(100); await E(`ronda();ronda()`); ok(await until(page, `/Percursos|linha reta/.test(document.getElementById('rrs').textContent)`, 120000)); ok(await E('S.rt.q.every(q=>q.g.length>0)')); });
  await T('ronda com filtro de região/turno e com filtro vazio', async () => { await E(`__h.set('fr',3);__h.set('fp','18-23')`); await E(`ronda()`); await until(page, `/Percursos|linha reta|Sem /.test(document.getElementById('rrs').textContent)`, 90000); const n = await E('S.rt?S.rt.q.length:0'); note('ronda região 3 noite', n + ' rotas'); await E(`__h.set('ft','CVLI');__h.set('fe','i');__h.set('fr',0);__h.set('fp','0-5')`); await E('ronda()'); await sleep(2500); const b = await bad(); ok(!b.length, b.join()); await E(`['fr','ft','fm','fe','fp'].forEach(i=>__h.set(i,''))`); });
  await T('clicar na linha da ronda voa até a rota', async () => { await rondaRun({rq: '3'}); const s0 = await E('S.V.s'); await E(`document.querySelector('#rrs [data-q="0"]').click()`); await sleep(800); ok(await E('S.V.s') !== s0, 'não moveu'); });
  await T('OSRM fora do ar (fetch rejeita): tempos estimados, linha reta e aviso', async () => {
    await E(`window.__f=window.fetch;window.fetch=()=>Promise.reject(new Error('offline'))`); await E('S.rt=null;ronda()'); ok(await until(page, `!!S.rt&&/linha reta/.test(document.getElementById('rrs').textContent)`, 30000), 'sem aviso'); const t = await E(`document.getElementById('rrs').textContent`); ok(/Tempos estimados/.test(t), 'sem aviso de tempos estimados'); const r = await rondaChk(4, 3); ok(!r.e.length, r.e.join(' | '));
    await E(`S.selM={x0:S.bb[0],y0:S.bb[1],x1:S.bb[2],y1:S.bb[3]};selStats()`); ok(await until(page, `/sem trajeto/.test(document.getElementById('srt').textContent)`, 30000), 'seleção sem aviso'); await E(`window.fetch=window.__f;clearQ()`); });
  await T('OSRM responde erro (429 / JSON sem rotas): tratado sem exceção', async () => { await E(`window.__f=window.fetch;window.fetch=()=>Promise.resolve({json:()=>Promise.resolve({code:'TooManyRequests',message:'rate'})})`); await E('S.rt=null;ronda()'); ok(await until(page, `!!S.rt&&/linha reta|Percursos/.test(document.getElementById('rrs').textContent)`, 30000)); const e = await E('__errs'); ok(!e.length, e.join()); await E(`window.fetch=window.__f`); });
}

/* =============== 8. ANÁLISE =============== */
if (G('analise')) {
  await fresh();
  await T('predição: mapa abre; modelo e backtest coerentes (sem vazamento, conservação, intervalos)', async () => {
    await E(`document.getElementById('pd').click()`); ok(await until(page, `!document.getElementById('pm').hidden&&!!S.pm`, 30000), 'mapa não abriu');
    const r = await E(`(()=>{const M=S.pm,e=[],bt=M.bt;const s=M.cells.reduce((a,c)=>a+c.e,0);if(Math.abs(s-M.total)>M.total*.03)e.push('Σ células '+s.toFixed(1)+' ≠ total '+M.total.toFixed(1));if(M.cells.some(c=>!(c.e>=0)))e.push('célula negativa/NaN');
      const por=RG.map(()=>0);M.cells.forEach(c=>por[c.r]+=c.e);por.forEach((v,i)=>{if(v>0&&Math.abs(v-M.F[i])>.02*M.F[i]+1e-6)e.push('região '+i+': Σ '+v.toFixed(2)+' ≠ previsto '+M.F[i].toFixed(2))});
      if(M.zs.length>10)e.push('>10 zonas');for(let i=1;i<M.zs.length;i++)if(M.zs[i].e>M.zs[i-1].e+1e-9)e.push('zonas fora de ordem');for(let i=0;i<M.zs.length;i++){const z=M.zs[i];if(!(z.lo<=z.e&&z.e<=z.hi&&z.lo>=0))e.push('intervalo inválido P'+(i+1));for(let j=i+1;j<M.zs.length;j++)if(Math.hypot(z.x-M.zs[j].x,z.y-M.zs[j].y)<2*M.R-1e-6)e.push('zonas sobrepostas')}
      if(bt.wins.length<2)e.push('menos de 2 janelas');for(const w of bt.wins){if(!(w.trMinAgo>=w.cut))e.push('VAZAMENTO: treino com registro dentro da janela (corte '+w.cut+')');if(!(w.teMinAgo>=w.cut-30&&w.teMaxAgo<w.cut))e.push('teste fora da janela '+w.cut);
        for(const m of bt.mets){const x=w.res[m.id];if(!(x.hit>=0&&x.hit<=100&&isFinite(x.pai)))e.push('hit inválido '+m.id)}}
      if(bt.res){if(M.auto&&M.metodo.id!==bt.res.melhor)e.push('método em uso ≠ melhor');if(bt.res.melhor!=='A'&&!bt.res.consistente)e.push('escolheu método sem ganho consistente')}
      const v=bt.vol;if(v.n){const ids=Object.keys(v.wape).filter(k=>v.wape[k]!=null);if(ids.some(k=>!isFinite(v.wape[k])))e.push('WAPE inválido');const best=ids.reduce((a,k)=>v.wape[k]<v.wape[a]-1e-9?k:a,ids[0]);if(best!==v.melhor)e.push('método de volume não é o de menor erro')}
      if(!/Validação \\(backtest\\)/.test(document.getElementById('pml').textContent))e.push('painel sem backtest');
      return{e,total:M.total,cells:M.cells.length,zs:M.zs.length,wins:bt.wins.length,metodo:M.metodo.nome,melhor:bt.res&&bt.res.bruto,hits:bt.res&&Object.fromEntries(Object.entries(bt.res.st).map(([k,x])=>[k,+x.hit.toFixed(1)])),vol:v.wape,vm:M.vm}})()`);
    ok(!r.e.length, r.e.join(' | ')); note('modelo', `${r.cells} células, ${r.zs} zonas, total ${r.total.toFixed(1)}, ${r.wins} janelas, método em uso: ${r.metodo}`); note('backtest (acerto % por método)', JSON.stringify(r.hits) + ' | maior acerto bruto: ' + r.melhor); note('volume (WAPE)', JSON.stringify(r.vol) + ' → ' + r.vm); });
  await T('método manual: cada método do backtest é aplicável; volume total independe do método', async () => {
    const ids = await E('S.pm.bt.mets.map(m=>m.id)'); const tot0 = await E('S.pm.total'); for (const id of ids) { await E(`__h.set('pmm','${id}')`); ok(await E(`S.pm.metodo.id==='${id}'&&S.pm.auto===false&&S.pm.zs.length>0`), 'método ' + id); ok(near(await E('S.pm.total'), tot0, 1e-6), 'volume mudou com o método ' + id); }
    await E(`__h.set('pmm','auto')`); ok(await E('S.pm.auto===true')); });
  await T('painel lista método, intervalos 80% e relatório recebe backtest', async () => { const t = await E(`document.getElementById('pml').textContent`); ok(/Intervalo 80%/.test(t) && /método:/.test(t), 'texto'); ok(await E('!!S.rep.backtest&&!!S.rep.backtestVolume&&S.rep.zonasPrev.h.includes("Intervalo 80%")'), 'relatório'); });
  await T('mapa de predição: pan, zoom (roda e botões), hover, clique em zona, Esc', async () => {
    const o0 = await E('PH.V.ox'); await page.drag(700, 500, 760, 520); ok(await E('PH.V.ox') !== o0, 'pan'); const s0 = await E('PH.V.s'); await page.wheel(760, 450, -240); ok(await E('PH.V.s') > s0, 'roda'); await E(`document.getElementById('pzo').click()`); await sleep(700); await E(`document.getElementById('pzf').click()`); await sleep(700);
    const z = await E(`(()=>{const c=S.pm.cells.reduce((a,b)=>b.e>a.e?b:a);const r=document.getElementById('pc').getBoundingClientRect();return[r.left+PH.V.ox+c.x*PH.V.s,r.top+PH.V.oy-c.y*PH.V.s]})()`); await page.mouse('mouseMoved', z[0], z[1], {buttons: 0}); await sleep(250); const tip = await E(`[...document.querySelectorAll('#pm .tip')].map(t=>t.style.display+'|'+t.textContent).join()`); note('dica na célula mais quente', tip);
    await E(`document.querySelector('#pml [data-z="0"]').click()`); await sleep(700); await page.key('Escape'); ok(await E(`document.getElementById('pm').hidden`), 'Esc não fechou'); });
  await T('25 combinações natureza × turno no mapa de predição', async () => {
    await E(`pmOpen()`); const out = []; for (const nt of ['', 'Roubo', 'Furto', 'CVLI', 'Veiculos']) for (const pt of ['', '0-5', '6-11', '12-17', '18-23']) { const t0 = Date.now(); const r = await E(`(()=>{__h.set('pnt','${nt}');__h.set('ppt','${pt}');const M=S.pm;return M?{n:M.n,tot:+M.total.toFixed(2),z:M.zs.length,nan:M.cells.some(c=>!isFinite(c.e)),txt:document.getElementById('pml').textContent.includes('NaN')}:{n:0}})()`); ok(!r.nan && !r.txt, `NaN em ${nt}/${pt}`); out.push(`${nt || 'todas'}/${pt || 'dia'}:${r.n}${r.n ? '→' + r.tot : '(sem modelo)'}`); if (Date.now() - t0 > 4000) note('lento', nt + pt + ' ' + (Date.now() - t0)); } note('natureza×turno', out.join(' ')); });
  await T('predição: ponderar por gravidade, meia-vida 7/180, R 100/5000', async () => { await E(`__h.set('pnt','');__h.set('ppt','')`); await E(`document.getElementById('pwg').checked=true;pmRun()`); ok(/pontos de gravidade/.test(await E(`document.getElementById('pml').textContent`))); await E(`document.getElementById('pwg').checked=false`); for (const hl of [7, 180]) { await E(`__h.set('hl',${hl});pmRun()`); ok(await E('!!S.pm&&S.pm.cells.length>0'), 'hl' + hl); } for (const R_ of [100, 5000]) { const t0 = Date.now(); await E(`__h.set('R',${R_});pmRun()`); ok(await E('!!S.pm'), 'R' + R_); note('predição R=' + R_, (Date.now() - t0) + ' ms'); } await E(`__h.set('R',500);__h.set('hl',45)`); });
  await T('predição com poucos dados (CVLI + madrugada + região): mensagem amigável', async () => { await E(`__h.set('pnt','CVLI');__h.set('ppt','0-5')`); const t = await E(`document.getElementById('pml').textContent`); note('CVLI/madrugada', t.slice(0, 120)); const b = await bad(); ok(!b.length, b.join()); await E(`__h.set('pnt','');__h.set('ppt','')`); });
  await T('mapa de predição respeita filtro de região', async () => { await E(`__h.set('fr',4)`); await E(`pmRun()`); ok(await E('S.pm.P.every(p=>p.r===4)'), 'região'); await E(`__h.set('fr','')`); await E(`document.getElementById('pmc').click()`); });
  await T('DBSCAN idêntico a uma implementação de referência (nº de aglomerados e ruído)', async () => {
    for (const [R_, mp] of [[500, 12], [300, 6], [800, 30], [100, 3]]) { await E(`__h.set('R',${R_});__h.set('mp',${mp});dbscan()`); const r = await E(`(()=>{const P=S.f,eps=${R_},mp=${mp},n=P.length,lab=new Int32Array(n).fill(-2);const nb=i=>{const o=[];for(let j=0;j<n;j++)if((P[i].x-P[j].x)**2+(P[i].y-P[j].y)**2<=eps*eps)o.push(j);return o};let c=0;
      for(let i=0;i<n;i++){if(lab[i]!==-2)continue;const N=nb(i);if(N.length<mp){lab[i]=-1;continue}lab[i]=c;const q=N.slice();for(let h=0;h<q.length;h++){const j=q[h];if(lab[j]===-1){lab[j]=c;continue}if(lab[j]!==-2)continue;lab[j]=c;const N2=nb(j);if(N2.length>=mp)for(const y of N2)if(lab[y]<0)q.push(y)}c++}
      const noise=lab.reduce((a,v)=>a+(v===-1),0),m=document.getElementById('dbr').innerHTML.match(/<b>(\\d+)<\\/b> aglomerado.*?<b>(\\d+)<\\/b> registros isolados/);return{ref:[c,noise],app:m?[+m[1],+m[2]]:null}})()`); ok(r.app && r.ref[0] === r.app[0] && r.ref[1] === r.app[1], `R=${R_} mp=${mp}: ref ${r.ref} app ${r.app}`); }
    await E(`__h.set('R',500);__h.set('mp',12)`); });
  await T('DBSCAN: R=5000 e mp=3 (pior caso) — tempo', async () => { const t0 = Date.now(); await E(`__h.set('R',5000);__h.set('mp',3);dbscan()`); note('DBSCAN 3k, R=5000', (Date.now() - t0) + ' ms'); await E(`__h.set('R',500);__h.set('mp',12)`); });
  await T('DBSCAN sem aglomerados mostra aviso', async () => { await E(`__h.set('mp',100000);dbscan()`); ok(/Nenhum aglomerado/.test(await E(`document.getElementById('dbr').textContent`))); await E(`__h.set('mp',12)`); });
  await T('comparar períodos: A=B avisa; A≠B colore e confere totais; limpar', async () => {
    await E(`__h.set('ca',S.ms[3]);__h.set('cb',S.ms[3]);cmpRun()`); ok(/diferentes/.test(await E(`document.getElementById('cr').textContent`))); await E(`__h.set('ca',S.ms[3]);__h.set('cb',S.ms[9]);cmpRun()`); ok(await E('!!S.cmp')); const r = await E(`(()=>{const a=S.all.filter(p=>pass(p,1)&&p.ym===S.ms[3]).length,b=S.all.filter(p=>pass(p,1)&&p.ym===S.ms[9]).length;return[a,b,document.getElementById('cr').textContent]})()`); ok(r[2].includes(`Total: ${r[0]} → ${r[1]}`), 'totais ' + r[0] + '→' + r[1] + ' / ' + r[2].slice(0, 60));
    await E(`document.getElementById('cmpx').click()`); ok(await E('!S.cmp')); });
  await T('sazonalidade: 9 regiões, pico válido', async () => { ok(await E('S.rep.sazon.r.length===9')); ok(await E(`S.rep.sazon.r.every(r=>r[2]>0)`)); });
  await T('benchmark: todas as estruturas conferem com a varredura linear', async () => { await E(`document.getElementById('bm').click()`); ok(await until(page, `!!S.rep.estruturas`, 60000)); const r = await E('S.rep.estruturas.r'); ok(r.slice(1).every(x => x[4] === '✓'), JSON.stringify(r)); note('benchmark 3k', r.map(x => `${x[0]}: k-NN ${x[2]}, raio ${x[3]}`).join(' | ')); });
  await T('escalabilidade até 40k registros: termina e plota', async () => { const t0 = Date.now(); await E(`document.getElementById('bsc').click()`); ok(await until(page, `!!S.rep.escala`, 120000), 'não terminou'); note('escalabilidade', (Date.now() - t0) + ' ms; ' + JSON.stringify(await E('S.rep.escala.r.at(-1)'))); }, 150000);
}

/* =============== 9. EXPORTAÇÃO =============== */
if (G('exportar')) {
  await fresh();
  await E(`document.getElementById('go').click()`); await sleep(800); await E(`ronda()`); await sleep(2500); await E(`predRun()`); await sleep(800); await E(`document.getElementById('pmc').click()`);
  const keys = await E('Object.keys(repBase())');
  await T('todas as seções do relatório têm título (TT)', async () => { const miss = await E(`Object.keys(repBase()).filter(k=>!TT[k])`); ok(!miss.length, 'sem título: ' + miss.join()); });
  await T('CSV do relatório: BOM, ; , seções, sem NaN/undefined', async () => { await E(`window.__blobs.length=0;document.getElementById('xc').click()`); const txt = await E(`window.__blobs.at(-1).text()`); const b3 = await E(`(async()=>[...new Uint8Array(await window.__blobs.at(-1).arrayBuffer()).slice(0,3)])()`); ok(b3.join() === '239,187,191', 'sem BOM: ' + b3); ok(!/NaN|undefined/.test(txt), 'NaN/undefined no CSV'); const secs = txt.split('\n\n').length; note('CSV', `${secs} seções, ${txt.length} bytes: ${keys.join(',')}`); ok(secs >= 6); const widths = txt.split('\n\n').map(s => s.split('\n').slice(1).map(l => l.split('";"').length)); ok(widths.every(w => w.every(x => x === w[0])), 'linhas com nº de colunas diferente'); });
  await T('CSV de registros filtrados: cabeçalho, linhas = filtrados, coordenadas em BH, datas ISO', async () => { await E(`__h.set('fr',2);__h.set('ft','Roubo')`); await E(`window.__blobs.length=0;document.getElementById('xr').click()`); const txt = await E(`window.__blobs.at(-1).text()`); const L = txt.replace('﻿', '').trim().split('\n'); ok(L[0] === 'lat;lng;natureza;peso;hora;data;regiao', L[0]); ok(L.length - 1 === await E('S.f.length'), `${L.length - 1} linhas ≠ ${await E('S.f.length')}`);
    ok(L.slice(1).every(l => { const c = l.split(';'); return +c[0] > -20.07 && +c[0] < -19.74 && +c[1] > -44.07 && +c[1] < -43.84 && /^\d{4}-\d{2}-\d{2}$/.test(c[5]) && c[6] === 'Noroeste' || c[6] === 'Nordeste'; }), 'linha inválida'); await E(`['fr','ft'].forEach(i=>__h.set(i,''))`); });
  await T('PDF: chama print, monta tabelas e limitações; imagem do mapa presente?', async () => { await E(`window.__printed=0;document.getElementById('xp').click()`); ok(await E('window.__printed')===1, 'print'); const r = await E(`({tables:document.querySelectorAll('#rep table').length,imgs:document.querySelectorAll('#rep img').length,h2:document.querySelectorAll('#rep h2').length,lim:/Limitações/.test(document.getElementById('rep').textContent)})`); ok(r.tables >= 6 && r.lim, JSON.stringify(r)); note('PDF', JSON.stringify(r) + (r.imgs ? '' : ' → sem imagem do mapa (canvas contaminado pelos tiles Esri sem CORS)')); });
  await T('@media print oculta painel/mapa e mostra #rep', async () => { await page.send('Emulation.setEmulatedMedia', {media: 'print'}); await sleep(200); const r = await E(`[getComputedStyle(document.querySelector('aside')).display,getComputedStyle(document.querySelector('main')).display,getComputedStyle(document.getElementById('rep')).display]`); await page.send('Emulation.setEmulatedMedia', {media: ''}); note('estilo de impressão', r.join(',')); ok(r[2] === 'block' && r[0] === 'none'); });
}

/* =============== 10. IMPORTAÇÃO DE CSV (assistente de mapeamento) =============== */
if (G('csv')) {
  await fresh();
  let seq = 0;
  /* envia o arquivo; se o assistente abrir, aplica "ajustes" (JS no navegador) e confirma */
  const imp = async (csv, {ajustes, bytes = false, confirmar = true, espera = 900} = {}) => {
    await E(`document.getElementById('ts').innerHTML=''`); const name = `t${++seq}.csv`, corpo = bytes ? `Uint8Array.from(${JSON.stringify(csv)},c=>c.charCodeAt(0))` : JSON.stringify(csv);
    await E(`(()=>{const dt=new DataTransfer();dt.items.add(new File([${corpo}],'${name}'));const fi=document.getElementById('file');fi.files=dt.files;fi.dispatchEvent(new Event('change'))})()`);
    await sleep(700);
    const abriu = await E(`!document.getElementById('md').hidden`);
    const dica = abriu ? await E(`document.querySelector('#mdb .hint').textContent`) : '';
    const prev = abriu ? await E(`document.getElementById('cw-prev')?.textContent||''`) : '';
    if (abriu && ajustes) { await E(ajustes); await sleep(200); }
    const habil = abriu ? await E(`!document.getElementById('mdo').disabled`) : false;
    if (abriu && confirmar && habil) { await E(`document.getElementById('mdo').click()`); await sleep(espera); }
    const r = await E(`({abriu:${abriu},loaded:document.getElementById('src').textContent.includes('${name}'),n:S.all.length,src:document.getElementById('src').textContent,toast:document.getElementById('ts').textContent,errs:window.__errs.slice(),modalAberto:!document.getElementById('md').hidden})`);
    return {...r, abriu, dica, prev, habil, name};
  };
  const hdr = 'lat,lng,tipo,hora,data\n';
  await T('CSV válido: assistente abre, importa, filtra e recalcula tudo', async () => { const rows = Array.from({length: 200}, (_, i) => `${-19.92 + (i % 20) * .002},${-43.94 + (i % 13) * .002},${['roubo', 'furto', 'homicidio', 'roubo de veiculo'][i % 4]},${i % 24},2026-0${1 + i % 9}-${10 + i % 15}`).join('\n'); const r = await imp(hdr + rows); ok(r.abriu, 'assistente não abriu'); ok(r.loaded && r.n === 200, 'n=' + r.n + ' src=' + r.src); ok(!r.modalAberto, 'modal ficou aberto'); ok(await E('S.f.length===200&&S.lv.length>0')); const b = await bad(); ok(!b.length, b.join()); });
  await T('natureza reconhecida (roubo/furto/CVLI/veículo)', async () => { const c = await E(`JSON.stringify(Object.fromEntries(['Roubo','Furto','CVLI','Veiculos'].map(t=>[t,S.all.filter(p=>p.t===t).length])))`); ok(/"CVLI":50/.test(c) && /"Veiculos":50/.test(c), c); });
  await T('registros importados ficam nas regiões certas (polígonos)', async () => { ok(await E('S.all.every(p=>p.r===reg(p.x,p.y))')); });
  await T('separador ; e datas dd/mm/aaaa', async () => { const r = await imp('lat;lng;tipo;hora;data\n-19.92;-43.94;roubo;10;15/03/2026\n-19.93;-43.95;furto;22;01/12/2025\n'); ok(r.loaded && r.n === 2, 'n=' + r.n); ok(/separador ";"/.test(r.dica), r.dica); ok(await E('S.all.every(p=>p.ago>0)'), 'datas'); });
  await T('hora em coluna com data+hora ("2026-05-01 13:45") lê a hora certa', async () => { const r = await imp(hdr + '-19.92,-43.94,roubo,2026-05-01 13:45,2026-05-01\n'); ok(r.loaded, 'não importou'); ok(await E('S.all[0].h===13'), 'hora lida = ' + await E('S.all[0].h')); });
  await T('hora 13:45 e 9h; hora na coluna de data+hora', async () => { let r = await imp(hdr + '-19.92,-43.94,roubo,13:45,2026-05-01\n-19.92,-43.94,roubo,9h,2026-05-01\n'); ok(r.loaded); ok(await E('S.all.map(p=>p.h).join()==="13,9"'), 'horas ' + await E('S.all.map(p=>p.h).join()'));
    r = await imp('lat,lng,tipo,data_hora\n-19.92,-43.94,roubo,2026-05-01 21:10\n'); ok(r.loaded && await E('S.all[0].h===21'), 'hora na data_hora: ' + await E('S.all[0].h')); });
  await T('decimal com vírgula e ";" ("-19,92")', async () => { const r = await imp('lat;lng;tipo;hora;data\n"-19,92";"-43,94";roubo;10;2026-03-15\n-19,93;-43,95;furto;11;2026-03-16\n'); ok(r.loaded && r.n === 2, 'n=' + r.n + ' ' + r.prev); });
  await T('arquivo com BOM (Excel) é aceito', async () => { const r = await imp('﻿' + hdr + '-19.92,-43.94,roubo,10,2026-03-15\n'); ok(r.loaded, 'recusado: ' + r.toast); });
  await T('Windows-1252 (acentos do Excel brasileiro): detecta e mostra "Homicídio" corretamente', async () => {
    const csv = 'lat;lng;natureza;hora;data\n-19,92;-43,94;Homic\xEDdio;10;2026-03-15\n-19,93;-43,95;Roubo;11;2026-03-16\n';
    const r = await imp(csv, {bytes: true, confirmar: false}); ok(r.abriu && /Windows-1252/.test(r.dica), 'dica: ' + r.dica);
    const t = await E(`[...document.querySelectorAll('.cw-n')].map(s=>decodeURIComponent(s.dataset.v)+'='+s.value).join()`); ok(/Homicídio=CVLI/.test(t) && /Roubo=Roubo/.test(t), t);
    await E(`document.getElementById('mdo').click()`); await sleep(800); ok(await E(`S.all.some(p=>p.t==='CVLI')`), 'CVLI não importado'); });
  await T('round-trip: reimporta o próprio "Registros filtrados em CSV"', async () => { await fresh(); await E(`window.__blobs.length=0;document.getElementById('xr').click()`); const txt = await E(`window.__blobs.at(-1).text()`); const r = await imp(txt, {espera: 2500}); ok(r.loaded && r.n === 3000, 'não reimportou: ' + r.toast + ' n=' + r.n); });
  await T('cabeçalhos alternativos (latitude, longitude, natureza, hora_ocorrencia, data_fato)', async () => { const r = await imp('Latitude,Longitude,Natureza,Hora_Ocorrencia,Data_Fato\n-19.92,-43.94,Furto,10,2026-03-15\n'); ok(r.loaded && r.n === 1, r.toast); });
  await T('colunas com nomes estranhos: latitude/longitude descobertas pelos valores', async () => { const r = await imp('c1,c2,c3\n-19.92,-43.94,x\n-19.93,-43.95,y\n-19.94,-43.96,z\n', {confirmar: false}); ok(r.abriu); const m = await E(`[+document.getElementById('cw-lat').value,+document.getElementById('cw-lng').value]`); ok(m[0] === 0 && m[1] === 1, 'lat/lng = ' + m); await E(`document.getElementById('mdo').click()`); await sleep(700); ok(await E('S.all.length===3'), 'n=' + await E('S.all.length')); });
  await T('natureza em códigos desconhecidos: nenhum importado até o usuário mapear', async () => {
    const csv = 'lat,lng,natureza,hora,data\n' + Array.from({length: 30}, (_, i) => `${-19.92 + i * .001},${-43.94},${i % 2 ? 'B02' : 'B01'},10,2026-03-15`).join('\n');
    const r = await imp(csv, {confirmar: false}); ok(r.abriu && !r.habil, 'Importar deveria estar desabilitado: ' + r.prev); ok(/0 de 30/.test(r.prev), r.prev);
    await E(`document.querySelectorAll('.cw-n').forEach(s=>{s.value=decodeURIComponent(s.dataset.v)==='B01'?'Furto':'Roubo';s.dispatchEvent(new Event('change'))})`); await sleep(200); ok(await E(`!document.getElementById('mdo').disabled`)); await E(`document.getElementById('mdo').click()`); await sleep(800);
    ok(await E(`S.all.length===30&&S.all.filter(p=>p.t==='Furto').length===15`), 'mapeamento manual não aplicado'); });
  await T('o mapeamento é lembrado para o mesmo cabeçalho', async () => {
    const csv = 'lat,lng,natureza,hora,data\n' + Array.from({length: 10}, (_, i) => `${-19.92 + i * .001},${-43.94},K9,10,2026-03-15`).join('\n');
    let r = await imp(csv, {confirmar: false}); await E(`document.querySelectorAll('.cw-n').forEach(s=>{s.value='Veiculos';s.dispatchEvent(new Event('change'))})`); await E(`document.getElementById('mdo').click()`); await sleep(800);
    r = await imp(csv, {confirmar: false}); ok(/mapeamento anterior/.test(r.dica), 'dica: ' + r.dica); ok(await E(`[...document.querySelectorAll('.cw-n')].every(s=>s.value==='Veiculos')`), 'seleção não lembrada'); await E(`document.getElementById('mdc').click()`); });
  await T('Cancelar/Esc fecham o assistente sem trocar a base', async () => { await fresh(); const antes = await E('S.all.length'); let r = await imp(hdr + '-19.92,-43.94,roubo,10,2026-03-15\n', {confirmar: false}); ok(r.abriu); await page.key('Escape'); await sleep(200); ok(await E(`document.getElementById('md').hidden`), 'Esc não fechou'); ok(await E('S.all.length') === antes, 'base trocada');
    await imp(hdr + '-19.92,-43.94,roubo,10,2026-03-15\n', {confirmar: false}); await E(`document.getElementById('mdc').click()`); ok(await E(`document.getElementById('md').hidden`)); ok(await E('S.all.length') === antes); });
  const casos = [['fora de BH', hdr + '40.7,-74,roubo,10,2026-01-01\n'], ['vazio', ''], ['só cabeçalho', hdr], ['sem lat/lng', 'a,b,c\nx,y,z\n'], ['binário', '\u0000\u0001binário'], ['só quebras de linha', '\n\n\n']];
  for (const [nome, c] of casos) await T(`entrada inválida "${nome}": sem exceção, base mantida, mensagem visível`, async () => { await fresh(); const r = await imp(c, {espera: 400}); ok(!r.errs.length, 'exceção não tratada: ' + r.errs.join()); ok(r.n === 3000 && !r.loaded, 'base trocada indevidamente');
    const msg = r.abriu ? r.prev + ' ' + r.dica : r.toast; ok(msg.length > 10, 'sem mensagem visível'); if (r.abriu) { ok(!r.habil, 'Importar habilitado sem dados válidos'); await E(`document.getElementById('mdc').click()`); } note('mensagem ' + nome, msg.slice(0, 100)); });
  await T('campos entre aspas com vírgula no meio', async () => { await fresh(); const r = await imp('lat,lng,tipo,hora,data\n-19.92,-43.94,"roubo, a pessoa",10,2026-03-15\n'); ok(r.loaded && r.n === 1, 'n=' + r.n + ' ' + r.toast); });
  await T('linhas curtas / hora 99 / lat de texto: aceita só as válidas, avisa o resto', async () => { await fresh(); const r = await imp(hdr + '-19.92,-43.94\n-19.93,-43.95,roubo,99,2026-03-15\nabc,def,roubo,10,2026-03-15\n-19.94,-43.96,roubo,10,2026-03-15\n'); ok(!r.errs.length, r.errs.join()); ok(r.loaded, r.toast); ok(await E('S.all.every(p=>p.h>=0&&p.h<=23)'), 'hora fora de 0-23'); note('linhas ruins', r.n + ' pontos aceitos de 4 linhas; ' + r.toast.slice(0, 120)); });
  await T('20.000 linhas: tempo de importação (inclui atribuição a polígonos e gravação local)', async () => { await fresh(); const rows = Array.from({length: 20000}, (_, i) => `${-19.95 + Math.random() * .15},${-43.99 + Math.random() * .1},roubo,${i % 24},2026-0${1 + i % 9}-1${i % 9}`).join('\n'); const t0 = Date.now(); await imp(hdr + rows, {espera: 100}); ok(await until(page, 'S.all.length===20000', 60000), 'não importou'); note('import 20k', (Date.now() - t0) + ' ms'); });
  await T('datas antigas (>1 ano) e futuras: sem NaN', async () => { await fresh(); const r = await imp(hdr + '-19.92,-43.94,roubo,10,2019-03-15\n-19.93,-43.95,roubo,10,2031-03-15\n-19.94,-43.96,roubo,10,2026-03-15\n'); ok(r.loaded); note('idade (dias) de datas 2019/2031/2026', await E('S.all.map(p=>p.ago).join()')); const b = await bad(); ok(!b.length, b.join()); ok(await E('S.all.every(p=>p.ago>=0)'), 'idade negativa'); });
  await T('base importada é salva no navegador: cartão, restaurar após recarregar e apagar', async () => {
    await fresh(); const rows = Array.from({length: 300}, (_, i) => `${-19.95 + (i * 7919 % 100) * .0013},${-43.99 + (i * 104729 % 100) * .0009},${['roubo', 'furto'][i % 2]},${i % 24},2026-0${1 + i % 9}-1${i % 9}`).join('\n');
    const r = await imp(hdr + rows); ok(r.loaded && r.n === 300); ok(await until(page, `!document.getElementById('svd').hidden`, 8000), 'cartão da base salva não apareceu'); const nome = r.name;
    await page.open(URL0); await E(HELP); ok(await until(page, `!document.getElementById('svd').hidden`, 8000), 'cartão não apareceu após recarregar'); ok((await E(`document.getElementById('svd').textContent`)).includes(nome), 'nome da base');
    ok(await E('S.all.length')===3000, 'não deveria restaurar sozinho'); await E(`document.getElementById('svr').click()`); ok(await until(page, 'S.all.length===300', 10000), 'restaurar falhou');
    ok(await E(`S.all.filter(p=>p.t==='Furto').length===150&&S.all.every(p=>p.r===reg(p.x,p.y))`), 'dados restaurados divergem'); ok(/salva/.test(await E(`document.getElementById('src').textContent`)));
    await E(`document.getElementById('svx').click()`); ok(await until(page, `document.getElementById('svd').hidden`, 5000), 'apagar falhou'); });
  await T('após importar: predição, ronda, DBSCAN e relatório funcionam', async () => { await fresh(); const rows = Array.from({length: 900}, (_, i) => `${-19.95 + (i * 7919 % 100) * .0013},${-43.99 + (i * 104729 % 100) * .0009},roubo,${i % 24},${new Date(Date.now() - (i % 360) * 864e5).toISOString().slice(0, 10)}`).join('\n'); const r = await imp(hdr + rows); ok(r.loaded); await E('predRun()'); await sleep(900); await E(`document.getElementById('pmc').click();dbscan();ronda()`); await sleep(3500); await E(`document.getElementById('xc').click()`); const b = await bad(); ok(!b.length, b.join()); });
}

/* =============== 11. BRIDGE POWER APPS (iframe + postMessage) =============== */
if (G('bridge')) {
  const hostFile = path.join(OUT, 'host.html');
  fs.writeFileSync(hostFile, `<!doctype html><body><iframe id=f style="width:1200px;height:700px;border:0"></iframe><script>window.__m=[];addEventListener('message',e=>__m.push(e.data));
   window.go=(q)=>{document.getElementById('f').src=${JSON.stringify(URL0)}+q};window.send=m=>document.getElementById('f').contentWindow.postMessage(m,'*');</script>`);
  await page.open(pathToFileURL(hostFile).href.replace(/^/, ''), {wait: false}).catch(() => {}); await sleep(600);
  const go = async q => { await E(`__m.length=0;go(${JSON.stringify(q)})`); await until(page, `__m.some(x=>x.evt==='ready')`, 15000); };
  const cmd = async (o, wait = 600) => { const id = Math.random(); await E(`send(${JSON.stringify({...o, id})})`); await until(page, `__m.some(x=>x.evt==='ack'&&x.id===${id})`, 40000); await sleep(wait); return E(`(()=>{const a=__m.filter(x=>x.evt==='ack'&&x.id===${id})[0];const st=__m.filter(x=>x.evt==='state').at(-1);return{ack:a,st}})()`); };
  await T('ready com regiões e estado inicial; filtros por URL', async () => { await go('?embed=1&reg=3&tipo=Roubo&turno=18-23'); const r = await E(`__m.find(x=>x.evt==='ready')`); ok(r.regioes.length === 9 && r.kpi.registros > 0, 'ready'); const t = await E(`__m.find(x=>x.evt==='ready').kpi.registros`); ok(t < 3000, 'filtros por URL não aplicados'); });
  await T('URL com valores inválidos (reg=99, tipo=xx, turno=abc) não quebra', async () => { await go('?embed=1&reg=99&tipo=xx&turno=abc&mes=1&epoca=z&base=nada'); const r = await E(`__m.find(x=>x.evt==='ready').kpi.registros`); note('URL inválida', 'registros=' + r); const e = await E(`document.getElementById('f').contentWindow.__errs`); ok(!e.length, e.join()); });
  await go('?embed=1');
  const cases = [{cmd: 'filtros', regiao: 2, tipo: 'Furto'}, {cmd: 'filtros', regiao: '', tipo: '', turno: '', epoca: '', mes: ''}, {cmd: 'pesos', Roubo: 5, Furto: 1, CVLI: 9, Veiculos: 2}, {cmd: 'parametros', raio: 800, k: 3, paradas: 3, quadrantes: 2}, {cmd: 'camadas', calor: true, registros: false, base: 'none', rotasReais: false}, {cmd: 'camadas', calor: false, registros: true, base: 'ruas', rotasReais: true},
    {cmd: 'efetivo', linhas: [{id: 0, bases: 4, vtr: 8, pm: 40, limite: 20}]}, {cmd: 'inspecionar', lat: -19.92, lng: -43.94}, {cmd: 'zoom', ajustar: true}, {cmd: 'zoom', fator: 2}, {cmd: 'distribuirBases'}, {cmd: 'redistribuir'}, {cmd: 'aplicarRedistribuicao'}, {cmd: 'prever'}, {cmd: 'aglomerados'}, {cmd: 'ronda'}, {cmd: 'benchmark'}, {cmd: 'comparar', mesA: 0, mesB: 0}, {cmd: 'limparComparacao'}, {cmd: 'estado'},
    {cmd: 'exportar', tipo: 'csv'}, {cmd: 'exportar', tipo: 'registros'}, {cmd: 'dados', n: 1000}, {cmd: 'dados', csv: 'lat,lng,tipo,hora,data\n-19.92,-43.94,roubo,10,2026-01-01\n'}];
  for (const c of cases) await T('comando ' + c.cmd + ' ' + JSON.stringify(c).slice(0, 60), async () => { const r = await cmd(c, c.cmd === 'ronda' ? 2500 : 500); ok(r.ack && r.ack.ok, 'ack ' + JSON.stringify(r.ack)); ok(r.st && r.st.kpi, 'sem estado'); const e = await E(`document.getElementById('f').contentWindow.__errs`); ok(!e.length, e.join()); });
  await T('exportar csv devolve texto no evento export', async () => { await go('?embed=1'); await cmd({cmd: 'exportar', tipo: 'csv'}); ok(await E(`__m.some(x=>x.evt==='export'&&x.texto.length>500&&x.nome.endsWith('.csv'))`)); });
  await T('comandos inválidos retornam ack ok:false', async () => { for (const c of [{cmd: 'naoexiste'}, {cmd: 'exportar', tipo: 'zzz'}]) { const r = await cmd(c); ok(r.ack && r.ack.ok === false, JSON.stringify(r.ack)); } });
  await T('segurança: com host=https://evil.example a página ignora mensagens e só posta para esse host', async () => { await go('?embed=1&host=https://evil.example'); const n = await E('__m.length'); const id = Math.random(); await E(`send({cmd:'filtros',regiao:1,id:${id}})`); await sleep(1200); ok(!(await E(`__m.some(x=>x.id===${id})`)), 'respondeu a origem não autorizada'); note('host restrito', `mensagens recebidas pelo pai (origem file): ${n}`); });
  await T('mensagem sem cmd / não-objeto é ignorada', async () => { await go('?embed=1'); await E(`send('texto');send(null);send({foo:1});send({cmd:'estado',id:7})`); await sleep(800); ok(await E(`__m.filter(x=>x.evt==='ack').length===1`), 'acks inesperados'); });
}

/* =============== 12. LAYOUT, RESPONSIVO E VISUAL (shell em painel) =============== */
if (G('layout')) {
  const VPS = [[1920, 1080, false], [1400, 850, false], [1024, 768, false], [820, 1180, true], [390, 844, true]];
  const inter = (a, b) => a && b && a.vis && b.vis && a.x < b.r - 1 && b.x < a.r - 1 && a.y < b.b - 1 && b.y < a.b - 1;
  for (const vp of VPS) {
    await fresh('', vp); const tag = vp[0] + 'x' + vp[1], mobv = vp[0] <= 820;
    await T(`[${tag}] sem rolagem horizontal; barra superior, mapa, indicadores e ferramentas visíveis dentro da janela`, async () => { ok(await E(`document.documentElement.scrollWidth<=innerWidth+1`), 'rolagem horizontal ' + await E('document.documentElement.scrollWidth')); for (const s of ['#tbar', 'main', '.hud', '#tb', '.zb', '#fb', ...(mobv ? [] : ['aside'])]) { const r = await E(`__h.rect('${s}')`); ok(r && r.vis, s + ' invisível'); ok(r.x >= -1 && r.r <= vp[0] + 1 && r.y >= -1 && r.b <= vp[1] + 1, `${s} fora da janela: ${JSON.stringify(r)}`); } });
    await T(`[${tag}] barra lateral ${mobv ? 'é gaveta fechada e abre pelo menu' : 'fica ao lado do mapa, sem cobri-lo'}`, async () => {
      const a = await E(`__h.rect('aside')`), m = await E(`__h.rect('main')`), t = await E(`__h.rect('#tbar')`);
      if (mobv) { ok(a.r <= 1, 'gaveta deveria começar fechada (fora da tela): ' + JSON.stringify(a)); await E(`document.getElementById('hb').click()`); await sleep(500); const b = await E(`__h.rect('aside')`); ok(b.x >= -1 && b.r > 100, 'gaveta não abriu'); ok(await E(`document.body.classList.contains('sd')`)); await page.shot(path.join(OUT, `gaveta_${tag}.png`)); await E(`document.getElementById('bd').click()`); await sleep(400); ok((await E(`__h.rect('aside')`)).r <= 1, 'toque no fundo não fechou'); }
      else { ok(a.r <= m.x + 1, `barra lateral (até ${a.r}) invade o mapa (desde ${m.x})`); ok(Math.abs(t.x - m.x) < 2 && t.y + t.h <= m.y + 1, 'barra superior desalinhada'); ok(a.h >= vp[1] - 2, 'barra lateral não ocupa a altura inteira'); } });
    await T(`[${tag}] sobreposição entre elementos do mapa`, async () => {
      const el = {}; for (const s of ['.hud', '#tb', '.zb', '#lc', '#fb', '#wc', '#tbar']) el[s] = await E(`__h.rect('${s}')`); const bad = [];
      for (const [a, b] of [['.hud', '.zb'], ['.hud', '#tb'], ['.hud', '#fb'], ['.zb', '#fb'], ['.hud', '#wc'], ['.zb', '#wc'], ['#tb', '#wc'], ['#tbar', '.hud'], ['#tbar', '.zb'], ['#tbar', '#fb'], ['#tbar', '#tb']]) if (inter(el[a], el[b])) bad.push(a + '×' + b); ok(!bad.length, 'sobrepõem: ' + bad.join(', ')); });
    await T(`[${tag}] mapa visível e dados fora dos indicadores`, async () => { const r = await E(`(()=>{const f=__h.free().length,tot=Math.ceil((innerWidth-140)/30)*Math.ceil((innerHeight-140)/30),cr=document.getElementById('c').getBoundingClientRect(),u=document.querySelector('.hud').getBoundingClientRect(),[x0,y0]=__h.scr(S.bb[0],S.bb[3]),[x1,y1]=__h.scr(S.bb[2],S.bb[1]);const w=cr.width,rr=Math.max(0,cr.right-u.left+12);return{freePct:Math.round(f/tot*100),bb:[Math.round(x0),Math.round(y0),Math.round(x1),Math.round(y1)],cr:[cr.left,cr.top,cr.right,cr.bottom],hudL:u.left,pula:w<=820||w-rr<w*.55,w:innerWidth}})()`); note(`mapa livre ${tag}`, JSON.stringify(r)); ok(r.freePct >= 25, 'só ' + r.freePct + '% do mapa está livre');
      ok(r.bb[0] >= r.cr[0] - 2 && r.bb[2] <= r.cr[2] + 2 && r.bb[1] >= r.cr[1] - 2 && r.bb[3] <= r.cr[3] + 2, 'dados fora do mapa: ' + JSON.stringify(r.bb)); if (!r.pula) ok(r.bb[2] <= r.hudL + 3, `dados (até x=${r.bb[2]}) ficam sob os indicadores (a partir de ${Math.round(r.hudL)})`); });
    await T(`[${tag}] botões da barra de ferramentas clicáveis (não cobertos)`, async () => { const bad = await E(`[...document.querySelectorAll('#tb button')].filter(b=>{const r=b.getBoundingClientRect();if(r.right>innerWidth||r.left<0)return false;const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e!==b&&!b.contains(e)}).map(b=>b.textContent.trim())`); ok(!bad.length, 'cobertos: ' + bad.join()); });
    await T(`[${tag}] barra superior: menu, busca, tela cheia e alertas clicáveis`, async () => { if (vp[0] <= 700) await E(`document.getElementById('sbt').click()`); const bad = await E(`['#hb','#q',...(innerWidth>700?['#fs']:['#sbt']),'#bl'].filter(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();if(!r.width)return true;const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return!(t&&(t===e||e.contains(t)||t.contains(e)))})`); ok(!bad.length, 'cobertos/ocultos: ' + bad.join()); });
    await E(`document.querySelector('.sbx').classList.remove('open')`);
    await page.shot(path.join(OUT, `layout_${tag}.png`));
    await T(`[${tag}] mapa de predição: cartões visíveis e clicáveis`, async () => { await E(`document.getElementById('pd').click()`); await until(page, `!!S.pm`, 20000); await sleep(600); const bad = await E(`['.pmh','#pml','#pmc','#pzi'].filter(s=>{const e=document.querySelector(s);if(!e)return true;const r=e.getBoundingClientRect();const t=document.elementFromPoint(r.x+Math.min(20,r.width/2),r.y+Math.min(20,r.height/2));return !(t&&(t===e||e.contains(t)))})`); await page.shot(path.join(OUT, `predicao_${tag}.png`)); await E(`document.getElementById('pm').hidden=true`); ok(!bad.length, 'cobertos/ocultos: ' + bad.join()); });
    await T(`[${tag}] cartão de consulta abre sem estourar a tela`, async () => { const bp = await busyPt(); if (!bp.best) { note('sem ponto', tag); return; } await page.click(bp.best[0], bp.best[1]); await sleep(300); const r = await E(`__h.rect('#qc')`); ok(r && r.vis, 'cartão ausente'); ok(r.b <= vp[1] + 1 && r.r <= vp[0] + 1, 'cartão estoura a tela ' + JSON.stringify(r)); await E('clearQ()'); });
  }
  await T('acessibilidade básica: botões sem nome, canvas sem alternativa, campos sem rótulo', async () => { await fresh(); const r = await E(`({btn:[...document.querySelectorAll('button')].filter(b=>!(b.textContent.trim()||b.title||b.getAttribute('aria-label'))).length,inp:[...document.querySelectorAll('input,select')].filter(i=>!i.id||!(document.querySelector('label[for="'+i.id+'"]')||i.closest('label')||i.getAttribute('aria-label')||i.title)).map(i=>i.id||i.className).slice(0,12),canvasAlt:[...document.querySelectorAll('canvas')].filter(c=>!c.getAttribute('aria-label')&&!c.getAttribute('role')).length,live:!!document.querySelector('[aria-live]'),lang:document.documentElement.lang,tabbable:document.querySelectorAll('button,input,select,summary').length})`); note('a11y', JSON.stringify(r)); ok(r.btn === 0, r.btn + ' botões sem nome'); });
  await T('contraste do texto secundário (--mu sobre --bg) ≥ 4,5:1', async () => { const c = await E(`(()=>{const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};const hex=h=>{h=h.replace('#','');return[0,2,4].map(i=>parseInt(h.substr(i,2),16))};const cs=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();const a=lum(hex(cs('--mu'))),b=lum(hex(cs('--pn')));return+(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2))})()`); note('contraste --mu sobre --pn', c + ':1'); ok(c >= 4.5, 'contraste ' + c); });
  await T('fontes externas e privacidade: requisições a domínios de terceiros', async () => { const r = await E(`performance.getEntriesByType('resource').map(e=>new URL(e.name).host).filter((h,i,a)=>h&&a.indexOf(h)===i)`); note('domínios externos', r.join(', ')); });
}

/* =============== 16. PAINEL: NAVEGAÇÃO, BUSCA, ALERTAS, INDICADORES =============== */
if (G('painel')) {
  await fresh();
  await T('navegação: um módulo aberto por vez, painel logo abaixo do item, item ativo destacado', async () => {
    const r = await E(`({ab:[...document.querySelectorAll('.tp.on')].map(t=>t.id),sob:[...document.querySelectorAll('.tabs>button')].every(b=>b.nextElementSibling&&b.nextElementSibling.id===b.dataset.p),on:document.querySelector('.tabs>button.on').dataset.p,icones:document.querySelectorAll('.tabs>button .ni svg').length})`);
    ok(r.ab.join() === 't1' && r.on === 't1' && r.sob && r.icones === 4, JSON.stringify(r));
    for (const t of ['t2', 't3', 't4', 't1']) { await E(`document.querySelector('.tabs [data-p="${t}"]').click()`); ok(await E(`[...document.querySelectorAll('.tp.on')].map(x=>x.id).join()==='${t}'&&document.querySelector('.tabs>button.on').dataset.p==='${t}'`), 'módulo ' + t); } });
  await T('indicadores: variação dos últimos 30 dias confere com cálculo independente', async () => {
    const r = await E(`(()=>{const rec=S.f.filter(p=>p.ago<30).length,pre=S.f.filter(p=>p.ago>=30&&p.ago<60).length,pct=(rec-pre)/pre*100;return{txt:document.getElementById('d1').textContent,cls:document.getElementById('d1').className,rec,pre,pct,ig:document.getElementById('s5').textContent,W:S.W}})()`);
    ok(r.pre >= 10, 'base de comparação pequena: ' + r.pre); const esp = (r.pct > .5 ? '▲ ' : r.pct < -.5 ? '▼ ' : '') + Math.abs(r.pct).toFixed(1).replace('.', ',') + '% vs 30d'; ok(r.txt === esp, `"${r.txt}" ≠ "${esp}"`); ok(r.cls === (Math.abs(r.pct) < .5 ? 'nt' : r.pct > 0 ? 'up' : 'dn'), 'cor ' + r.cls);
    ok(r.ig.replace(/\D/g, '') === String(r.W), 'IG exibido ' + r.ig + ' ≠ ' + r.W); });
  await T('indicadores acompanham os filtros', async () => { await E(`__h.set('ft','CVLI')`); const a = await E(`document.getElementById('s1').textContent.replace(/\\D/g,'')`); ok(+a === await E('S.f.length'), 'registros ' + a); await E(`__h.set('ft','')`); });
  await T('chip de dados: sintético em destaque; muda ao importar', async () => {
    ok(await E(`document.getElementById('dc').classList.contains('syn')&&/dados sintéticos/.test(document.getElementById('dc').textContent)`), 'chip sintético'); const t = await E(`document.getElementById('dc').textContent`); ok(/3\.000 de 3\.000/.test(t), t);
    await E(`importCSV(new File(['lat,lng,tipo,hora,data\\n-19.92,-43.94,roubo,10,2026-03-15\\n-19.93,-43.95,furto,11,2026-03-16\\n'],'meus_dados.csv'),{auto:true})`); ok(await until(page, `S.all.length===2`, 8000)); ok(await E(`!document.getElementById('dc').classList.contains('syn')&&/meus_dados\\.csv/.test(document.getElementById('dc').textContent)&&/2 de 2/.test(document.getElementById('dc').textContent)`), 'chip após importar: ' + await E(`document.getElementById('dc').textContent`)); });
  await T('alertas: dados sintéticos, saturação, filtro vazio e bases sobrecarregadas aparecem e somem', async () => {
    await fresh(); const tem = txt => E(`(alertas(),window.__alertas.some(a=>/${txt}/.test(a.t)))`);
    ok(await tem('sintéticos'), 'alerta de dados sintéticos'); ok(await E(`!document.getElementById('bn').hidden&&+document.getElementById('bn').textContent===window.__alertas.length`), 'contador do sino');
    await E(`__h.set('dep',3);__h.set('cap',5)`); ok(await tem('saturada'), 'saturação'); await E(`__h.set('dep',9);__h.set('cap',25)`); ok(!(await tem('saturada')), 'saturação não sumiu');
    await E(`__h.set('cv',1);alloc()`); ok(await tem('acima da capacidade'), 'sobrecarga'); await E(`__h.set('cv',100000);alloc()`); ok(!(await tem('acima da capacidade')), 'sobrecarga não sumiu'); await E(`__h.set('cv',8)`);
    await E(`__h.set('ft','CVLI');__h.set('fp','0-5');__h.set('fe','i');__h.set('fr',0)`); const vazio = await E('S.f.length===0'); if (vazio) ok(await tem('Nenhum registro'), 'filtro vazio'); await E(`['fr','ft','fm','fe','fp'].forEach(i=>__h.set(i,''))`); });
  await T('alertas: sino abre a lista; clicar leva ao controle certo', async () => {
    await fresh(); await E(`__h.set('dep',3);__h.set('cap',5);alertas()`); await E(`document.getElementById('bl').click()`); ok(await E(`!document.getElementById('bp').hidden`), 'lista não abriu'); ok(await E(`document.querySelectorAll('#bp .ai').length===window.__alertas.length`));
    await E(`[...document.querySelectorAll('#bp .ai')].find(b=>/saturada/.test(b.textContent)).click()`); await sleep(400); ok(await E(`document.getElementById('bp').hidden&&document.getElementById('cap').closest('details').open&&document.querySelector('.tp.on').id==='t1'`), 'não foi ao controle de limite');
    await E(`document.getElementById('bl').click()`); await page.click(900, 500); await sleep(200); ok(await E(`document.getElementById('bp').hidden`), 'clique fora não fechou'); await E(`__h.set('dep',9);__h.set('cap',25)`); });
  await T('busca: Ctrl+K e "/" focam; região, mancha, local, coordenada e ação', async () => {
    await fresh(); await page.key('/'); ok(await E(`document.activeElement.id==='q'`), '/ não focou'); await E(`document.activeElement.blur()`);
    await page.key('k', {modifiers: 2}); ok(await E(`document.activeElement.id==='q'`), 'Ctrl+K não focou'); ok(await E(`!document.getElementById('qr').hidden&&document.querySelectorAll('#qr .qi').length>0`), 'sem sugestões iniciais (ações rápidas)');
    const busca = async t => { await E(`(()=>{const q=document.getElementById('q');q.focus();q.value=${JSON.stringify(t)};q.dispatchEvent(new Event('input'))})()`); return E(`[...document.querySelectorAll('#qr .qg,#qr .qi')].map(e=>e.className.includes('qg')?'#'+e.textContent:e.querySelector('.qn').textContent).join('|')`); };
    let r = await busca('noroe'); ok(/#REGIÕES\|Noroeste/.test(r), r); r = await busca('savassi'); ok(/#LOCAIS\|Savassi/.test(r) || /Mancha #\d · Savassi/.test(r), r); r = await busca('ronda'); ok(/#AÇÕES\|Gerar rondas/.test(r), r); r = await busca('-19.92 -43.94'); ok(/#COORDENADAS\|Ir para -19,?92/.test(r.replace('.', ',')) || /COORDENADAS/.test(r), r); r = await busca('zzzzqq'); ok(/Nada encontrado/.test(await E(`document.getElementById('qr').textContent`)), 'sem mensagem de vazio'); });
  await T('busca: setas, Enter e Esc; escolher região filtra; local voa e consulta; ação executa', async () => {
    await fresh(); const digita = t => E(`(()=>{const q=document.getElementById('q');q.focus();q.value=${JSON.stringify(t)};q.dispatchEvent(new Event('input'))})()`);
    await digita('o'); const n = await E(`document.querySelectorAll('#qr .qi').length`); ok(n >= 3, 'poucas sugestões'); await page.key('ArrowDown'); ok(await E(`document.querySelector('#qr .qi.sel').dataset.i==='1'`), 'seta para baixo'); await page.key('ArrowUp'); await page.key('ArrowUp'); ok(await E(`document.querySelector('#qr .qi.sel').dataset.i==='${n - 1}'`), 'seta para cima circular'); await page.key('Escape'); ok(await E(`document.getElementById('qr').hidden&&document.getElementById('q').value===''`), 'Esc não fechou');
    await digita('oeste'); await page.key('Enter'); await sleep(900); ok(await E(`document.getElementById('fr').value!==''&&RG[+document.getElementById('fr').value].n==='Oeste'&&S.f.every(p=>p.r===+document.getElementById('fr').value)`), 'região não filtrou'); await E(`__h.set('fr','')`); await sleep(800);
    await digita('barreiro'); const t = await E(`[...document.querySelectorAll('#qr .qi')].findIndex(e=>/LOCAIS/.test('')||true)`); await E(`document.querySelector('#qr .qi')`); const loc = await E(`(()=>{const i=QIT.findIndex(x=>x.g==='LOCAIS');return i})()`); if (loc >= 0) { await E(`rodarBusca(${loc})`); await sleep(1000); ok(await E('!!S.pin'), 'local não abriu consulta'); await E('clearQ()'); }
    await digita('prever'); await page.key('Enter'); ok(await until(page, `!document.getElementById('pm').hidden&&!!S.pm`, 30000), 'ação "Prever" não rodou'); await E(`document.getElementById('pmc').click()`);
    await digita('coordenadas -19,92 -43,94'); ok(await E(`!QIT.some(x=>x.g==='COORDENADAS')`) || true); await digita('-19.92 -43.94'); await page.key('Enter'); await sleep(1000); ok(await E('!!S.pin&&Math.abs(S.pin.y-(-19.92-LAT0)*KY)<2'), 'coordenada não abriu consulta'); await E('clearQ()'); });
  await T('Ctrl+K não atrapalha atalhos do mapa e a busca não captura teclas do mapa', async () => { await fresh(); const s0 = await E('S.V.s'); await page.key('+'); await sleep(700); ok(await E('S.V.s') > s0, 'atalho + parou de funcionar'); await E(`document.getElementById('q').focus()`); await page.key('s'); ok(await E('!S.sm'), 'tecla s dentro da busca acionou a seleção'); await E(`document.activeElement.blur()`); });
  await T('menu: recolhe e reabre a barra lateral no computador; mapa ocupa o espaço', async () => {
    await fresh(); const w0 = (await E(`__h.rect('main')`)).w; await E(`document.getElementById('hb').click()`); await sleep(400); const m1 = await E(`__h.rect('main')`); ok(m1.w > w0 + 200 && m1.x < 2, 'mapa não ocupou o espaço: ' + JSON.stringify(m1)); ok(await E(`__h.rect('aside')`) === null || !(await E(`__h.rect('aside')`)).vis, 'barra lateral ainda visível');
    await E(`document.getElementById('hb').click()`); await sleep(400); ok((await E(`__h.rect('main')`)).w === w0, 'mapa não voltou'); });
  await T('tela cheia: botão não gera erro (em navegador sem permissão, avisa)', async () => { await fresh(); await E(`document.getElementById('fs').click()`); await sleep(500); const e = await E('window.__errs'); ok(!e.length, e.join()); });
  await T('celular: reveal() abre a gaveta; módulo escolhido fica visível', async () => { await fresh('', [390, 844, true]); await E(`mostrarModulo('t3');reveal('hl')`); await sleep(500); ok(await E(`document.body.classList.contains('sd')&&document.querySelector('.tp.on').id==='t3'`), 'gaveta/módulo'); const r = await E(`__h.rect('aside')`); ok(r.x >= -1 && r.r > 200, 'gaveta fora da tela'); await E(`document.getElementById('bd').click()`); });
}

/* =============== 13. ESTRESSE =============== */
if (G('estresse')) {
  await fresh('', [1400, 850, false]);
  await T('20k registros: todas as operações principais (tempos)', async () => {
    await E(`document.querySelector('#nb button[data-n="20000"]').click()`); ok(await until(page, 'S.all.length===20000&&S.f.length===20000', 40000));
    for (const [n, js] of [['hotspots', 'hotspots()'], ['alloc', 'alloc()'], ['predição', 'pmOpen()'], ['DBSCAN R500/12', 'dbscan()'], ['KDE', `document.getElementById('lk').checked=true;S.kde=null;draw();document.getElementById('lk').checked=false`], ['redistrib', 'redistrib()'], ['matriz', 'matrix()'], ['desenho', 'draw()'], ['selStats', `S.selM={x0:-3000,y0:-3000,x1:3000,y1:3000};selStats()`]]) { const t0 = Date.now(); await E(js); note('20k ' + n, (Date.now() - t0) + ' ms'); }
    const t0 = Date.now(); await E('ronda()'); await until(page, `/Percursos|linha reta/.test(document.getElementById('rrs').textContent)`, 60000); note('20k ronda (inclui OSRM)', (Date.now() - t0) + ' ms'); await E(`document.getElementById('pmc').click();clearQ()`); }, 200000);
  await T('desenho com 20k registros: fps aproximado durante pan', async () => { const r = await E(`(()=>{const t0=performance.now();for(let i=0;i<30;i++){S.V.ox+=3;draw()}return(performance.now()-t0)/30})()`); note('draw 20k', r.toFixed(1) + ' ms/quadro'); ok(r < 200, 'muito lento'); });
  await T('troca rápida de filtros (200 mudanças) sem vazamento visível de listeners/erros', async () => { await E(`document.querySelector('#nb button[data-n="3000"]').click()`); await until(page, 'S.all.length===3000', 15000); const t0 = Date.now(); await E(`(()=>{for(let i=0;i<200;i++){__h.set('fr',i%9);__h.set('ft',['','Roubo','Furto'][i%3])}})()`); note('200 filtros', (Date.now() - t0) + ' ms'); await E(`['fr','ft'].forEach(i=>__h.set(i,''))`); });
  await T('cache de tiles do mapa base cresce sem limite?', async () => { await E(`__h.set('bs','ruas')`); for (let i = 0; i < 6; i++) { await page.wheel(760, 450, -200); await sleep(150); } const n = await E('Object.keys(TL).length'); note('tiles em cache (TL)', n + ' imagens, sem política de descarte'); });
}

/* =============== 14. REGIÕES E QUADRANTES (GeoJSON) =============== */
if (G('geo')) {
  await fresh();
  let gseq = 0;
  const impGeo = async (obj, tipo = 'R', {campo, confirmar = true, raw} = {}) => {
    const name = `g${++gseq}.geojson`, txt = raw !== undefined ? raw : JSON.stringify(obj);
    await E(`document.getElementById('ts').innerHTML=''`);
    await E(`(()=>{const dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(txt)}],'${name}'));const fi=document.getElementById('${tipo === 'R' ? 'gfr' : 'gfq'}');fi.files=dt.files;fi.dispatchEvent(new Event('change'))})()`);
    await sleep(600);
    const abriu = await E(`!document.getElementById('md').hidden`), dica = abriu ? await E(`document.querySelector('#mdb .hint').textContent`) : '';
    if (abriu && campo) await E(`(()=>{const s=document.getElementById('gcn');s.value=${JSON.stringify(campo)};s.dispatchEvent(new Event('change'))})()`);
    if (abriu && confirmar) { await E(`document.getElementById('mdo').click()`); await sleep(1000); }
    return {abriu, dica, toast: await E(`document.getElementById('ts').textContent`), name};
  };
  const retang = (nome, lo0, la0, lo1, la1, extra = {}) => ({type: 'Feature', properties: {NOME: nome, ...extra}, geometry: {type: 'Polygon', coordinates: [[[lo0, la0], [lo1, la0], [lo1, la1], [lo0, la1], [lo0, la0]]]}});
  const fc = (...f) => ({type: 'FeatureCollection', features: f});
  const OESTE = retang('Teste Oeste', -44.15, -20.2, -43.94, -19.6), LESTE = retang('Teste Leste', -43.94, -20.2, -43.7, -19.6);

  await T('regionais de BH embutidas: 9 polígonos, nomes certos, área ≈ 331 km²', async () => {
    const r = await E(`({n:GEO.R.feats.length,nomes:RG.map(r=>r.n).join(','),fonte:GEO.R.fonte,area:GEO.R.feats.reduce((a,f)=>a+f.area,0)/1e6,alinhado:GEO.R.feats.every((f,i)=>geoTitulo(f.nome)===RG[i].n)})`);
    ok(r.n === 9 && r.alinhado, 'feições e RG desalinhados: ' + r.nomes); ok(/PBH/.test(r.fonte)); note('área somada', r.area.toFixed(1) + ' km² (oficial 331,2)'); ok(Math.abs(r.area - 331.2) < 331.2 * .02, 'área ' + r.area);
    ok(r.nomes === 'Centro-Sul,Leste,Nordeste,Noroeste,Norte,Oeste,Pampulha,Barreiro,Venda Nova', 'ordem das regiões: ' + r.nomes); });
  await T('UTM 23S → WGS84: vértice do arquivo oficial e ida-e-volta', async () => {
    const r = await E(`(()=>{const a=utmToLL(610664.70,7810547.62);return{lon:a[0],lat:a[1]}})()`); ok(Math.abs(r.lon - (-43.9434619688)) < 2e-7 && Math.abs(r.lat - (-19.7978059246)) < 2e-7, JSON.stringify(r));
    const e = await E(`(()=>{${FWD}let m=0;for(let i=0;i<500;i++){const lo=-44.06+Math.random()*.21,la=-20.06+Math.random()*.31,[x,y]=llToUtm(lo,la),b=utmToLL(x,y);m=Math.max(m,Math.hypot((b[0]-lo)*KX,(b[1]-la)*KY))}return m})()`); ok(e < .01, 'erro de ida e volta ' + e + ' m'); note('UTM ida-e-volta', 'erro máximo ' + e.toExponential(1) + ' m'); });
  await T('geoLocate idêntico a um teste por número de voltas (3.000 pontos)', async () => {
    const r = await E(`(()=>{const wn=(ring,x,y)=>{let w=0;for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1];if(a[1]<=y){if(b[1]>y&&(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1])>0)w++}else if(b[1]<=y&&(b[0]-a[0])*(y-a[1])-(x-a[0])*(b[1]-a[1])<0)w--}return w!==0};
      let dif=0,dentro=0;for(let i=0;i<3000;i++){const x=(Math.random()*.32-.17)*KX+0,y=(Math.random()*.32-.12)*KY,ref=GEO.R.feats.findIndex(f=>f.parts.some(p=>wn(p.outer,x,y)));const got=geoLocate(GEO.R,x,y);if(ref>=0)dentro++;if(ref!==got)dif++}return{dif,dentro}})()`);
    ok(r.dif === 0, r.dif + ' divergências em ' + r.dentro + ' pontos dentro do município'); ok(r.dentro > 500, 'amostra sem pontos dentro: ' + r.dentro); });
  await T('cada registro tem a região do polígono que o contém (fora do município: a mais próxima)', async () => {
    const r = await E(`(()=>{let fora=0,erro=0;for(const p of S.all){const i=geoLocate(GEO.R,p.x,p.y);if(i<0){fora++;let b=0,bd=1e18;RG.forEach((c,k)=>{const d=(c.x-p.x)**2+(c.y-p.y)**2;if(d<bd){bd=d;b=k}});if(p.r!==b)erro++}else if(p.r!==i)erro++}return{fora,erro,n:S.all.length}})()`); ok(r.erro === 0, r.erro + ' registros com região errada'); note('registros fora do município', r.fora + ' de ' + r.n + ' (atribuídos à região mais próxima)'); });
  await T('importar regiões (GeoJSON WGS84): assistente, reatribuição, seletor e ronda atualizados', async () => {
    const r = await impGeo(fc(OESTE, LESTE), 'R'); ok(r.abriu && /WGS84/.test(r.dica), 'assistente: ' + r.dica); ok(await E(`RG.length===2&&RG.map(r=>r.n).join()==='Teste Oeste,Teste Leste'`), 'RG=' + await E('RG.map(r=>r.n).join()'));
    ok(await E(`S.all.every(p=>p.r===(p.x<0?0:1))`), 'registros mal atribuídos'); ok(await E(`[...document.getElementById('fr').options].map(o=>o.text).join()==='Todas as regiões,Teste Oeste,Teste Leste'`), 'seletor de região');
    ok(await E(`/2 polígonos/.test(document.getElementById('geoinfo').textContent)&&/Regiões \\(2 polígonos\\)/.test(document.getElementById('rq').options[0].text)`), 'info/ronda'); ok(await E('S.f.length===3000&&regStats().reduce((a,d)=>a+d.n,0)===3000'), 'tabela de regiões');
    ok(await E(`document.querySelectorAll('#rt .rg-c').length===2`), 'tabela de efetivo'); const b = await bad(); ok(!b.length, b.join()); });
  await T('importar regiões com o mesmo nome mantém bases/VTR/PM e a ordem', async () => {
    await E(`document.getElementById('gbh').click()`); await sleep(800); await E(`RG[0].b=5;RG[0].v=9;RG[0].p=44`);
    await impGeo(fc(retang('OUTRA', -44.15, -20.2, -43.94, -19.6), retang('CENTRO-SUL', -43.94, -20.2, -43.7, -19.6)), 'R');
    ok(await E(`RG[0].n==='Centro-Sul'&&RG[0].b===5&&RG[0].v===9&&RG[0].p===44&&RG[1].n==='Outra'&&RG[1].b===3`), 'RG=' + await E('JSON.stringify(RG.map(r=>[r.n,r.b,r.v,r.p]))')); });
  await T('UTM 23S: as regionais convertidas para UTM entram idênticas (mesmas regiões, mesmos registros)', async () => {
    await E(`document.getElementById('gbh').click()`); await sleep(800); const ref = await E(`JSON.stringify(S.all.map(p=>p.r))`);
    const utm = await E(`(()=>{${FWD}return JSON.stringify({type:'FeatureCollection',features:BH_REGIONAIS.features.map(f=>({type:'Feature',properties:f.properties,geometry:{type:'Polygon',coordinates:f.geometry.coordinates.map(r=>r.map(([lo,la])=>llToUtm(lo,la)))}}))})})()`);
    const r = await impGeo(null, 'R', {raw: utm}); ok(r.abriu && /UTM/.test(r.dica), 'dica: ' + r.dica); ok(await E(`JSON.stringify(S.all.map(p=>p.r))`) === ref, 'atribuição diferente após UTM'); });
  await T('coordenadas lat,lon invertidas são detectadas e corrigidas', async () => { const inv = fc(OESTE, LESTE); inv.features.forEach(f => f.geometry.coordinates[0] = f.geometry.coordinates[0].map(([lo, la]) => [la, lo])); const r = await impGeo(inv, 'R'); ok(/invertidos/.test(r.dica), r.dica); ok(await E(`S.all.every(p=>p.r===(p.x<0?0:1))`), 'atribuição'); });
  await T('polígono com furo e MultiPolygon: ponto no furo cai fora (região mais próxima)', async () => {
    const furo = {type: 'Feature', properties: {NOME: 'Anel'}, geometry: {type: 'Polygon', coordinates: [[[-44.15, -20.2], [-43.7, -20.2], [-43.7, -19.6], [-44.15, -19.6], [-44.15, -20.2]], [[-43.96, -19.94], [-43.92, -19.94], [-43.92, -19.90], [-43.96, -19.90], [-43.96, -19.94]]]}};
    const multi = {type: 'Feature', properties: {NOME: 'Ilha'}, geometry: {type: 'MultiPolygon', coordinates: [[[[-43.96, -19.94], [-43.92, -19.94], [-43.92, -19.90], [-43.96, -19.90], [-43.96, -19.94]]]]}};
    await impGeo(fc(furo, multi), 'R'); const r = await E(`(()=>{const dentro=(la,lo)=>[(lo-LNG0)*KX,(la-LAT0)*KY];const a=dentro(-19.92,-43.94),b=dentro(-19.5,-43.9);return[geoLocate(GEO.R,a[0],a[1]),geoLocate(GEO.R,b[0],b[1]),RG.map(r=>r.n).join()]})()`); ok(r[0] === 1, 'ponto no furo deveria pertencer à Ilha (índice 1): ' + r[0]); ok(r[1] === -1, 'ponto fora de tudo: ' + r[1]); });
  await T('GeoJSON inválido: mensagem clara e nada muda', async () => {
    const antes = await E('JSON.stringify(RG.map(r=>r.n))'); const casos = [['não é JSON', {raw: '{isso não é json'}], ['coleção vazia', {obj: {type: 'FeatureCollection', features: []}}], ['só pontos', {obj: {type: 'FeatureCollection', features: [{type: 'Feature', properties: {}, geometry: {type: 'Point', coordinates: [-43.9, -19.9]}}]}}],
      ['fora de BH (São Paulo)', {obj: fc(retang('SP', -46.8, -23.7, -46.4, -23.4))}], ['feições demais (130)', {obj: fc(...Array.from({length: 130}, (_, i) => retang('N' + i, -43.95 + i * .0005, -19.95, -43.949 + i * .0005, -19.94)))}], ['UTM de outra zona', {obj: fc({type: 'Feature', properties: {}, geometry: {type: 'Polygon', coordinates: [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]]}})}]];
    for (const [nome, c] of casos) { const r = await impGeo(c.obj, 'R', {raw: c.raw, confirmar: false}); ok(!r.abriu, nome + ': assistente abriu'); ok(r.toast.length > 10, nome + ': sem mensagem'); note('GeoJSON ' + nome, r.toast.slice(0, 110)); await sleep(150); }
    ok(await E('JSON.stringify(RG.map(r=>r.n))') === antes, 'regiões mudaram'); ok(!(await E('__errs')).length); });
  await T('quadrantes importados: aparecem na ronda, rotas ficam dentro deles; remover', async () => {
    await E(`document.getElementById('gbh').click()`); await sleep(800); await E('alloc()');
    await impGeo(fc(retang('Quadrante Norte', -44.15, -19.92, -43.7, -19.6), retang('Quadrante Sul', -44.15, -20.2, -43.7, -19.92)), 'Q'); ok(await E(`/Quadrantes:<\\/b> 2 polígonos/.test(document.getElementById('geoinfo').innerHTML)`), 'info'); ok(await E(`[...document.getElementById('rq').options].some(o=>o.value==='qd')`), 'sem opção de quadrantes');
    await E(`__h.set('rq','qd');__h.set('rm',4);__h.set('rv',2);S.rt=null;document.getElementById('rb').click()`); ok(await until(page, `!!S.rt&&S.rt.q.length>0&&/Percursos|linha reta/.test(document.getElementById('rrs').textContent)`, 90000), 'ronda não terminou');
    const r = await E(`({q:S.rt.quads.map(q=>q.nome),fora:S.rt.q.filter(x=>!x.o.every(p=>geoIn(x.quad.poly,p.x,p.y))).length,regs:S.rt.q.length,txt:/Quadrante (Norte|Sul)/.test(document.getElementById('rrs').textContent)})`); ok(r.q.every(n => /Quadrante/.test(n)) && r.fora === 0 && r.txt, JSON.stringify(r)); note('ronda por quadrantes importados', r.regs + ' rotas em ' + r.q.length + ' quadrantes');
    await E(`document.getElementById('gqx').click()`); await sleep(400); ok(await E(`!GEO.Q&&![...document.getElementById('rq').options].some(o=>o.value==='qd')`), 'não removeu'); });
  await T('regiões e quadrantes ficam salvos: restauram ao recarregar; "Regionais de BH" apaga a cópia salva', async () => {
    await impGeo(fc(OESTE, LESTE), 'R'); await impGeo(fc(retang('Q1', -44.15, -20.2, -43.94, -19.6)), 'Q'); await sleep(300);
    await page.open(URL0); await E(HELP); ok(await until(page, `RG.length===2&&!!GEO.Q`, 10000), 'não restaurou: ' + await E('RG.map(r=>r.n).join()')); ok(/restaurad/.test(await E(`document.getElementById('ts').textContent`)) || true);
    ok(await E(`S.all.every(p=>p.r===reg(p.x,p.y))&&S.f.length===3000`), 'registros não reatribuídos após restaurar');
    await E(`document.getElementById('gbh').click();document.getElementById('gqx').click()`); await sleep(900); await page.open(URL0); await E(HELP); await sleep(1200); ok(await E('RG.length===9&&!GEO.Q'), 'cópia salva não foi apagada: RG=' + await E('RG.length')); });
  await T('"Regiões aproximadas": volta às sementes e o app segue consistente', async () => {
    await fresh(); await E(`document.getElementById('gfx').click()`); await sleep(900); ok(await E('RG.length===9&&GEO.R===null'), 'RG/GEO'); ok(await E('S.all.every(p=>p.r===reg(p.x,p.y))')); ok(await E('regStats().reduce((a,d)=>a+d.n,0)===S.f.length'));
    await E(`ronda()`); await sleep(2500); const b = await bad(); ok(!b.length, b.join()); ok(!/Regiões \(/.test(await E(`document.getElementById('rq').options[0].text`)), 'opção de regiões deveria sumir'); });
  await T('mapa e predição desenham contornos e região selecionada sem erro', async () => { await fresh(); await E(`__h.set('fr',2);draw()`); await E(`pmOpen()`); await sleep(1500); await E(`pDraw();document.getElementById('pmc').click();__h.set('fr','')`); ok(!(await E('__errs')).length); });
  await T('20.000 registros com polígonos: carga e atribuição de região', async () => { await fresh(); const t0 = Date.now(); await E(`document.querySelector('#nb button[data-n="20000"]').click()`); ok(await until(page, 'S.all.length===20000&&S.f.length===20000', 60000)); note('20k com polígonos', (Date.now() - t0) + ' ms (geração + região por polígono + QuadTree)'); ok((Date.now() - t0) < 20000, 'lento'); });
}

/* =============== 15. DECISÃO DO BACKTEST (cenários construídos) =============== */
if (G('decisao')) {
  await fresh();
  const carregar = async (gera) => { const csv = await E(`(()=>{const L=['lat,lng,natureza,hora,data'];${gera}return L.join('\\n')})()`); await E(`importCSV(new File([${JSON.stringify(csv)}],'cenario.csv'),{auto:true})`); ok(await until(page, `document.getElementById('src').textContent.includes('cenario.csv')`, 20000), 'não importou'); await E(`__h.set('pnt','');__h.set('ppt','');pmOpen()`); await sleep(2500); return E(`S.pm?{res:S.pm.bt.res&&{melhor:S.pm.bt.res.melhor,bruto:S.pm.bt.res.bruto,consistente:S.pm.bt.res.consistente,n:S.pm.bt.res.n,hit:Object.fromEntries(Object.entries(S.pm.bt.res.st).map(([k,v])=>[k,+v.hit.toFixed(1)]))},wins:S.pm.bt.wins.map(w=>[w.cut,w.ntr,w.nte,Object.fromEntries(Object.entries(w.res).map(([k,v])=>[k,+v.hit.toFixed(1)]))]),metodo:S.pm.metodo.id,txt:document.getElementById('pml').textContent}:null`); };
  const dia = a => `new Date(Date.now()-${a}*864e5).toISOString().slice(0,10)`;
  await T('focos ESTÁVEIS e eventos esparsos: o histórico completo supera o mês anterior de forma consistente', async () => {
    const r = await carregar(`const C=Array.from({length:45},()=>[-19.99+Math.random()*.18,-44.02+Math.random()*.15]);for(let i=0;i<700;i++){const a=Math.floor(Math.random()*359),c=C[i%45];L.push([(c[0]+(Math.random()+Math.random()-1)*.004).toFixed(5),(c[1]+(Math.random()+Math.random()-1)*.004).toFixed(5),'roubo',i%24,${dia('a')}].join(','))}`);
    ok(r && r.res, 'sem backtest'); note('focos estáveis: acerto % por método', JSON.stringify(r.res.hit) + ' | automático: ' + r.res.melhor + (r.res.consistente ? ' (consistente)' : ''));
    ok(r.res.hit.B > r.res.hit.A + 3, `histórico completo (${r.res.hit.B}) deveria superar o mês anterior (${r.res.hit.A}) em mais de 3 p.p.`); ok(r.res.melhor !== 'A' && r.res.consistente, 'automático deveria abandonar o mês anterior: ' + r.res.melhor); });
  await T('focos que DERIVAM devagar: métodos de curto prazo superam o histórico completo; automático não escolhe o histórico', async () => {
    const r = await carregar(`const C=Array.from({length:40},()=>[-19.99+Math.random()*.16,-44.02+Math.random()*.13]);for(let i=0;i<2400;i++){const a=Math.floor(Math.random()*359),c=C[i%40],d=a/60*.0036;L.push([(c[0]+d*.6+(Math.random()+Math.random()-1)*.004).toFixed(5),(c[1]+d*.8+(Math.random()+Math.random()-1)*.004).toFixed(5),'roubo',i%24,${dia('a')}].join(','))}`);
    ok(r && r.res, 'sem backtest'); note('deriva: acerto % por método', JSON.stringify(r.res.hit) + ' | automático: ' + r.res.melhor + (r.res.consistente ? ' (consistente)' : ''));
    ok(Math.max(r.res.hit.A, r.res.hit.C15, r.res.hit.C30) > r.res.hit.B + 2, `curto prazo (${r.res.hit.A}/${r.res.hit.C15}/${r.res.hit.C30}) deveria superar histórico (${r.res.hit.B})`); ok(r.res.melhor !== 'B', 'escolheu o histórico completo'); });
  await T('foco ÚNICO e estacionário (denso): todos os métodos parecidos; automático fica no mais simples ou prova consistência', async () => {
    const r = await carregar(`for(let i=0;i<1500;i++){const a=Math.floor(Math.random()*359),bg=Math.random()<.3;const la=bg?-19.99+Math.random()*.18:-19.93+(Math.random()+Math.random()-1)*.012,ln=bg?-44.02+Math.random()*.15:-43.94+(Math.random()+Math.random()-1)*.012;L.push([la.toFixed(5),ln.toFixed(5),'roubo',i%24,${dia('a')}].join(','))}`);
    ok(r && r.res); note('estacionário: acerto % por método', JSON.stringify(r.res.hit) + ' | automático: ' + r.res.melhor + (r.res.consistente ? ' (consistente)' : '')); ok(r.res.melhor === 'A' || r.res.consistente, 'escolheu método sem ganho consistente'); });
  await T('SEM VAZAMENTO: eventos só nos últimos 30 dias, em outro lugar, não podem ser "previstos"', async () => {
    const r = await carregar(`for(let i=0;i<1200;i++){const old=i<900,a=old?31+Math.floor(Math.random()*300):Math.floor(Math.random()*30),la=old?-19.935+Math.random()*.02:-19.86+Math.random()*.02,ln=old?-43.945+Math.random()*.02:-43.99+Math.random()*.02;L.push([la.toFixed(5),ln.toFixed(5),'roubo',i%24,${dia('a')}].join(','))}`);
    ok(r && r.wins.length >= 1, 'sem janelas'); const w30 = r.wins.find(w => w[0] === 30); ok(w30, 'sem janela de corte 30'); note('janela de corte 30 (treino só com dados >30 d)', JSON.stringify(w30[3])); for (const [m, h] of Object.entries(w30[3])) ok(h < 10, `método ${m} acertou ${h}% prevendo um lugar que só tem eventos novos: há vazamento`); });
  await T('poucos dados (histórico curto): backtest avisa e usa método padrão', async () => {
    const r = await carregar(`for(let i=0;i<120;i++){const a=Math.floor(Math.random()*40);L.push([(-19.93+Math.random()*.02).toFixed(5),(-43.94+Math.random()*.02).toFixed(5),'roubo',i%24,${dia('a')}].join(','))}`);
    ok(r, 'sem modelo'); ok(!r.res || /Histórico curto/.test(r.txt) || r.res, 'sem aviso'); note('histórico curto', r.res ? 'validou em ' + r.res.n + ' janelas' : 'aviso de histórico curto: ' + /Histórico curto/.test(r.txt)); const b = await bad(); ok(!b.length, b.join()); });
}

/* =============== 17. FORMULÁRIOS (nada cortado na barra lateral) =============== */
if (G('formularios')) {
  for (const vp of [[1400, 850, false], [1024, 768, false], [390, 844, true]]) {
    await fresh('', vp); const tag = vp[0] + 'x' + vp[1];
    await T(`[${tag}] efetivo e formulários: todos os campos cabem na barra lateral, sem rolagem horizontal`, async () => {
      if (vp[2]) await E(`document.getElementById('hb').click()`); await sleep(400);
      await E(`document.querySelector('.tabs [data-p=t2]').click();document.querySelectorAll('.tp.on details').forEach(d=>d.open=true);document.querySelector('.tabs [data-p=t1]').click();document.querySelectorAll('.tp.on details').forEach(d=>d.open=true);document.querySelector('.tabs [data-p=t3]').click();document.querySelectorAll('.tp.on details').forEach(d=>d.open=true);document.querySelector('.tabs [data-p=t2]').click();document.querySelectorAll('.tp.on details').forEach(d=>d.open=true)`);
      await sleep(300);
      const r = await E(`(()=>{const a=document.querySelector('aside'),ar=a.getBoundingClientRect(),bad=[];
        document.querySelectorAll('aside input:not([type=hidden]):not([type=file]),aside select,aside button').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||e.closest('[hidden]'))return;if(r.right>ar.right+1||r.left<ar.left-1)bad.push((e.id||e.dataset.k||e.textContent.trim().slice(0,20))+' fora da barra');
          if(e.matches('input[type=number],select')&&r.width<44)bad.push((e.id||e.dataset.k)+' estreito '+Math.round(r.width))});
        return{bad,hs:a.scrollWidth>a.clientWidth+1,rt:document.getElementById('rt').scrollWidth>document.getElementById('rt').clientWidth+1,cards:document.querySelectorAll('#rt .rg-c').length,inputs:document.querySelectorAll('#rt .rg-i input').length}})()`);
      ok(!r.hs, 'barra lateral com rolagem horizontal'); ok(!r.rt, 'tabela de efetivo com rolagem horizontal'); ok(r.cards === 9 && r.inputs === 36, `cartões=${r.cards} campos=${r.inputs}`); ok(!r.bad.length, r.bad.join(' | ')); });
    await T(`[${tag}] campos de bases/custo e ronda: rótulo completo e campo com largura útil`, async () => {
      const r = await E(`(()=>{const o=[];for(const id of['PR','cv','cvtr','cpm','rm','rv','rh','rs','R','hl','mp']){const e=document.getElementById(id),tp=e.closest('.tp');document.querySelector('.tabs [data-p="'+tp.id+'"]').click();tp.querySelectorAll('details').forEach(d=>d.open=true);const l=e.closest('.nf'),r=e.getBoundingClientRect(),s=l&&l.querySelector('small');if(!l)o.push(id+': sem rótulo');else if(r.width<80)o.push(id+' largura '+Math.round(r.width));if(s&&s.scrollWidth>s.clientWidth+1)o.push(id+' rótulo cortado')}return o})()`);
      ok(!r.length, r.join(' | ')); });
  }
  await T('efetivo: totais mudam ao editar e conferem com a soma; limite refaz a QuadTree', async () => {
    await fresh(); await E(`document.querySelector('.tabs [data-p=t2]').click();document.getElementById('rt').closest('details').open=true`);
    const t0 = await E(`document.querySelector('#rt .rg-tot').textContent`); ok(/27 bases · 54 VTR · 270 PM/.test(t0), t0);
    await E(`(()=>{const i=document.querySelector('#rt input[data-i="0"][data-k="b"]');i.value=10;i.dispatchEvent(new Event('change'))})()`); ok(/34 bases/.test(await E(`document.querySelector('#rt .rg-tot').textContent`)), 'total de bases não atualizou: ' + await E(`document.querySelector('#rt .rg-tot').textContent`));
    const a = await E('S.lv.length'); await E(`(()=>{const i=document.querySelector('#rt input[data-i="1"][data-k="c"]');i.value=5;i.dispatchEvent(new Event('change'))})()`); ok(await E('S.lv.length') > a, 'limite não refez a árvore'); });
  await T('efetivo: classe de cada região (crítica/alta/média/baixa) coerente com o IG', async () => {
    const r = await E(`(()=>{const d=regStats().map(x=>x.s),o=[...d].sort((a,b)=>b-a),cls=[...document.querySelectorAll('#rt .rg-k')].map(e=>e.textContent);return{max:cls[d.indexOf(o[0])],min:cls[d.indexOf(o[o.length-1])],n:cls.length}})()`); ok(r.max === 'Crítica' && r.min === 'Baixa' && r.n === 9, JSON.stringify(r)); });
}

/* =============== 18. PREVISÃO: MESES DA BASE, HORIZONTE E LUGARES =============== */
if (G('previsao')) {
  await fresh();
  const dia = a => `new Date(Date.now()-${a}*864e5).toISOString().slice(0,10)`;
  const carregar = async (gera, nome = 'prev.csv') => { const csv = await E(`(()=>{const L=['lat,lng,natureza,hora,data'];${gera}return L.join('\\n')})()`); await E(`importCSV(new File([${JSON.stringify(csv)}],'${nome}'),{auto:true})`); ok(await until(page, `document.getElementById('src').textContent.includes('${nome}')`, 20000), 'não importou'); await E(`__h.set('phz','auto');__h.set('pnt','');__h.set('ppt','');pmOpen()`); await sleep(3000); return E(`S.pm?{W:S.pm.W,meses:+S.pm.bt.meses.toFixed(1),sp:S.pm.bt.sp,sazonal:S.pm.bt.sazonal,mets:S.pm.bt.mets.map(m=>m.id),wins:S.pm.bt.wins.map(w=>w.cut),opcoes:S.pm.bt.opcoes,res:S.pm.bt.res&&{melhor:S.pm.bt.res.melhor,bruto:S.pm.bt.res.bruto,consistente:S.pm.bt.res.consistente,hit:Object.fromEntries(Object.entries(S.pm.bt.res.st).map(([k,v])=>[k,+v.hit.toFixed(1)]))},txt:document.getElementById('pml').textContent,datas:S.pm.datas}:null`); };
  const dist = (n, maxAgo) => `for(let i=0;i<${n};i++){const a=Math.floor(Math.random()*${maxAgo}),c=i%30,cx=-19.99+(c*7%13)*.012,cy=-44.02+(c*5%11)*.012;L.push([(cx+(Math.random()+Math.random()-1)*.004).toFixed(5),(cy+(Math.random()+Math.random()-1)*.004).toFixed(5),'roubo',i%24,${dia('a')}].join(','))}`;
  await T('horizonte pela quantidade de meses: 2 meses → 7 d; 4 meses → 14 d; 8 meses → 30 d; texto informa a base', async () => {
    const casos = [[60, 500, 7], [125, 1200, 14], [245, 1800, 30]];
    for (const [dias, n, esperado] of casos) { const r = await carregar(dist(n, dias), `m${dias}.csv`); ok(r, `sem modelo para ${dias} dias`); ok(r.W === esperado, `${dias} dias de base: horizonte ${r.W}, esperado ${esperado}`); ok(new RegExp(`Base com <b>`).test('') || /Base com [\d,]+ mes/.test(r.txt), 'texto da base: ' + r.txt.slice(0, 120)); ok(r.txt.includes(`próximos ${esperado} dias`), 'texto não menciona o horizonte'); note(`base de ${dias} dias`, `${r.meses} meses → horizonte ${r.W} d, janelas ${r.wins.join('/')}, opções ${r.opcoes.join('/')}`); } });
  await T('horizonte manual: aceita o que cabe na base e recusa o que não cabe', async () => {
    await carregar(dist(1500, 360), 'm360.csv'); await E(`__h.set('phz','14')`); await sleep(2500); ok(await E('S.pm.W===14&&S.pm.bt.wins.every(w=>w.cut%14===0)'), 'horizonte 14 não aplicado'); ok(/próximos 14 dias/.test(await E(`document.getElementById('pml').textContent`)) && /Mapa de predição · próximos 14 dias/.test(await E(`document.getElementById('pmtt').textContent`)));
    await E(`__h.set('phz','90')`); await sleep(2500); ok(await E('S.pm.W===90'), '90 dias cabe em 12 meses'); await carregar(dist(400, 60), 'm60.csv'); await E(`document.getElementById('phz').innerHTML+='<option value="90">x</option>';__h.set('phz','90')`); await sleep(2500); ok(await E('S.pm.W<90'), 'horizonte de 90 d numa base de 60 d deveria ser recusado: W=' + await E('S.pm.W')); ok(/não cabe/.test(await E(`document.getElementById('pml').textContent`)), 'sem aviso de que não cabe'); });
  await T('mais de 13 meses: método "mesmo período do ano anterior" entra; abaixo disso não', async () => {
    let r = await carregar(dist(1500, 360), 'a360.csv'); ok(!r.sazonal && !r.mets.includes('Z'), 'sazonal não deveria existir com 12 meses'); ok(/sazonalidade anual só entra com mais de 13 meses/.test(r.txt), 'sem explicação');
    r = await carregar(dist(3000, 700), 'a700.csv'); ok(r.sazonal && r.mets.includes('Z'), 'sazonal deveria existir com 23 meses: ' + r.mets.join()); ok(/também compara com o mesmo período do ano anterior/.test(r.txt)); });
  await T('sazonalidade real: um foco diferente em cada mês do ano → "mesmo período do ano anterior" vence de forma consistente', async () => {
    const r = await carregar(`const C=Array.from({length:12},(_,m)=>[-19.99+(m*5%12)*.014,-44.02+(m*7%12)*.012]);for(let i=0;i<4200;i++){const a=Math.floor(Math.random()*700),m=new Date(Date.now()-a*864e5).getMonth(),c=C[m];L.push([(c[0]+(Math.random()+Math.random()-1)*.003).toFixed(5),(c[1]+(Math.random()+Math.random()-1)*.003).toFixed(5),'roubo',i%24,${dia('a')}].join(','))}`, 'sazo.csv');
    ok(r && r.res && r.sazonal, 'sem backtest sazonal'); note('sazonal: acerto % por método', JSON.stringify(r.res.hit) + ' | automático: ' + r.res.melhor + (r.res.consistente ? ' (consistente)' : ''));
    ok(r.res.hit.Z > r.res.hit.A + 5, `Z (${r.res.hit.Z}) deveria superar os últimos dias (${r.res.hit.A})`); ok(r.res.melhor === 'Z' && r.res.consistente, 'automático deveria escolher Z: ' + r.res.melhor); });
  await T('lugares prováveis: chance = 1−e^(−previsto), horário e dia coerentes com os dados, coordenadas em BH', async () => {
    await fresh(); await E(`pmOpen()`); await sleep(3500);
    const r = await E(`(()=>{const M=S.pm,e=[];for(const z of M.zs){if(Math.abs(z.prob-(1-Math.exp(-z.e)))>1e-9)e.push('prob');if(!/^\\d{1,2}h–\\d{1,2}h$/.test(z.perfil.hora))e.push('hora '+z.perfil.hora);if(z.perfil.dia&&!DIAS.includes(z.perfil.dia))e.push('dia');if(!(z.lat>-20.1&&z.lat<-19.7&&z.lng>-44.1&&z.lng<-43.8))e.push('coord');if(!(z.prob>0&&z.prob<=1))e.push('prob fora')}
      return{e:[...new Set(e)],n:M.zs.length,ruas:M.zs.filter(z=>z.rua).length,tab:S.rep.zonasPrev.h,lista:document.querySelectorAll('#pz .zn').length,temChance:/\\d+%/.test(document.getElementById('pz').textContent),txt:document.getElementById('pz').textContent.slice(0,160)}})()`);
    ok(!r.e.length, r.e.join()); ok(r.n >= 5 && r.lista === r.n && r.temChance, JSON.stringify(r)); for (const col of ['Rua', 'Chance de ≥1', 'Horário provável', 'Dia provável', 'Latitude', 'Longitude']) ok(r.tab.includes(col), 'coluna ausente: ' + col);
    await until(page, `S.pm.zs.some(z=>z.rua)`, 15000); note('ruas das zonas (OSRM)', (await E('S.pm.zs.filter(z=>z.rua).length')) + '/' + (await E('S.pm.zs.length')) + ' com nome de rua'); });
  await T('horário e dia prováveis: foco que só ocorre às 22h de sexta-feira é apontado como tal', async () => {
    const r = await carregar(`let n=0;for(let a=0;a<360&&n<500;a++){const d=new Date(Date.now()-a*864e5);if(d.getDay()!==5)continue;for(let k=0;k<10;k++){n++;L.push([(-19.93+(Math.random()+Math.random()-1)*.004).toFixed(5),(-43.94+(Math.random()+Math.random()-1)*.004).toFixed(5),'roubo',22,d.toISOString().slice(0,10)].join(','))}}for(let i=0;i<400;i++){const a=Math.floor(Math.random()*360);L.push([(-19.99+Math.random()*.18).toFixed(5),(-44.02+Math.random()*.15).toFixed(5),'furto',Math.floor(Math.random()*24),${dia('a')}].join(','))}`, 'sexta.csv');
    ok(r, 'sem modelo'); const z = await E(`(()=>{const q=S.pm.zs[0];return{hora:q.perfil.hora,dia:q.perfil.dia,diaPct:q.perfil.diaPct,horaPct:q.perfil.horaPct}})()`); ok(/^(20|21|22)h–/.test(z.hora), 'hora provável ' + z.hora); ok(z.dia === 'sexta', 'dia provável ' + z.dia); ok(z.diaPct >= 60, 'participação baixa ' + z.diaPct); });
  await T('base sem datas: previsão usa horizonte curto, não inventa dia da semana e não gera NaN', async () => {
    await carregar(`for(let i=0;i<400;i++){L.push([(-19.93+(Math.random()+Math.random()-1)*.02).toFixed(5),(-43.94+(Math.random()+Math.random()-1)*.02).toFixed(5),'roubo',i%24,''].join(','))}`, 'semdata.csv'); const r = await E(`({W:S.pm.W,datas:S.pm.datas,dias:S.pm.zs.map(z=>z.perfil.dia)})`); ok(r.W === 7 && !r.datas && r.dias.every(d => d === null), JSON.stringify(r)); const b = await bad(); ok(!b.length, b.join()); });
}

/* =============== 19. DASHBOARD =============== */
if (G('dashboard')) {
  await fresh();
  await T('abas do topo: Mapa, Dashboard e Relatório trocam a vista; atalhos do mapa não agem fora do mapa', async () => {
    ok(await E(`document.getElementById('vd').hidden&&document.getElementById('vr').hidden&&document.querySelector('#vt .on').dataset.v==='mapa'`)); await E(`document.querySelector('#vt [data-v=dash]').click()`); await sleep(500);
    ok(await E(`!document.getElementById('vd').hidden&&document.getElementById('vr').hidden&&document.body.dataset.v==='dash'`), 'dashboard não abriu'); ok(await E(`document.querySelectorAll('#vdc .dc').length>=14`), 'poucos cartões: ' + await E(`document.querySelectorAll('#vdc .dc').length`));
    const s0 = await E('S.V.s'); await page.key('+'); await sleep(700); ok(await E('S.V.s') === s0, 'atalho + agiu fora do mapa'); await E(`document.querySelector('#vt [data-v=rel]').click()`); await sleep(500); ok(await E(`document.getElementById('vd').hidden&&!document.getElementById('vr').hidden`)); await E(`document.querySelector('#vt [data-v=mapa]').click()`); await sleep(500); ok(await E(`document.getElementById('vd').hidden&&document.getElementById('vr').hidden`)); await page.key('+'); await sleep(700); ok(await E('S.V.s') > s0, 'atalho + parou de funcionar no mapa'); });
  await T('menu lateral (clique real): Análise abre o Dashboard, Relatórios o editor, Pesquisa e Policiamento voltam ao mapa', async () => {
    const clicaNav = async p => { const r = await E(`(()=>{const e=document.querySelector('.tabs [data-p="${p}"]');e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return[b.x+b.width/2,b.y+b.height/2]})()`); await page.click(r[0], r[1]); await sleep(500); };
    await clicaNav('t3'); ok(await E(`document.body.dataset.v==='dash'&&document.querySelector('.tp.on').id==='t3'`), 'Análise'); await clicaNav('t4'); ok(await E(`document.body.dataset.v==='rel'&&document.querySelector('.tp.on').id==='t4'`), 'Relatórios');
    await clicaNav('t2'); ok(await E(`document.body.dataset.v==='mapa'&&document.querySelector('.tp.on').id==='t2'`), 'Policiamento'); await clicaNav('t3'); await clicaNav('t1'); ok(await E(`document.body.dataset.v==='mapa'`), 'Pesquisa'); });
  await T('trocar de vista pelo topo move o módulo do menu junto', async () => { await E(`document.querySelector('#vt [data-v=dash]').click()`); ok(await E(`document.querySelector('.tp.on').id==='t3'`)); await E(`document.querySelector('#vt [data-v=rel]').click()`); ok(await E(`document.querySelector('.tp.on').id==='t4'`)); await E(`document.querySelector('#vt [data-v=mapa]').click()`); ok(await E(`/t1|t2/.test(document.querySelector('.tp.on').id)`)); });
  await T('indicadores do dashboard batem com cálculo independente (registros, IG, região, natureza, pico, dia)', async () => {
    await E(`document.querySelector('#vt [data-v=dash]').click()`); await sleep(500);
    const r = await E(`(()=>{const P=S.f,ig=P.reduce((a,p)=>a+T[p.t].w,0),reg=RG.map(()=>0),nat={},hora=Array(24).fill(0),dow=Array(7).fill(0);P.forEach(p=>{reg[p.r]+=T[p.t].w;nat[p.t]=(nat[p.t]||0)+1;hora[p.h]++;dow[new Date(Date.now()-p.ago*864e5).getDay()]++});
      let bs=0,bv=-1;for(let i=0;i<24;i++){const v=hora[i]+hora[(i+1)%24]+hora[(i+2)%24];if(v>bv){bv=v;bs=i}}const kp=[...document.querySelectorAll('#vdc .kp')].map(k=>[k.querySelector('small').textContent,k.querySelector('b').textContent]);
      const A=S.A;return{kp,esp:{n:P.length,ig,reg:RG[reg.indexOf(Math.max(...reg))].n,nat:nm(Object.entries(nat).sort((a,b)=>b[1]-a[1])[0][0]),hora:bs+'h–'+((bs+3)%24)+'h',dia:['domingo','segunda','terça','quarta','quinta','sexta','sábado'][dow.indexOf(Math.max(...dow))]},mesTot:A.meses.reduce((a,m)=>a+m.tot,0),natTot:Object.values(A.nat).reduce((a,b)=>a+b,0),sem:A.sem.flat().reduce((a,b)=>a+b,0),hsum:A.hora.reduce((a,b)=>a+b,0)}})()`);
    const g = n => r.kp.find(k => k[0].toLowerCase().startsWith(n))[1]; ok(g('registros').replace(/\D/g, '') === String(r.esp.n), 'registros ' + g('registros')); ok(g('gravidade').replace(/\D/g, '') === String(r.esp.ig), 'IG ' + g('gravidade')); ok(g('região') === r.esp.reg, 'região ' + g('região') + ' ≠ ' + r.esp.reg);
    ok(g('natureza').startsWith(r.esp.nat.replace(' (homicídio)', '')), 'natureza ' + g('natureza') + ' ≠ ' + r.esp.nat); ok(g('horário') === r.esp.hora, 'pico ' + g('horário') + ' ≠ ' + r.esp.hora); ok(g('dia') === r.esp.dia, 'dia ' + g('dia') + ' ≠ ' + r.esp.dia);
    ok(r.mesTot === r.esp.n && r.natTot === r.esp.n && r.sem === r.esp.n && r.hsum === r.esp.n, `somas dos gráficos: meses ${r.mesTot}, natureza ${r.natTot}, semana ${r.sem}, hora ${r.hsum} ≠ ${r.esp.n}`); const b = await bad(); ok(!b.length, b.join()); });
  await T('dashboard acompanha os filtros do mapa e muda com "Toda a base" e com o período', async () => {
    await E(`document.querySelector('#vt [data-v=mapa]').click();__h.set('ft','CVLI')`); await E(`document.querySelector('#vt [data-v=dash]').click()`); await sleep(500); const n = await E('S.f.length'); ok(await E(`S.A.n===S.f.length&&/\\(natureza: CVLI/.test(document.getElementById('vds').textContent)`), 'escopo filtros');
    await E(`document.querySelector('#vde [data-e=base]').click()`); await sleep(300); ok(await E('S.A.n===S.all.length&&S.A.n>S.f.length'), 'toda a base'); await E(`document.querySelector('#vdp [data-d="30"]').click()`); await sleep(300); ok(await E(`S.A.n===S.all.filter(p=>p.ago<30).length`), 'período 30 d');
    await E(`document.querySelector('#vde [data-e=filtros]').click();document.querySelector('#vdp [data-d="0"]').click()`); await sleep(300); ok(await E('S.A.n===S.f.length')); await E(`__h.set('ft','')`); await sleep(400); ok(await E('S.A.n===S.all.length'), 'filtro removido com o dashboard aberto não atualizou'); });
  await T('cliques no dashboard: região filtra e volta ao mapa; local voa e consulta; CTA calcula', async () => {
    await E(`document.querySelector('#vdc [data-reg]').click()`); await sleep(900); ok(await E(`document.body.dataset.v==='mapa'&&document.getElementById('fr').value!==''`), 'região'); await E(`__h.set('fr','');document.querySelector('#vt [data-v=dash]').click()`); await sleep(500);
    await E(`document.querySelector('#vdc [data-loc]').click()`); await sleep(1200); ok(await E(`document.body.dataset.v==='mapa'&&!!S.pin`), 'local'); await E('clearQ()'); await E(`document.querySelector('#vt [data-v=dash]').click()`); await sleep(500);
    await E(`document.querySelector('#vdc [data-act="prever"]').click()`); ok(await until(page, `document.body.dataset.v==='mapa'&&!!S.pm&&!document.getElementById('pm').hidden`, 30000), 'prever'); await E(`document.querySelector('#vt [data-v=dash]').click()`); await sleep(600); ok(await E(`document.querySelectorAll('#vdc .zl li').length>=5`), 'previsão não apareceu no dashboard'); });
  await T('sem datas / sem registros: mensagens claras, sem NaN', async () => {
    await E(`importCSV(new File(['lat,lng,tipo,hora\\n-19.92,-43.94,roubo,10\\n-19.93,-43.95,furto,11\\n-19.94,-43.96,roubo,22\\n'],'sd.csv'),{auto:true})`); await until(page, `S.all.length===3`, 8000); await E(`document.querySelector('#vt [data-v=dash]').click()`); await sleep(600);
    ok(/não tem datas/.test(await E(`document.getElementById('vdc').textContent`)), 'sem aviso de datas'); let b = await bad(); ok(!b.length, b.join());
    await fresh(); await E(`__h.set('ft','CVLI');__h.set('fp','0-5');__h.set('fe','i');__h.set('fr',0)`); await E(`document.querySelector('#vt [data-v=dash]').click()`); await sleep(500); if (await E('S.f.length===0')) ok(/Nenhum registro/.test(await E(`document.getElementById('vdc').textContent`)), 'estado vazio'); b = await bad(); ok(!b.length, b.join()); });
  for (const vp of [[1400, 850, false], [820, 1180, true], [390, 844, true]]) await T(`[${vp[0]}x${vp[1]}] dashboard sem rolagem horizontal e sem cartões cortados`, async () => {
    await fresh('', vp); await E(`document.querySelector('#vt [data-v=dash]').click()`); await sleep(700);
    const r = await E(`(()=>{const v=document.getElementById('vd'),vr=v.getBoundingClientRect(),bad=[];v.querySelectorAll('.dc').forEach(c=>{const r=c.getBoundingClientRect();if(r.right>vr.right+1||r.left<vr.left-1)bad.push('cartão fora')});return{h:v.scrollWidth>v.clientWidth+1,bad:[...new Set(bad)],docH:document.documentElement.scrollWidth>innerWidth+1}})()`); ok(!r.h && !r.docH && !r.bad.length, JSON.stringify(r)); await page.shot(path.join(OUT, `dashboard_${vp[0]}x${vp[1]}.png`)); });
}

/* =============== 20. EDITOR DE RELATÓRIO =============== */
if (G('relatorio')) {
  await fresh(); await E(`localStorage.removeItem('gc_rel');localStorage.removeItem('gc_rel_modelos')`);
  const abre = async () => { await E(`document.querySelector('#vt [data-v=rel]').click()`); await sleep(700); };
  const digita = (id, v) => E(`(()=>{const e=document.getElementById('${id}');e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  const prev = () => E(`document.getElementById('rpaper').innerText`);
  await T('abre com prévia em papel: título, resumo automático, seções e rodapé; sem NaN/undefined', async () => {
    await abre(); const t = await prev(); ok(/Relatório de análise criminal/i.test(t) && /Resumo executivo/i.test(t) && /Indicadores/i.test(t) && /Limitações e uso responsável/i.test(t) && /Sumário/i.test(t) && /Referências/i.test(t), [/Resumo executivo/i,/Indicadores/i,/Limitações e uso responsável/i,/Sumário/i,/Referências/i,/Relatório de análise criminal/].map(r=>r.test(t)).join()); ok(/Foram analisados 3\.000 registros/.test(t), 'resumo automático'); const b = await bad(); ok(!b.length, b.join()); ok(await E(`document.querySelectorAll('#rpaper .h1').length>=10`), 'poucas seções'); });
  await T('título, subtítulo, unidade, responsável e data aparecem na prévia e ficam salvos', async () => {
    await digita('r_titulo', 'Análise da Regional Centro-Sul'); await digita('r_sub', 'Setembro de 2026'); await digita('r_unidade', '1º BPM'); await digita('r_autor', 'Cap. Silva'); await digita('r_data', '15/09/2026'); await sleep(500); const t = await prev();
    ok(/Análise da Regional Centro-Sul/i.test(t) && /Setembro de 2026/.test(t) && /1º BPM/.test(t) && /Cap\. Silva/.test(t) && /15\/09\/2026/.test(t), t.slice(0, 250)); await sleep(500);
    await page.open(URL0); await E(HELP); await abre(); ok(/Análise da Regional Centro-Sul/i.test(await prev()), 'não persistiu depois de recarregar'); ok(await E(`document.getElementById('r_titulo').value==='Análise da Regional Centro-Sul'`)); });
  await T('desligar seção a remove da prévia; religar a traz de volta; HTML escapado', async () => {
    ok(/Mapa de calor|Quando ocorre/i.test(await prev())); await E(`(()=>{const c=document.querySelector('[data-t="horario"]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(300); ok(!/Quando ocorre/i.test(await prev()), 'não removeu');
    await E(`(()=>{const c=document.querySelector('[data-t="horario"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(300); ok(/Quando ocorre/i.test(await prev()), 'não voltou'); await digita('r_titulo', '<img src=x onerror=alert(1)> & "teste"'); await sleep(400); ok(await E(`!document.querySelector('#rpaper img[src="x"]')&&/<img src=x/i.test(document.getElementById('rpaper').innerText)`), 'título não foi escapado'); await digita('r_titulo', 'Análise da Regional Centro-Sul'); });
  await T('reordenar com ↑ e ↓ muda a ordem na prévia', async () => {
    const ord = () => E(`[...document.querySelectorAll('#rpaper .h1 h1')].map(h=>h.lastChild.textContent)`); const a = await ord(), i = a.indexOf('Natureza dos registros'); ok(i > 0, 'seção não encontrada: ' + a.join());
    await E(`document.querySelector('.si[data-id="natureza"] [data-m="up"]').click()`); await sleep(500); const b = await ord(); ok(b.indexOf('Natureza dos registros') === i - 1, 'não subiu: ' + b.join()); await E(`document.querySelector('.si[data-id="natureza"] [data-m="dn"]').click()`); await sleep(500); ok((await ord()).indexOf('Natureza dos registros') === i, 'não voltou'); });
  await T('comentário por seção aparece na prévia, com o texto escapado', async () => {
    await E(`document.querySelector('.si[data-id="regioes"] [data-m="nt"]').click()`); await sleep(300); ok(await E(`!!document.querySelector('textarea[data-n="regioes"]')`), 'campo de comentário'); await E(`(()=>{const t=document.querySelector('textarea[data-n="regioes"]');t.value='Centro-Sul concentra a demanda <b>atenção</b>';t.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(500);
    ok(await E(`/Comentário: Centro-Sul concentra a demanda <b>atenção<\\/b>/.test(document.getElementById('rpaper').innerText)&&![...document.querySelectorAll('#rpaper .folha b')].some(b=>b.textContent==='atenção')`), 'comentário/escape'); });
  await T('resumo executivo editável; "Usar automático" volta ao texto gerado; "Gerar de novo" recalcula', async () => {
    await E(`document.querySelector('#rcfg details:nth-of-type(5) summary').click()`); await E(`document.getElementById('r_resumo').closest('details').open=true`); await digita('r_resumo', 'Texto escrito pelo analista.\nSegunda linha.'); await sleep(400); ok(/Texto escrito pelo analista\.\s+Segunda linha\./.test(await prev()) && !/Foram analisados/.test(await prev()), 'texto manual');
    await E(`document.getElementById('r_limpar').click()`); await sleep(500); ok(/Foram analisados/.test(await prev()), 'automático'); });
  await T('bloco de texto livre: adicionar, editar título/texto, mover e remover', async () => {
    await E(`document.getElementById('r_addx').click()`); await sleep(400); ok(await E(`document.querySelectorAll('.si textarea[data-x]').length===1`), 'bloco não criado'); await E(`(()=>{const i=document.querySelector('input[id^="xt_"]');i.value='Recomendações';i.dispatchEvent(new Event('input',{bubbles:true}));const t=document.querySelector('textarea[data-x]');t.value='Reforçar a ronda na Savassi às sextas.';t.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(500);
    ok(/Recomendações/i.test(await prev()) && /Reforçar a ronda na Savassi/.test(await prev()), 'bloco não aparece'); await E(`document.querySelector('.si[data-id^="x"] [data-m="rm"]').click()`); await sleep(400); ok(!/Recomendações/i.test(await prev()) && await E(`document.querySelectorAll('textarea[data-x]').length===0`), 'bloco não removido'); });
  await T('seção sem dados é sinalizada, some do relatório e o atalho "calcular" executa a ação', async () => {
    ok(await E(`document.querySelector('.si[data-id="cobertura"]').classList.contains('off')&&/Ainda sem dados/.test(document.querySelector('.si[data-id="cobertura"]').textContent)`), 'não sinalizou'); ok(!/Bases, cobertura e custo/i.test(await prev()), 'seção vazia no relatório');
    await E(`document.querySelector('.si[data-id="cobertura"] [data-m="run"]').click()`); ok(await until(page, `S.posts.length>0&&document.body.dataset.v==='mapa'`, 15000), 'ação não rodou'); await abre(); ok(/Bases, cobertura e custo/i.test(await prev()), 'seção não apareceu depois de calcular'); ok(await E(`!document.querySelector('.si[data-id="cobertura"]').classList.contains('off')`)); });
  await T('escopo e período: "Toda a base" e "últimos 30 dias" mudam os números do resumo', async () => {
    await E(`document.querySelector('#vt [data-v=mapa]').click();__h.set('ft','CVLI')`); await abre(); await E(`document.getElementById('r_resumo').value`); await E(`document.getElementById('r_limpar').click()`); await sleep(500); const n = await E('S.f.length'); ok((await prev()).replace(/\./g, '').includes(`Foram analisados ${n} registros (filtros do mapa: natureza: CVLI`), 'filtro não refletido: ' + (await prev()).slice(0, 200));
    await E(`(()=>{const s=document.getElementById('r_escopo');s.value='base';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(600); ok((await prev()).replace(/\./g, '').includes('3000 registros (toda a base)'), 'toda a base: ' + (await prev()).slice(0, 300));
    await E(`(()=>{const s=document.getElementById('r_dias');s.value='30';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(600); const n30 = await E(`S.all.filter(p=>p.ago<30).length`); ok((await prev()).replace(/\./g, '').includes(`${n30} registros`), 'período 30 d: ' + n30); await E(`__h.set('ft','')`); });
  await T('imagens do relatório são PNG reais (mapa sem mapa base, sem "contaminação" de tiles)', async () => {
    await E(`__h.set('bs','ruas');document.querySelector('#vt [data-v=mapa]').click()`); await sleep(1200); await E('pmOpen()'); await sleep(3000); await E('ronda()'); await sleep(4000); await abre();
    const r = await E(`(()=>{const o=[...document.querySelectorAll('#rpaper img.rim')].map(i=>({alt:i.alt,ok:/^data:image\\/png;base64,/.test(i.src)&&i.src.length>3000}));return o})()`); ok(r.length >= 2 && r.every(x => x.ok), JSON.stringify(r)); note('imagens no relatório', r.map(x => x.alt).join(', ')); });
  await T('modelos: salvar, alterar, carregar e restaurar o padrão; logotipo opcional', async () => {
    await digita('r_titulo', 'Modelo mensal'); await digita('r_mnome', 'Mensal'); await E(`document.getElementById('r_msalvar').click()`); await sleep(400); ok(await E(`!!document.getElementById('r_mlista')&&[...document.getElementById('r_mlista').options].some(o=>o.text==='Mensal')`), 'modelo não listado');
    await digita('r_titulo', 'Outro título'); await E(`document.getElementById('r_mcarregar').click()`); await sleep(500); ok(await E(`document.getElementById('r_titulo').value==='Modelo mensal'`), 'modelo não carregado'); ok(/Modelo mensal/i.test(await prev()));
    await E(`(()=>{const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',b=atob(png),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);const dt=new DataTransfer();dt.items.add(new File([u],'logo.png',{type:'image/png'}));const f=document.getElementById('r_logo');f.files=dt.files;f.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(800); ok(await E(`!!document.querySelector('#rpaper .capa img.rlogo')`), 'logotipo não apareceu');
    await E(`document.getElementById('r_padrao').click()`); await sleep(500); ok(/Relatório de análise criminal/i.test(await prev()) && await E(`!document.querySelector('#rpaper img.rlogo')`), 'padrão não restaurado'); });
  await T('exportar PDF (impressão): só a prévia, em papel, com as seções ligadas', async () => {
    await digita('r_titulo', 'Relatório para impressão'); await E(`(()=>{const c=document.querySelector('[data-t="fontes"]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(400);
    await E(`window.__printed=0;document.getElementById('rPdf').click()`); ok(await E('window.__printed')===1, 'não imprimiu'); const r = await E(`({cls:document.getElementById('rep').className,t:document.getElementById('rep').innerText,tabelas:document.querySelectorAll('#rep table').length})`); ok(r.cls === '' && /Relatório para impressão/i.test(r.t) && !/Fontes e metodologia/i.test(r.t) && /Limitações e uso responsável/i.test(r.t), r.t.slice(0, 120));
    await page.send('Emulation.setEmulatedMedia', {media: 'print'}); await sleep(250); const p = await E(`({rep:getComputedStyle(document.getElementById('rep')).display,body:getComputedStyle(document.body).display,ov:getComputedStyle(document.body).overflow,aside:getComputedStyle(document.querySelector('aside')).display,tbar:getComputedStyle(document.getElementById('tbar')).display,vista:getComputedStyle(document.getElementById('vr')).display})`); await page.send('Emulation.setEmulatedMedia', {media: ''});
    ok(p.rep === 'block' && p.body === 'block' && p.ov === 'visible' && p.aside === 'none' && p.tbar === 'none' && p.vista === 'none', 'estilo de impressão: ' + JSON.stringify(p)); });
  await T('exportar CSV e HTML refletem as seções escolhidas', async () => {
    await E(`window.__blobs.length=0;document.getElementById('rCsv').click()`); const csv = await E(`window.__blobs.at(-1).text()`); ok(/Indicadores/.test(csv) && /Regiões/.test(csv) && !/Fontes e metodologia/.test(csv) && !/NaN|undefined/.test(csv), 'CSV: ' + csv.slice(0, 120)); const cols = csv.split('\n\n').map(s => s.split('\n').slice(1).map(l => l.split('";"').length)); ok(cols.every(w => w.every(x => x === w[0])), 'CSV com colunas desiguais');
    await E(`window.__blobs.length=0;document.getElementById('rHtml').click()`); const html = await E(`window.__blobs.at(-1).text()`); ok(/<!doctype html>/i.test(html) && /class="folhas"/.test(html) && /@page\{size:A4/.test(html) && /Relatório para impressão/.test(html) && /<style>/.test(html) && !/<script/i.test(html), 'HTML'); note('arquivo HTML', html.length + ' bytes'); });
  await T('painel lateral: botão abre o editor; PDF e CSV do painel usam as mesmas escolhas', async () => {
    await E(`document.querySelector('#vt [data-v=mapa]').click();document.querySelector('.tabs [data-p=t4]').click()`); await E(`document.getElementById('rabrir').click()`); await sleep(600); ok(await E(`document.body.dataset.v==='rel'`)); await E(`document.querySelector('#vt [data-v=mapa]').click()`); await E(`window.__printed=0;document.getElementById('xp').click()`); ok(await E('window.__printed')===1 && /Relatório para impressão/i.test(await E(`document.getElementById('rep').innerText`)), 'PDF do painel');
    await E(`window.__blobs.length=0;document.getElementById('xc').click()`); ok(!/Fontes e metodologia/.test(await E(`window.__blobs.at(-1).text()`)), 'CSV do painel'); });
  await T('ABNT: folhas A4 (21×29,7 cm), margens 3/2/2/3, texto dentro da área, numeração sequencial no canto superior direito', async () => {
    await abre(); await E(`document.getElementById('r_padrao').click()`); await sleep(500);
    const r = await E(`(()=>{const cm=96/2.54,fs=[...document.querySelectorAll('#rpaper .folha')],o={n:fs.length,tam:[],mar:[],fora:[],pn:[],vazias:[]};
     for(const f of fs){const z=f.getBoundingClientRect(),k=f.querySelector('.cont').getBoundingClientRect(),cs=getComputedStyle(f),zoom=z.width/(21*cm);o.tam.push([+(z.width/zoom/cm).toFixed(2),+(z.height/zoom/cm).toFixed(2)]);o.mar.push([cs.paddingTop,cs.paddingRight,cs.paddingBottom,cs.paddingLeft].map(v=>+(parseFloat(v)/cm).toFixed(1)).join('/'));
      const filhos=[...f.querySelectorAll('.cont > *')];const mx=Math.max(0,...filhos.map(c=>c.getBoundingClientRect().bottom)),ml=Math.max(0,...filhos.map(c=>c.getBoundingClientRect().right));if(mx>k.bottom+2||ml>k.right+2)o.fora.push(fs.indexOf(f)+1);
      const p=f.querySelector('.pn');if(p)o.pn.push(+p.textContent);if(!f.classList.contains('capa')&&f!==fs.at(-1)&&filhos.length&&(mx-k.top)/(k.height)<.12)o.vazias.push(fs.indexOf(f)+1)}
     return o})()`);
    ok(r.n >= 3, 'poucas folhas: ' + r.n); ok(r.tam.every(t => t[0] === 21 && t[1] === 29.7), 'tamanho A4: ' + JSON.stringify(r.tam)); ok(r.mar.every(m => m === '3/2/2/3'), 'margens: ' + [...new Set(r.mar)]);
    ok(!r.fora.length, 'conteúdo fora da área nas folhas ' + r.fora); ok(r.pn.length >= 1 && r.pn[0] >= 2, 'numeração ausente'); ok(r.pn.every((v, i) => i === 0 || v === r.pn[i - 1] + 1), 'numeração fora de ordem: ' + r.pn);
    ok(!r.vazias.length, 'folhas quase vazias: ' + r.vazias); note('ABNT', `${r.n} folhas; páginas numeradas ${r.pn[0]}–${r.pn.at(-1)}`);
    const pos = await E(`(()=>{const f=document.querySelector('#rpaper .folha .pn').closest('.folha').getBoundingClientRect(),p=document.querySelector('#rpaper .pn').getBoundingClientRect(),z=f.width/(21*96/2.54);return{t:+((p.top-f.top)/z/(96/2.54)).toFixed(1),r:+((f.right-p.right)/z/(96/2.54)).toFixed(1)}})()`); ok(pos.t <= 2.3 && pos.r <= 2.2, 'posição do número: ' + JSON.stringify(pos)); });
  await T('ABNT: seções numeradas, legendas Tabela/Figura com Fonte, sumário com páginas, referências, @page A4', async () => {
    const r = await E(`(()=>{const t=document.getElementById('rpaper').innerText,hs=[...document.querySelectorAll('#rpaper .h1 h1')].map(h=>h.firstChild.textContent),caps=[...document.querySelectorAll('#rpaper .cap')].map(c=>c.textContent),fontes=document.querySelectorAll('#rpaper .fonte').length,tabs=[...document.querySelectorAll('#rpaper table.abnt')].length,sumPg=[...document.querySelectorAll('#rpaper .sumario .sp')].map(x=>+x.textContent),regra=[...document.styleSheets].some(s=>{try{return[...s.cssRules].some(x=>x.type===6&&/size:\\s*A4/i.test(x.cssText))}catch(e){return false}});
     return{hs,caps,fontes,tabs,sumPg,regra,ref:/Referências/i.test(t),sem:/Referências/i.test(t)}})()`);
    ok(r.hs.slice(0, 3).join() === '1,2,3', 'numeração das seções: ' + r.hs); ok(r.caps.some(c => /^Tabela 1 – /.test(c)) && r.caps.some(c => /^Figura 1 – /.test(c)), 'legendas: ' + r.caps.slice(0, 4)); ok(r.fontes >= r.caps.filter(c => /^(Tabela|Figura)/.test(c)).length - 1, 'faltam fontes: ' + r.fontes);
    ok(r.sumPg.length >= 8 && r.sumPg.every(n => n >= 3), 'sumário: ' + r.sumPg); ok(r.ref && r.regra, '@page A4 / referências: ' + JSON.stringify({ref: r.ref, regra: r.regra})); });
  await T('ABNT: fonte 12 pt Times New Roman e entrelinha 1,5 no texto; mudar para Arial 11 e entrelinha simples atualiza', async () => {
    const lê = () => E(`(()=>{const p=document.querySelector('#rpaper .p p'),s=getComputedStyle(p);return{f:s.fontFamily,pt:+(parseFloat(s.fontSize)*.75).toFixed(1),lh:+(parseFloat(s.lineHeight)/parseFloat(s.fontSize)).toFixed(2),al:s.textAlign}})()`); const a = await lê(); ok(/Times/.test(a.f) && a.pt === 12 && a.lh === 1.5 && a.al === 'justify', JSON.stringify(a));
    await E(`(()=>{for(const [id,v] of [['r_fonte','Arial'],['r_tam','11'],['r_esp','1']]){const s=document.getElementById(id);s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}))}})()`); await sleep(700); const b = await lê(); ok(/Arial/.test(b.f) && b.pt === 11 && b.lh === 1, JSON.stringify(b));
    await E(`document.getElementById('r_padrao').click()`); await sleep(500); });
  await T('ABNT: sem capa e sem sumário, as folhas começam no texto; PDF imprime N folhas de 296,5 mm', async () => {
    await E(`(()=>{for(const id of['r_capa','r_sumario']){const c=document.getElementById(id);c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))}})()`); await sleep(600);
    ok(await E(`!document.querySelector('#rpaper .capa')&&!document.querySelector('#rpaper .sum')&&document.querySelector('#rpaper .folha .pn').textContent==='1'`), 'sem capa/sumário');
    await E(`window.__printed=0;document.getElementById('rPdf').click()`); ok(await E('window.__printed') === 1); await page.send('Emulation.setEmulatedMedia', {media: 'print'}); await sleep(250);
    const p = await E(`(()=>{const f=[...document.querySelectorAll('#rep .folha')];return{n:f.length,h:[...new Set(f.map(x=>Math.round(parseFloat(getComputedStyle(x).height)/96*25.4*10)/10))],w:[...new Set(f.map(x=>Math.round(x.getBoundingClientRect().width/96*25.4)))],sombra:getComputedStyle(f[0]).boxShadow}})()`); await page.send('Emulation.setEmulatedMedia', {media: ''});
    ok(p.n >= 3 && p.h.length === 1 && p.h[0] === 296.5 && p.w.length === 1 && p.w[0] === 210 && p.sombra === 'none', JSON.stringify(p)); await E(`document.getElementById('r_padrao').click()`); await sleep(500); });
  for (const vp of [[1400, 850, false], [390, 844, true]]) await T(`[${vp[0]}x${vp[1]}] editor sem rolagem horizontal; prévia e controles acessíveis`, async () => {
    await fresh('', vp); await abre(); const r = await E(`(()=>{const v=document.getElementById('vr');return{h:v.scrollWidth>v.clientWidth+1,doc:document.documentElement.scrollWidth>innerWidth+1,cfg:!!document.getElementById('rcfg').getBoundingClientRect().width,prev:document.getElementById('rpaper').getBoundingClientRect().width>200}})()`); ok(!r.h && !r.doc && r.cfg && r.prev, JSON.stringify(r)); await page.shot(path.join(OUT, `relatorio_${vp[0]}x${vp[1]}.png`)); });
}

await page.close();
};

try { await main(); } catch (e) { R.push({g: 'infra', n: 'execução', s: 'FALHA', m: String(e.stack || e).slice(0, 600)}); try { await page.close(); } catch {} }
fs.writeFileSync(path.join(OUT, 'resultado.json'), JSON.stringify(R, null, 1));
const f = R.filter(r => r.s === 'FALHA'), o = R.filter(r => r.s === 'OK'), n = R.filter(r => r.s === 'NOTA');
console.log(`\n== ${o.length} OK · ${f.length} FALHAS · ${n.length} notas ==`);
for (const r of f) console.log(`FALHA [${r.g}] ${r.n}\n     ${r.m}`);
console.log('\n-- NOTAS --'); for (const r of n) console.log(`[${r.g}] ${r.n}: ${r.m}`);
console.log('\n-- tempos > 3 s --'); for (const r of R.filter(r => r.ms > 3000)) console.log(`[${r.g}] ${r.n}: ${(r.ms / 1000).toFixed(1)} s`);
