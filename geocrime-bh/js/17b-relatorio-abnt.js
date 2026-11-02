/* ===== relatório em formato ABNT (A4) =====
   Folha A4 (21 × 29,7 cm), margens de 3 cm (superior e esquerda) e 2 cm (inferior e direita), texto justificado em
   Times New Roman 12 com entrelinha 1,5, títulos de seção numerados, legendas "Tabela N – ..." / "Figura N – ..." com "Fonte:",
   tabelas em fonte menor e traços horizontais, capa, sumário com páginas, numeração no canto superior direito e referências.
   O app mede cada bloco e distribui nas folhas (paginador próprio), por isso a prévia é igual ao que sai na impressão. */
const CM=96/2.54;
const ABNT_CSS=`
@page{size:A4;margin:0}
.folhas{font-family:var(--fn,"Times New Roman"),"Times New Roman",Times,serif;font-size:calc(var(--tam,12)*1pt);line-height:var(--esp,1.5);color:#000;hyphens:auto;-webkit-hyphens:auto}
.folhas .folha{width:21cm;height:29.7cm;padding:3cm 2cm 2cm 3cm;box-sizing:border-box;background:#fff;color:#000;position:relative;overflow:hidden;margin:0 auto 14px;box-shadow:0 8px 30px rgba(0,0,0,.4);text-align:justify;break-after:page;page-break-after:always}
.folhas .folha:last-child{break-after:auto;page-break-after:auto}
.folhas .cont{width:16cm;height:24.7cm;display:flow-root;overflow:visible}
.folhas .medida{height:auto!important;box-shadow:none;margin:0}.folhas .medida .cont{height:auto}
.folhas .pn{position:absolute;top:2cm;right:2cm;font-size:10pt;line-height:1}
.folhas .b{display:flow-root;break-inside:avoid}
.folhas p{margin:0}.folhas .p p{text-indent:1.25cm}
.folhas .al p{margin-left:1.25cm;text-indent:-.6cm}
.folhas h1,.folhas h2{margin:0;font-size:inherit;line-height:inherit;text-align:left;font-weight:700;color:#000;border:0;padding:0;font-family:inherit;letter-spacing:0}
.folhas .h1{padding:calc(var(--tam,12)*var(--esp,1.5)*1pt) 0}.folhas .h1 h1{text-transform:uppercase}
.folhas .h2{padding:calc(var(--tam,12)*var(--esp,1.5)*1pt) 0}.folhas .h1.sn h1{text-align:center}
.folhas .nm{margin-right:.5em}
.folhas .fg,.folhas .tb2{padding:6pt 0 12pt}
.folhas .cap{font-size:10pt;line-height:1.15;text-align:left;margin-bottom:5pt}
.folhas .fonte,.folhas .ct{font-size:10pt;line-height:1.15;text-align:left;margin-top:4pt}.folhas .ct.r{text-align:right}.folhas .ct:not(.r){margin:0 0 4pt}
.folhas .fgc{text-align:center}.folhas .fgc svg,.folhas .fgc img{display:block;max-width:100%;max-height:19cm;height:auto;margin:0 auto}
.folhas .fgc img{width:100%;aspect-ratio:900/620;border:0.5pt solid #000;border-radius:0}
table.abnt{width:100%;border-collapse:collapse;font-size:10pt;line-height:1.15;text-align:left;color:#000}
table.abnt.wide{font-size:8.5pt}table.abnt th,table.abnt td{padding:2pt 4pt;vertical-align:top;border:0;background:none;color:#000;overflow-wrap:break-word;text-align:left;font-weight:400}
table.abnt thead th{border-top:1.5pt solid #000;border-bottom:1pt solid #000;font-weight:700}table.abnt tr.ult td{border-bottom:1.5pt solid #000}
.folhas .lgd{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:4pt;font-size:10pt;line-height:1.2;color:#000}.folhas .lgd i,.folhas .lg2 i{display:inline-block;width:9px;height:9px;margin-right:5px;border-radius:0}
.folhas .dnt{display:flex;gap:18px;align-items:center;justify-content:center}.folhas .dnt svg{max-width:4.2cm;flex:none}.folhas .lg2{list-style:none;margin:0;padding:0;font-size:10pt;line-height:1.3;flex:1;max-width:9cm;text-align:left}
.folhas .lg2 li{display:flex;gap:6px;padding:2pt 0;border-bottom:.5pt solid #999}.folhas .lg2 b{margin-left:auto}.folhas .lg2 small{width:40px;text-align:right;color:#000}
.folhas .sz table{border-collapse:separate;border-spacing:1px;width:100%;font-size:8pt;line-height:1.1}.folhas .sz td,.folhas .sz th{height:14px;text-align:center;color:#000;padding:0;font-weight:400}.folhas .sz td:first-child,.folhas .sz th:first-child{text-align:left;white-space:nowrap;padding-right:6px;height:auto}
.folhas .vazio{padding:6pt 0;color:#000;font-style:italic}
.folhas .capa .cont{height:24.7cm;display:flex;flex-direction:column;justify-content:space-between;text-align:center}
.folhas .capa .c-top{text-transform:uppercase;font-weight:700;line-height:1.3}.folhas .capa .c-top img{max-height:2.6cm;max-width:6cm;margin:0 auto 8pt;display:block}
.folhas .capa .c-tit{font-size:calc(var(--tam,12)*1pt);line-height:1.5}.folhas .capa .c-tit b{text-transform:uppercase;font-size:calc(var(--tam,12)*1.17pt)}
.folhas .capa .c-rod{line-height:1.3}
.folhas .sum h1{text-align:center;text-transform:uppercase;padding-bottom:calc(var(--tam,12)*var(--esp,1.5)*1pt)}
.folhas .sumario{list-style:none;margin:0;padding:0;text-align:left}.folhas .sumario li{display:flex;align-items:baseline;line-height:1.35;padding:1pt 0}
.folhas .sumario li.n1{font-weight:700;text-transform:uppercase;margin-top:5pt}.folhas .sumario li.n2{padding-left:.9cm}
.folhas .sumario .sd{flex:1;border-bottom:1px dotted #000;margin:0 4px;transform:translateY(-3px);min-width:10px}.folhas .sumario .sp{font-weight:400}
.prevfolhas{overflow:auto;padding:4px}.prevfolhas .folhas{transform-origin:top center}
body.exp{margin:0;background:#cbd5e1}body.exp .folhas .folha{margin:12px auto}
@media print{body.exp{background:#fff}.folhas{zoom:1!important}.folhas .folha{box-shadow:none!important;margin:0!important;height:296.5mm}#pgmed{display:none!important}}
`;
(()=>{const s=document.createElement('style');s.id='abnt-css';s.textContent=ABNT_CSS;document.head.appendChild(s)})();

