/* ===== vistas (abas) e dashboard =====
   Mapa, Dashboard e Relatório são três vistas da mesma área de trabalho. O dashboard resume os dados filtrados com
   indicadores, séries, mapa de calor por dia/hora, regiões, locais, sazonalidade e o que já foi calculado (previsão, bases, rondas). */
let VISTA='mapa';
const DASH={escopo:'filtros',dias:0};
function setView(v){
 if(v===VISTA&&document.body.dataset.v===v)return;VISTA=v;document.body.dataset.v=v;
 $('vd').hidden=v!=='dash';$('vr').hidden=v!=='rel';[...$('vt').children].forEach(b=>b.classList.toggle('on',b.dataset.v===v));
 if(v!=='mapa'){$('pm').hidden=true;$('bp').hidden=true}
 {const m=v==='dash'?'t3':v==='rel'?'t4':document.querySelector('.tp.on')&&/t3|t4/.test(document.querySelector('.tp.on').id)?'t1':null,b=m&&document.querySelector('.tabs [data-p="'+m+'"]');if(b&&!b.classList.contains('on'))b.click()}
 if(v==='dash')renderDash();else if(v==='rel')renderRel();else setTimeout(draw,0)}
$('vt').onclick=e=>{const b=e.target.closest('button');if(b)setView(b.dataset.v)};
/* itens do menu lateral: clique do usuário muda de vista (Análise → Dashboard, Relatórios → Relatório; os demais → Mapa) */
document.querySelectorAll('.tabs>button').forEach(b=>b.addEventListener('click',e=>{if(e.isTrusted)setView({t1:'mapa',t2:'mapa',t3:'dash',t4:'rel'}[b.dataset.p])}));
let _rd=0;const agendarDash=()=>{if(VISTA!=='dash'||_rd)return;_rd=requestAnimationFrame(()=>{_rd=0;renderDash()})};

