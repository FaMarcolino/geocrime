/* ===== v5: interface dinâmica ===== */
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
function toast(m,t){const e=document.createElement('div');e.className='toast'+(t?' '+t:'');e.textContent=m;$('ts').appendChild(e);setTimeout(()=>e.remove(),t==='er'?5000:2800)}
function reveal(id){const e=$(id),d=e.closest('details'),t=e.closest('.tp');if(d)d.open=true;abrirPainel();syncTools();
 if(t&&!t.classList.contains('on'))document.querySelector(`.tabs [data-p=${t.id}]`).click();
 e.scrollIntoView({block:'nearest',behavior:'smooth'});e.classList.remove('fl');void e.offsetWidth;e.classList.add('fl')}

/* seções recolhíveis: cada título vira um acordeão (os elementos são movidos, ids e eventos preservados) */
document.querySelectorAll('.tp').forEach(tp=>{[...tp.querySelectorAll(':scope>h2')].forEach((h,i)=>{
 const d=document.createElement('details'),s=document.createElement('summary'),b=document.createElement('div');d.className='sec';b.className='sb';s.append(...h.childNodes);
 for(let n=h.nextSibling,nx;n&&!(n.nodeType===1&&n.tagName==='H2');n=nx){nx=n.nextSibling;b.append(n)}
 d.append(s,b);h.replaceWith(d);d.open=i<(tp.id==='t1'?2:1)})});

/* barra de filtros ativos (chips removíveis) e alerta de saturação sempre visível */
function chips(){const L=['fr','ft','fm','fe','fp'],on=L.filter(i=>$(i).value!==''),sat=S.lv.filter(l=>l.d>=l.md&&l.n>l.cap).length;
 $('fb').innerHTML=`<span class="chip"><b>${S.f.length.toLocaleString('pt-BR')}</b> registros${on.length?'':' · sem filtros'}</span>`+
  on.map(i=>`<span class="chip x" data-f="${i}" title="Remover filtro">${$(i).selectedOptions[0].text} ✕</span>`).join('')+
  (on.length>1?'<span class="chip x" data-f="*">Limpar filtros</span>':'')+
  (sat?`<span class="chip x wn" data-f="!sat" title="Subdivisão insuficiente: aumente a profundidade ou o limite">⚠ ${sat} célula(s) saturada(s)</span>`:'')+
  (S.f.length?'':'<span class="chip er">Nenhum registro: afrouxe os filtros</span>');topoSync()}
$('fb').onclick=e=>{const t=e.target.closest('[data-f]');if(!t)return;const f=t.dataset.f;
 if(f==='!sat'){reveal('cap');const a=$('al');a.classList.remove('fl');void a.offsetWidth;a.classList.add('fl');return}
 (f==='*'?['fr','ft','fm','fe','fp']:[f]).forEach(i=>$(i).value='');$('fr').onchange()};

/* cartão de resultado sobre o mapa (consulta de ponto e área) */
function qcSync(){const a=!!S.pin,b=!!S.selM&&S.selM.x1-S.selM.x0>=30;$('insp').hidden=!a;$('sl').hidden=!b;$('qc').hidden=!(a||b);if(a)$('wc').hidden=true}
function clearQ(){S.tk=(S.tk||0)+1;S.pin=null;S.knn=[];S.kr=[];if(S.sm)$('sel').click();S.selM=null;$('hp').hidden=true;draw();syncTools()}
$('qx').onclick=clearQ;$('hx').onclick=()=>$('hp').hidden=true;
$('wx').onclick=()=>{$('wc').hidden=true;store.set('gc_wc','1')};if(store.get('gc_wc'))$('wc').hidden=true;
$('hm').onclick=()=>{const h=document.querySelector('.hud').classList.toggle('mini');$('hm').textContent=h?'+':'–'};
if(innerWidth<=820){document.querySelector('.hud').classList.add('mini');$('hm').textContent='+'}
new MutationObserver(()=>document.body.classList.toggle('pmo',!$('pm').hidden)).observe($('pm'),{attributes:true,attributeFilter:['hidden']});

/* manchas clicáveis: voam até o local e abrem a consulta */
$('hs').onclick=e=>{const t=e.target.closest('[data-i]'),o=t&&S.hs[+t.dataset.i];if(!o)return;flyTo(o.x,o.y,Math.max(+$('R').value*3,600));inspect(o.x,o.y)};