const MES_ABR=['jan.','fev.','mar.','abr.','maio','jun.','jul.','ago.','set.','out.','nov.','dez.'],dataABNT=d=>`${String(d.getDate()).padStart(2,'0')} ${MES_ABR[d.getMonth()]} ${d.getFullYear()}`;
const origemDados=()=>{const s=($('src').textContent||'').replace(/^·\s*/,'').replace(/\s*\(\d+.*\)$/,'');return/sint/i.test(s)?'dados sintéticos gerados pelo GeoCrime BH':s||'base carregada no GeoCrime BH'};
const fonteTxt=()=>`Elaboração própria, com base em ${origemDados()}, ${REL.ano||new Date().getFullYear()}.`;
function refsAuto(){const hoje=dataABNT(new Date()),ano=REL.ano||new Date().getFullYear(),inst=(REL.inst||'').toUpperCase()||'GEOCRIME BH',sint=/sint/i.test($('src').textContent),src=origemDados();
 return[sint?`GEOCRIME BH. Base sintética de ocorrências: gerada pelo aplicativo para demonstração. ${REL.local||'Belo Horizonte'}, ${ano}.`:`${inst}. Registros de ocorrências: ${src}. ${REL.local||'Belo Horizonte'}, ${ano}.`,
  `PREFEITURA DE BELO HORIZONTE. Dados Abertos: coordenadas de contorno das Regiões Administrativas do Município. Belo Horizonte: PBH, [s.d.]. Disponível em: https://dados.pbh.gov.br. Acesso em: ${hoje}.`,
  `PROJECT OSRM. Open Source Routing Machine: rotas e matriz de tempos. Disponível em: https://project-osrm.org. Acesso em: ${hoje}.`,
  `ESRI. World Street Map: mapa base. Disponível em: https://www.esri.com. Acesso em: ${hoje}.`].join('\n')}