function renderDash(){
 if(VISTA!=='dash')return;
 const A=S.A=agregar(DASH),th=TH_ESC;
 const kp=(ic,cl,l,v,d,dc)=>`<div class="dc kp s2"><span class="ki ${cl}">${ico(ic)}</span><span class="kt"><small>${l}</small><b>${v}</b><em class="${dc}">${d}</em></span></div>`;
 $('vds').textContent=`${nfmt(A.n)} registros · ${DASH.escopo==='base'?'toda a base':'filtros do mapa ('+filtrosTxt()+')'} · ${DASH.dias?'últimos '+DASH.dias+' dias':'todo o período'}`;
 if(!A.n){$('vdc').innerHTML=`<div class="dc s12">${semDados('Nenhum registro com estes filtros. Troque para "Toda a base" ou remova filtros no mapa.')}</div>`;return}
 const reg=A.reg.map((r,i)=>({...r,c:r.n,n:RG[i].n,i})).sort((a,b)=>b.ig-a.ig),loc=A.locs.slice(0,10);
 const tot=RG.reduce((a,r)=>a+r.v,0);
 const prev=S.pm?`<ol class="zl">${S.pm.zs.slice(0,5).map((z,i)=>`<li data-z="${i}"><b>P${i+1}</b><span class="qn">${esc(z.rua||z.b||z.r)}</span><em class="up">${Math.round(z.prob*100)}%</em><small>${esc(z.perfil.hora)}</small></li>`).join('')}</ol><small class="mu">Próximos ${S.pm.W} dias · método: ${esc(S.pm.metodo.nome)} · chance de ao menos 1 ocorrência no raio de ${S.pm.R} m.</small><div class="row"><button data-act="mapa-pred">Abrir mapa de predição</button></div>`
  :`<p class="mu">Ainda não há previsão calculada para esta base.</p><div class="row"><button class="pri" data-act="prever">Prever onde podem ocorrer novos crimes</button></div>`;
 const pol=(S.last?`<div class="kv"><span>Bases posicionadas</span><b>${S.posts.length}</b><span>Cobertura ponderada</span><b>${f1(S.last.cw)}%</b><span>Bases acima da capacidade</span><b class="${S.last.ov?'up':''}">${S.last.ov}</b></div>`:`<p class="mu">Bases ainda não posicionadas.</p><div class="row"><button class="pri" data-act="bases">Distribuir bases</button></div>`)+
  (S.rt?`<div class="kv"><span>Rotas de ronda</span><b>${S.rt.q.length}</b><span>Paradas</span><b>${S.rt.q.reduce((a,r)=>a+r.o.length,0)}</b><span>Fora do turno</span><b class="${S.rt.q.some(r=>r.drop.length)?'up':''}">${S.rt.q.reduce((a,r)=>a+r.drop.length,0)}</b></div>`:`<div class="row"><button data-act="ronda">Gerar rondas por viatura</button></div>`)+`<small class="mu">Efetivo cadastrado: ${tot} VTR, ${RG.reduce((a,r)=>a+r.p,0)} PM, ${RG.reduce((a,r)=>a+r.b,0)} bases.</small>`;
 $('vdc').innerHTML=
  kp('list','k1','Registros',nfmt(A.n),dtxt(A.dRec),dcls(A.dRec))+kp('act','k2','Gravidade (IG)',nfmt(A.ig),dtxt(A.dIG),dcls(A.dIG))+
  kp('pin','k3','Região mais crítica',esc(A.regTop.nome),A.regTop.pct+'% do IG','nt')+kp('target','k4','Natureza predominante',esc(A.natTop.nome.replace(' (homicídio)','')),A.natTop.pct+'% dos registros','nt')+
  kp('clock','k1','Horário de pico',A.pico.txt,A.pico.pct+'% dos registros','nt')+kp('cal','k2','Dia de pico',A.semData?'—':A.dia.nome,A.semData?'sem datas':A.dia.pct+'% dos registros','nt')+
  `<div class="dc s8"><div class="dh"><small class="eb">TENDÊNCIA</small><h3>Evolução mensal por natureza</h3></div>${svgEvolucao(A,th)}</div>
   <div class="dc s4"><div class="dh"><small class="eb">COMPOSIÇÃO</small><h3>Natureza dos registros</h3></div>${svgDonut(A,th)}</div>
   <div class="dc s7"><div class="dh"><small class="eb">QUANDO</small><h3>Dia da semana × hora</h3></div>${svgHeat(A,th)}<div class="dh" style="margin-top:10px"><small class="eb">POR HORA</small></div>${svgHoras(A,th)}</div>
   <div class="dc s5"><div class="dh"><small class="eb">ONDE</small><h3>Regiões por gravidade (IG)</h3></div>${htmlBarrasH(reg.map(r=>({n:r.n,v:r.ig,sub:Math.round(r.ig/A.ig*100)+'%',att:` data-reg="${r.i}" title="Filtrar e abrir no mapa"`})),nfmt,'var(--ac)')}</div>
   <div class="dc s6"><div class="dh"><small class="eb">LOCAIS</small><h3>Locais com mais gravidade</h3></div>${loc.length?`<table class="dt"><tr><th>Local</th><th>Reg.</th><th>IG</th><th>30 d</th></tr>${loc.map((l,i)=>{const d=l.pre>=5?(l.rec-l.pre)/l.pre*100:null;return`<tr data-loc="${esc(l.n)}"><td>${esc(l.n)}</td><td>${nfmt(l.c)}</td><td>${nfmt(l.ig)}</td><td><em class="${dcls(d)}">${d==null?'—':pctTxt(d)}</em></td></tr>`}).join('')}</table>`:semDados('Os registros não trazem nome de local (bairro). Use as regiões.')}</div>
   <div class="dc s6"><div class="dh"><small class="eb">VARIAÇÃO</small><h3>Regiões: últimos 30 dias × 30 anteriores</h3></div>${A.semData?semDados('O arquivo não tem datas.'):htmlBarrasH(reg.filter(r=>r.pre>=5).map(r=>({n:r.n,v:(r.rec-r.pre)/r.pre*100,c:r.rec>=r.pre?'#fb7185':'#34d399',sub:pctTxt((r.rec-r.pre)/r.pre*100),att:` data-reg="${r.i}"`})),v=>'',  '#fb7185')}</div>
   <div class="dc s12"><div class="dh"><small class="eb">SAZONALIDADE</small><h3>Gravidade por região e mês</h3></div>${htmlSazon(A,th)}</div>
   <div class="dc s6"><div class="dh"><small class="eb">PREVISÃO</small><h3>Onde pode ocorrer o próximo crime</h3></div>${prev}</div>
   <div class="dc s6"><div class="dh"><small class="eb">POLICIAMENTO</small><h3>Bases, cobertura e rondas</h3></div>${pol}</div>`}

/* controles e atalhos do dashboard */
$('vde').onclick=e=>{const b=e.target.closest('button');if(!b)return;DASH.escopo=b.dataset.e;[...$('vde').children].forEach(x=>x.classList.toggle('on',x===b));renderDash()};
$('vdp').onclick=e=>{const b=e.target.closest('button');if(!b)return;DASH.dias=+b.dataset.d;[...$('vdp').children].forEach(x=>x.classList.toggle('on',x===b));renderDash()};
$('vdc').onclick=e=>{
 const a=e.target.closest('[data-act]');if(a){setView('mapa');({prever:()=>$('pd').click(),bases:()=>$('go').click(),ronda:()=>$('rb').click(),'mapa-pred':()=>pmOpen()})[a.dataset.act]();return}
 const r=e.target.closest('[data-reg]');if(r){setView('mapa');$('fr').value=r.dataset.reg;$('fr').onchange();return}
 const l=e.target.closest('[data-loc]');if(l){const o=locais().get(l.dataset.loc);if(o){setView('mapa');const x=o.x/o.c,y=o.y/o.c;flyTo(x,y,1600);inspect(x,y)}return}
 const z=e.target.closest('[data-z]');if(z&&S.pm){setView('mapa');pmOpen();flyTo(S.pm.zs[+z.dataset.z].x,S.pm.zs[+z.dataset.z].y,Math.max(S.pm.R*3,600),PH,pDraw,$('pc'))}};