/* barra de ferramentas */
const mob=()=>innerWidth<=820,painelAberto=()=>mob()?document.body.classList.contains('sd'):!document.body.classList.contains('sc'),
 abrirPainel=()=>{document.body.classList.remove('sc');if(mob())document.body.classList.add('sd')},
 togglePanel=()=>{document.body.classList.toggle(mob()?'sd':'sc');syncTools()},toggleSel=()=>$('sel').click();
function shareLink(){const p=new URLSearchParams();[['fr','reg'],['ft','tipo'],['fm','mes'],['fe','epoca'],['fp','turno']].forEach(([i,k])=>{if($(i).value!=='')p.set(k,$(i).value)});if(BASE!=='ruas')p.set('base',BASE);
 const u=location.href.split(/[?#]/)[0]+(p.toString()?'?'+p:'');
 (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast('Link da visão copiado'),()=>toast('Não foi possível copiar: '+u,'er'))}
function syncTools(){document.querySelectorAll('#tb [data-l]').forEach(b=>b.classList.toggle('on',$(b.dataset.l).checked));
 document.querySelector('#tb [data-t=sel]').classList.toggle('on',!!S.sm);document.querySelector('#tb [data-t=panel]').classList.toggle('on',painelAberto())}
$('tb').onclick=e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.l){const c=$(b.dataset.l);c.checked=!c.checked;c.dispatchEvent(new Event('change'))}
 else({panel:togglePanel,sel:toggleSel,fit:()=>fit(null,1),link:shareLink,help:()=>{$('hp').hidden=!$('hp').hidden}})[b.dataset.t]();syncTools()};
['lp','lq','lh','lk','lr'].forEach(i=>$(i).addEventListener('change',syncTools));$('lr').onchange=draw;$('sel').addEventListener('click',syncTools);syncTools();
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||(typeof VISTA!=='undefined'&&VISTA!=='mapa'))return;const k=e.key.toLowerCase();
 if(!$('pm').hidden){const H=[PH,pDraw,$('pc')];if(k==='+'||k==='=')zoomA(1.4,...H);else if(k==='-')zoomA(1/1.4,...H);else if(k==='f'||k==='0')fly(vfit(S.bb,$('pc')),...H);else if(k==='escape')$('pm').hidden=true;else return;e.preventDefault();return}
 if(k==='+'||k==='=')zoomA(1.4);else if(k==='-')zoomA(1/1.4);else if(k==='f'||k==='0')fit(null,1);else if(k==='s')toggleSel();else if(k==='p')togglePanel();
 else if(k==='escape')clearQ();else if(k==='?'||k==='h')$('hp').hidden=!$('hp').hidden;else return;syncTools();e.preventDefault()});

/* dica ao passar o mouse: registro mais próximo ou mancha criminal */
{const tip=document.createElement('div');tip.className='tip';cn.parentNode.appendChild(tip);let hv=0;
 cn.addEventListener('pointermove',e=>{if(dr){tip.style.display='none';return}if(hv)return;const ox=e.offsetX,oy=e.offsetY;
  hv=requestAnimationFrame(()=>{hv=0;if(!S.qt||dr)return;const x=(ox-S.V.ox)/S.V.s,y=(S.V.oy-oy)/S.V.s,R=+$('R').value,n=S.qt.knn(x,y,1,[],{v:0})[0],sp=S.hs.findIndex(o=>Math.hypot(o.x-x,o.y-y)<=R);let h='';
   if(n&&Math.sqrt(n.d)<=10/S.V.s){const p=n.p;h=`<b>${nm(p.t)}</b> · ${p.h}h · ${new Date(Date.now()-p.ago*864e5).toLocaleDateString('pt-BR')}<br>${p.b} · ${RG[p.r].n}`}
   else if(sp>=0)h=`<b>Mancha #${sp+1}</b> · ${S.hs[sp].b}<br>${S.hs[sp].n} oc. · ${f1(S.hs[sp].r)}× a média`;
   if(h){tip.innerHTML=h;tip.style.display='block';tip.style.left=Math.min(ox+14,cn.clientWidth-220)+'px';tip.style.top=oy+14+'px'}else tip.style.display='none'})});
 cn.addEventListener('pointerleave',()=>tip.style.display='none')}