/* ---- seções → blocos ABNT ---- */
const paras=t=>String(t).split(/\n+/).map(s=>s.trim()).filter(Boolean).map(s=>({k:'p',h:esc(s)}));
function converter(id,s,c){
 const nome=s.n,out=[];
 if(id==='kpis'){out.push({k:'tab',t:'Indicadores do período',head:['Indicador','Valor','Variação / observação'].map(esc),rows:kpiRel(c.A).map(k=>k.map(esc))});return out}
 if(id==='resumo')return paras(relResumo(c.A));
 const box=document.createElement('div');box.innerHTML=s.html(c);let ult='';const kids=[...box.children];
 for(let i=0;i<kids.length;i++){const e=kids[i],tag=e.tagName;
  if(tag==='H3'){ult=e.textContent;out.push({k:'sub',t:ult});continue}
  if(tag==='TABLE'){const rows=[...e.rows].map(r=>[...r.cells].map(td=>td.innerHTML));out.push({k:'tab',t:ult||nome,head:rows[0],rows:rows.slice(1)});continue}
  if(tag==='svg'||tag==='svg'){let h=e.outerHTML;const nx=kids[i+1];if(nx&&nx.classList.contains('lgd')){h+=nx.outerHTML;i++}out.push({k:'fig',t:e.getAttribute('aria-label')||nome,h});continue}
  if(e.matches('.dnt,.sz')){const sv=e.querySelector('svg');out.push({k:'fig',t:(sv&&sv.getAttribute('aria-label'))||ult||nome,h:e.outerHTML});continue}
  if(tag==='IMG'){out.push({k:'fig',t:e.alt||nome,h:e.outerHTML});continue}
  if(tag==='UL'){[...e.children].forEach((li,j)=>out.push({k:'al',l:String.fromCharCode(97+j),h:li.innerHTML}));continue}
  if(e.classList.contains('vazio')){out.push({k:'p',h:e.innerHTML});continue}
  if(tag==='P'||e.classList.contains('rtx')){e.innerHTML.split(/<br\s*\/?>/).forEach(t=>t.trim()&&out.push({k:'p',h:t}));continue}
  out.push({k:'p',h:e.innerHTML||esc(e.textContent)})}
 return out}
function abntBlocos(c){
 const B=[],fonte=fonteTxt();let ns=0,nf=0,nt=0;
 for(const id of REL.ordem){const x=REL.extras.find(e=>e.id===id);let nome,bl;
  if(x){if(REL.on[id]===0||!(x.texto||'').trim())continue;nome=x.titulo||'Observações';bl=paras(x.texto)}
  else{const s=SEC[id];if(!s||!REL.on[id]||!s.ok(c))continue;nome=s.n;try{bl=converter(id,s,c)}catch(e){bl=[{k:'p',h:esc('Não foi possível montar esta seção ('+e.message+').')}]}
   const nota=(REL.notas[id]||'').trim();if(nota)bl.push(...paras('Comentário: '+nota))}
  B.push({k:'h1',num:String(++ns),txt:nome,id});let sub=0;
  for(const b of bl){if(b.k==='sub'){B.push({k:'h2',num:`${ns}.${++sub}`,txt:b.t});continue}if(b.k==='fig'){b.n=++nf;b.fonte=fonte}if(b.k==='tab'){b.n=++nt;b.fonte=fonte}B.push(b)}}
 const refs=(REL.refs||'').trim()||refsAuto();
 B.push({k:'h1',sn:1,txt:'Referências',id:'refs'});refs.split(/\n+/).filter(l=>l.trim()).forEach(l=>B.push({k:'ref',h:esc(l.trim())}));
 return B}