/* ações demoradas: botão ocupado, resultado em destaque e aviso de conclusão */
{const AFT={go:()=>{reveal('pp');return S.posts.length?`${S.posts.length} bases posicionadas · cobertura ${f1(S.last.cw)}% (ponderada)`:null},
  rd0:()=>{reveal('rd')},pd:()=>S.pm?'Mapa de predição aberto':null,
  db:()=>{reveal('dbr');return S.cl?S.cl.length+' aglomerado(s) detectado(s)':null},
  cmp:()=>{reveal('cr');return S.cmp?'Mapa de diferença: vermelho aumentou, azul diminuiu':null},
  rb:()=>{reveal('rrs');return S.rt?`${S.rt.q.length} rondas geradas, uma por quadrante`:null},bm:()=>{reveal('bmr')},bsc:()=>{reveal('sc')}};
 Object.keys(AFT).forEach(id=>{const b=$(id),f=b.onclick;b.onclick=()=>{if(['go','rd0','pd','db','cmp','rb'].includes(id)&&typeof setView==='function')setView('mapa');b.classList.add('busy');b.disabled=true;
  setTimeout(async()=>{try{await f.call(b)}catch(err){toast('Erro: '+(err.message||err),'er')}b.classList.remove('busy');b.disabled=false;const m=AFT[id]();if(m)toast(m)},40)}})}

/* ===== v9.1: shell em painel (navegação, barra superior, busca, alertas, indicadores) ===== */
/* cada módulo abre logo abaixo do seu item de navegação */
document.querySelectorAll('.tabs>button').forEach(b=>b.after($(b.dataset.p)));
$('hb').onclick=togglePanel;$('sbt').onclick=()=>{const s=document.querySelector('.sbx');s.classList.toggle('open');if(s.classList.contains('open'))$('q').focus()};$('bd').onclick=()=>{document.body.classList.remove('sd');syncTools()};
$('fs').onclick=()=>{(document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()).catch(()=>toast('Tela cheia indisponível neste navegador','er'))};
function mostrarModulo(t){const b=document.querySelector('.tabs [data-p="'+t+'"]');if(b&&!b.classList.contains('on'))b.click();abrirPainel();syncTools()}

/* indicadores: variação dos últimos 30 dias contra os 30 anteriores; origem dos dados */
function topoSync(){
 const src=($('src').textContent||'').replace(/^·\s*/,''),syn=/sint/i.test(src),dc=$('dc');
 dc.className='dchip'+(syn?' syn':'');dc.textContent=`${S.f.length.toLocaleString('pt-BR')} de ${S.all.length.toLocaleString('pt-BR')} · ${syn?'dados sintéticos':src}`;
 dc.title=syn?'Dados fictícios gerados pelo app: os resultados não representam a criminalidade real. Importe um CSV do REDS para usar dados reais.':src;
 const rec=S.f.filter(p=>p.ago<30),pre=S.f.filter(p=>p.ago>=30&&p.ago<60),dl=(a,b,el)=>{if(b<10){el.className='nt';el.textContent='sem base 30 d';return}
  const p=(a-b)/b*100;el.className=Math.abs(p)<.5?'nt':p>0?'up':'dn';el.textContent=(p>0.5?'▲ ':p<-.5?'▼ ':'')+Math.abs(p).toFixed(1).replace('.',',')+'% vs 30d'};
 dl(rec.length,pre.length,$('d1'));dl(wsum(rec),wsum(pre),$('d2'));$('s5').textContent=(S.W||0).toLocaleString('pt-BR');alertas();if(typeof agendarDash==='function'){agendarDash();if(VISTA==='rel')relPrever()}}