/* ---- HTML de cada bloco ---- */
const tabHTML=(b,o)=>`<div class="b tb2">${o.primeiro?`<div class="cap">Tabela ${b.n} – ${esc(b.t)}</div>`:'<div class="ct">(continuação)</div>'}<table class="abnt${b.head.length>=9?' wide':''}"><thead><tr>${b.head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${b.rows.slice(o.ini,o.fim).map((r,i)=>`<tr${o.ultimo&&o.ini+i===b.rows.length-1?' class="ult"':''}>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>${o.ultimo?`<div class="fonte">Fonte: ${esc(b.fonte)}</div>`:'<div class="ct r">(continua)</div>'}</div>`;
function blHTML(b){switch(b.k){
 case'h1':return`<div class="b h1${b.sn?' sn':''}"><h1>${b.sn?'':`<span class="nm">${b.num}</span>`}${esc(b.txt)}</h1></div>`;
 case'h2':return`<div class="b h2"><h2><span class="nm">${b.num}</span>${esc(b.txt)}</h2></div>`;
 case'p':return`<div class="b p"><p>${b.h}</p></div>`;
 case'al':return`<div class="b al"><p>${b.l}) ${b.h}</p></div>`;
 case'ref':return`<div class="b al"><p style="margin-left:0;text-indent:0;text-align:left">${b.h}</p></div>`;
 case'fig':return`<div class="b fg"><div class="cap">Figura ${b.n} – ${esc(b.t)}</div><div class="fgc">${b.h}</div><div class="fonte">Fonte: ${esc(b.fonte)}</div></div>`;
 default:return''}}

/* ---- paginador ---- */
function medidor(){let m=$('pgmed');if(!m){m=document.createElement('div');m.id='pgmed';m.className='folhas';m.style.cssText='position:absolute;left:-99999px;top:0;visibility:hidden';m.innerHTML='<section class="folha medida"><div class="cont"></div></section>';document.body.appendChild(m)}
 m.style.setProperty('--fn',REL.fonte||'Times New Roman');m.style.setProperty('--tam',REL.tam||12);m.style.setProperty('--esp',REL.esp||1.5);return m}
function paginar(B){
 const m=medidor(),cont=m.querySelector('.cont'),HP=24.7*CM-4;
 const alt=h=>{cont.innerHTML=h;return cont.getBoundingClientRect().height};
 const medTab=b=>{cont.innerHTML=tabHTML(b,{ini:0,fim:b.rows.length,primeiro:true,ultimo:true});const r=cont.firstElementChild,rr=r.getBoundingClientRect(),t=r.querySelector('table').getBoundingClientRect(),th=r.querySelector('thead').getBoundingClientRect(),rows=[...r.querySelectorAll('tbody tr')].map(x=>x.getBoundingClientRect().height);
  const top=t.top-rr.top,fim=rr.bottom-t.bottom;cont.innerHTML=tabHTML(b,{ini:0,fim:1,primeiro:false,ultimo:false});const r2=cont.firstElementChild,rr2=r2.getBoundingClientRect(),t2=r2.querySelector('table').getBoundingClientRect();
  return{top,fim,head:th.height,rows,top2:t2.top-rr2.top,fim2:rr2.bottom-t2.bottom}};
 const pages=[[]],marcas=[];let used=0;
 const nova=()=>{if(pages.at(-1).length){pages.push([]);used=0}},por=(h,a)=>{pages.at(-1).push(h);used+=a};
 const minAlt=b=>{if(b.k==='tab'){const t=medTab(b);return t.top+t.head+(t.rows[0]||0)+t.fim2}return alt(blHTML(b))};
 for(let i=0;i<B.length;i++){const b=B[i];
  if(b.k==='h1'||b.k==='h2'){const h=alt(blHTML(b)),nx=B[i+1],hn=nx?(nx.k==='h2'?alt(blHTML(nx))+(B[i+2]?minAlt(B[i+2]):0):minAlt(nx)):0;if(used>0&&used+h+hn>HP)nova();marcas.push({b,pg:pages.length-1});por(blHTML(b),h);continue}
  if(b.k==='tab'){const t=medTab(b),n=b.rows.length;let i0=0,primeiro=true;
   if(used>0&&n){const tot=t.top+t.head+t.rows.reduce((x,y)=>x+y,0)+t.fim;if(used+tot>HP&&tot<=HP*.45)nova()}
   while(i0<n||(n===0&&primeiro)){const top=primeiro?t.top:t.top2;let j=i0,h=top+t.head;
    if(used>0&&used+top+t.head+(t.rows[i0]||0)+(primeiro?t.fim:t.fim2)>HP){nova();continue}
    while(j<n&&used+h+t.rows[j]+(j===n-1?t.fim:t.fim2)<=HP){h+=t.rows[j];j++}
    if(j===i0&&n>0)h+=t.rows[j++];const ultimo=j>=n;h+=ultimo?t.fim:t.fim2;
    por(tabHTML(b,{ini:i0,fim:j,primeiro,ultimo}),h);if(!ultimo)nova();i0=j;primeiro=false;if(n===0)break}
   continue}
  const h=alt(blHTML(b));if(used>0&&used+h>HP)nova();por(blHTML(b),h)}
 return{pages,marcas}}

/* ---- documento completo ---- */
function relMontar(c=relContexto()){
 const B=abntBlocos(c),{pages,marcas}=paginar(B),capa=REL.capa!==0,sumOn=REL.sumario!==0,ent=marcas.length,sumPg=sumOn?Math.max(1,Math.ceil(ent/34)):0,pre=(capa?1:0)+sumPg,ano=REL.ano||new Date().getFullYear();
 const cap=capa?`<section class="folha capa"><div class="cont"><div class="c-top">${REL.logo?`<img class="rlogo" src="${REL.logo}" alt="Logotipo">`:''}${esc(REL.inst||'')}${REL.inst&&REL.unidade?'<br>':''}${esc(REL.unidade||'')}</div><div>${esc(REL.autor||'')}</div><div class="c-tit"><b>${esc(REL.titulo||'Relatório')}</b>${REL.sub?`<br>${esc(REL.sub)}`:''}</div><div class="c-rod">${esc(REL.local||'')}<br>${esc(ano)}${REL.data?`<br><span style="font-size:10pt">${esc(REL.data)}</span>`:''}</div></div></section>`:'';
 const lis=marcas.map(m=>{const b=m.b;return`<li class="${b.k==='h1'?'n1':'n2'}"><span>${b.sn?'':b.num+' '}${esc(b.txt)}</span><span class="sd"></span><span class="sp">${pre+m.pg+1}</span></li>`});
 const sum=sumOn?Array.from({length:sumPg},(_,k)=>`<section class="folha sum"><div class="cont">${k?'':'<h1>Sumário</h1>'}<ol class="sumario">${lis.slice(k*34,(k+1)*34).join('')}</ol></div></section>`).join(''):'';
 const corpo=pages.map((p,i)=>`<section class="folha" data-p="${pre+i+1}"><div class="pn">${pre+i+1}</div><div class="cont">${p.join('')}</div></section>`).join('');
 return`<div class="folhas" style="--fn:'${esc(REL.fonte||'Times New Roman')}';--tam:${REL.tam||12};--esp:${REL.esp||1.5}">${cap}${sum}${corpo}</div>`}
function relZoom(){const p=$('rpaper'),f=p.querySelector('.folhas');if(!f)return;const z=Math.min(1,(p.clientWidth-14)/(21*CM));f.style.zoom=z>0?z:1}
function relRender(){$('rpaper').innerHTML=relMontar();relZoom()}
function imprimirRel(){const p=$('rep');p.className='';p.innerHTML=relMontar();window.print()}
function relHTMLArquivo(){dlf('relatorio_geocrime.html',`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(REL.titulo)}</title><style>${ABNT_CSS}</style></head><body class="exp">${relMontar()}</body></html>`,'text/html')}
window.addEventListener('resize',()=>{if(typeof VISTA!=='undefined'&&VISTA==='rel')relZoom()});