/* alertas: tudo que merece atenção, num só lugar */
let ALJ='';
function alertas(){
 const L=[],sat=(S.lv||[]).filter(l=>l.d>=l.md&&l.n>l.cap).length;
 if(/sint/i.test($('src').textContent))L.push({s:'i',t:'Dados sintéticos em uso',d:'Os resultados não representam a criminalidade real. Importe um CSV do REDS.',a:()=>{mostrarModulo('t1');reveal('regen')}});
 if(S.all.length&&!S.f.length)L.push({s:'w',t:'Nenhum registro com os filtros',d:'Remova algum filtro para voltar a ver ocorrências.',a:()=>{['fr','ft','fm','fe','fp'].forEach(i=>$(i).value='');$('fr').onchange()}});
 if(sat)L.push({s:'w',t:sat+' célula(s) saturada(s) na QuadTree',d:'A subdivisão não basta: aumente a profundidade ou o limite da região.',a:()=>{mostrarModulo('t1');reveal('cap')}});
 if(S.last&&S.last.ov)L.push({s:'w',t:S.last.ov+' base(s) acima da capacidade',d:'Demanda maior que o atendimento das viaturas. Considere redistribuir o efetivo.',a:()=>{mostrarModulo('t2');reveal('pp')}});
 if(S.rt){const d=S.rt.q.reduce((a,r)=>a+r.drop.length,0);if(d)L.push({s:'w',t:d+' parada(s) fora do turno',d:'Paradas de menor IG não couberam no turno. Aumente o turno ou as viaturas.',a:()=>{mostrarModulo('t2');reveal('rrs')}});
  if(!S.rt.q.some(r=>r.dep))L.push({s:'i',t:'Ronda sem bases posicionadas',d:'Cada rota parte da sua parada de maior IG. Use "Distribuir bases".',a:()=>{mostrarModulo('t2');reveal('go')}})}
 if(S.pm&&!S.pm.bt.res)L.push({s:'i',t:'Predição sem validação',d:'Histórico curto: não há janelas suficientes para provar o desempenho.',a:()=>{}});
 const j=JSON.stringify(L.map(x=>[x.s,x.t,x.d]));window.__alertas=L;if(j===ALJ)return;ALJ=j;
 const n=L.length,w=L.some(x=>x.s==='w'),bn=$('bn');bn.hidden=!n;bn.textContent=n;bn.className='bdg'+(w?'':' i');
 $('bp').innerHTML=`<div class="ch" style="padding:6px 8px 2px"><b>Alertas</b><small style="color:var(--mu)">${n?n+' ativo(s)':'tudo em ordem'}</small></div>`+
  (n?L.map((x,i)=>`<button class="ai ${x.s}" data-a="${i}"><i></i><span><b>${x.t}</b><small>${x.d}</small></span></button>`).join(''):'<div style="padding:10px;color:var(--mu)">Nenhum alerta no momento.</div>')}
$('bl').onclick=e=>{e.stopPropagation();$('bp').hidden=!$('bp').hidden;$('qr').hidden=true};
$('bp').onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;$('bp').hidden=true;window.__alertas[+b.dataset.a].a()};
setInterval(alertas,2000);

/* busca: regiões, locais, manchas, coordenadas e ações (Ctrl+K ou /) */
const ACOES=[{n:'Distribuir bases e calcular cobertura',k:'bases posto cobertura custo capacidade',t:'t2',id:'go'},{n:'Gerar rondas por viatura',k:'ronda rota viatura vtr patrulha turno',t:'t2',id:'rb'},
 {n:'Prever os próximos 30 dias',k:'predicao previsao mapa backtest zonas',t:'t3',id:'pd'},{n:'Detectar aglomerados (DBSCAN)',k:'dbscan cluster aglomerado',t:'t3',id:'db'},
 {n:'Redistribuir policiamento por demanda',k:'efetivo redistribuir viaturas',t:'t2',id:'rd0'},{n:'Exportar relatório em PDF',k:'exportar pdf imprimir relatorio',t:'t4',id:'xp'},
 {n:'Exportar relatório em CSV',k:'exportar csv relatorio',t:'t4',id:'xc'},{n:'Exportar registros filtrados (CSV)',k:'exportar registros filtrados',t:'t4',id:'xr'},
 {n:'Importar registros (CSV do REDS)',k:'importar csv reds dados',fn:()=>{mostrarModulo('t1');$('file').click()}},{n:'Importar regiões ou quadrantes (GeoJSON)',k:'geojson regioes quadrantes poligonos',fn:()=>{mostrarModulo('t1');reveal('geoinfo')}},
 {n:'Selecionar área no mapa',k:'area selecionar retangulo rota',fn:()=>toggleSel()},{n:'Limpar filtros',k:'limpar filtros remover',fn:()=>{['fr','ft','fm','fe','fp'].forEach(i=>$(i).value='');$('fr').onchange()}},
 {n:'Enquadrar o mapa',k:'enquadrar zoom ajustar',fn:()=>fit(null,1)}];
let LOC={ref:null,m:null};
function locais(){if(LOC.ref===S.all)return LOC.m;const m=new Map();for(const p of S.all){if(p.b==='Malha urbana'||p.b==='Ponto importado')continue;let o=m.get(p.b);if(!o)m.set(p.b,o={n:p.b,c:0,x:0,y:0});o.c++;o.x+=p.x;o.y+=p.y}LOC={ref:S.all,m};return m}
let QSEL=0,QIT=[];
function buscar(q){
 const nq=geoNorm(q),it=[],ok=(n,k)=>!nq||geoNorm(n+' '+(k||'')).includes(nq),ord=(a,b)=>(geoNorm(a.n).startsWith(nq)?0:1)-(geoNorm(b.n).startsWith(nq)?0:1)||a.n.localeCompare(b.n,'pt-BR');
 const co=/^\s*(-?\d+[.,]\d+)[\s;,]+(-?\d+[.,]\d+)\s*$/.exec(q);
 if(co){const la=parseFloat(co[1].replace(',','.')),ln=parseFloat(co[2].replace(',','.'));if(la>=BB.la[0]&&la<=BB.la[1]&&ln>=BB.ln[0]&&ln<=BB.ln[1])it.push({g:'COORDENADAS',n:`Ir para ${la.toFixed(5)}, ${ln.toFixed(5)}`,run:()=>{const x=(ln-LNG0)*KX,y=(la-LAT0)*KY;flyTo(x,y,1500);inspect(x,y)}})}
 const cnt=RG.map(()=>0);S.all.forEach(p=>cnt[p.r]++);
 RG.map((r,i)=>({n:r.n,i})).filter(r=>ok(r.n,'regiao regional')).sort(ord).slice(0,6).forEach(r=>it.push({g:'REGIÕES',n:r.n,s:cnt[r.i].toLocaleString('pt-BR')+' registros',run:()=>{$('fr').value=r.i;$('fr').onchange()}}));
 S.hs.map((o,i)=>({n:`Mancha #${i+1} · ${o.b}`,o})).filter(m=>ok(m.n,'mancha hotspot')).slice(0,5).forEach(m=>it.push({g:'MANCHAS',n:m.n,s:m.o.n+' oc.',run:()=>{flyTo(m.o.x,m.o.y,Math.max(+$('R').value*3,600));inspect(m.o.x,m.o.y)}}));
 if(nq)[...locais().values()].filter(l=>ok(l.n)).sort(ord).slice(0,6).forEach(l=>it.push({g:'LOCAIS',n:l.n,s:l.c.toLocaleString('pt-BR')+' registros',run:()=>{const x=l.x/l.c,y=l.y/l.c;flyTo(x,y,1600);inspect(x,y)}}));
 ACOES.filter(a=>ok(a.n,a.k)).slice(0,nq?7:6).forEach(a=>it.push({g:'AÇÕES',n:a.n,run:()=>{if(a.fn)return a.fn();mostrarModulo(a.t);$(a.id).click()}}));
 return it}
function renderBusca(){
 const q=$('q').value;QIT=buscar(q);QSEL=Math.min(QSEL,Math.max(0,QIT.length-1));let g='';
 $('qr').innerHTML=QIT.length?QIT.map((x,i)=>(x.g!==g?(g=x.g,`<div class="qg">${g}</div>`):'')+`<div class="qi${i===QSEL?' sel':''}" role="option" data-i="${i}"><span class="qn">${x.n}</span>${x.s?`<small>${x.s}</small>`:''}</div>`).join(''):'<div class="qg">Nada encontrado. Tente o nome de uma região, um bairro ou uma ação.</div>';
 $('qr').hidden=false;$('q').setAttribute('aria-expanded','true')}
function fecharBusca(){$('qr').hidden=true;$('q').setAttribute('aria-expanded','false');if(innerWidth<=700&&document.activeElement!==$('q'))document.querySelector('.sbx').classList.remove('open')}
function rodarBusca(i){const x=QIT[i];if(!x)return;fecharBusca();$('q').value='';$('q').blur();document.querySelector('.sbx').classList.remove('open');x.run()}
$('q').addEventListener('input',()=>{QSEL=0;renderBusca();$('bp').hidden=true});
$('q').addEventListener('focus',()=>{renderBusca();$('bp').hidden=true});
$('q').addEventListener('keydown',e=>{
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(QIT.length){QSEL=(QSEL+(e.key==='ArrowDown'?1:-1)+QIT.length)%QIT.length;renderBusca();const s=$('qr').querySelector('.sel');if(s)s.scrollIntoView({block:'nearest'})}}
 else if(e.key==='Enter'){e.preventDefault();rodarBusca(QSEL)}else if(e.key==='Escape'){e.stopPropagation();$('q').value='';fecharBusca();$('q').blur()}});
$('qr').addEventListener('mousedown',e=>{const i=e.target.closest('.qi');if(i){e.preventDefault();rodarBusca(+i.dataset.i)}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.sbx')&&!e.target.closest('#sbt')){fecharBusca();document.querySelector('.sbx').classList.remove('open')}if(!e.target.closest('#bp,#bl'))$('bp').hidden=true});
document.addEventListener('keydown',e=>{const t=e.target.tagName;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'||(e.key==='/'&&!/INPUT|SELECT|TEXTAREA/.test(t)&&!e.ctrlKey&&!e.metaKey)){e.preventDefault();$('q').focus();$('q').select()}});
