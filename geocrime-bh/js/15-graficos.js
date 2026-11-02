/* ===== agregações e gráficos (SVG/HTML) usados pelo dashboard e pelo relatório =====
   Tudo é desenhado sem bibliotecas; as cores vêm de um objeto de tema para servir à tela (escuro) e ao papel (claro). */
const NAT=['Roubo','Furto','Veiculos','CVLI'],DSEM=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const TH_ESC={fg:'#e8edf7',mu:'#8a97b2',grade:'#1f2d4d',ac:'124,140,255',acc:'#7c8cff'},TH_CLARO={fg:'#0f172a',mu:'#64748b',grade:'#cbd5e1',ac:'91,108,245',acc:'#5b6cf5'};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nfmt=n=>Math.round(n).toLocaleString('pt-BR'),pctTxt=p=>(p>.5?'▲ ':p<-.5?'▼ ':'')+Math.abs(p).toFixed(1).replace('.',',')+'%';
const ICN={list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',act:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>'};
const ico=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICN[n]}</svg>`;
const nice=v=>{const e=10**Math.floor(Math.log10(v)),f=v/e;return(f<=1?1:f<=2?2:f<=5?5:10)*e};
const semDados=m=>`<div class="vazio">${esc(m)}</div>`;

/* ---- agregação: tudo o que o dashboard e o relatório mostram ---- */
function agregar(o={}){
 const base=o.escopo==='base'?S.all:S.f,P=o.dias?base.filter(p=>p.ago<o.dias):base;
 const A={P,n:P.length,ig:0,rec:0,pre:0,recIG:0,preIG:0,nat:{},natIG:{},hora:Array(24).fill(0),sem:Array.from({length:7},()=>Array(24).fill(0)),reg:RG.map(()=>({n:0,ig:0,rec:0,pre:0})),semData:!P.length||P.every(p=>p.ago===0)};
 NAT.forEach(k=>{A.nat[k]=0;A.natIG[k]=0});const mm=new Map(),lm=new Map();
 for(const p of P){const w=T[p.t].w;A.ig+=w;A.nat[p.t]++;A.natIG[p.t]+=w;A.hora[p.h]++;if(!A.semData)A.sem[wdOf(p)][p.h]++;
  const r=A.reg[p.r],isR=p.ago<30,isP=p.ago>=30&&p.ago<60;r.n++;r.ig+=w;if(isR){A.rec++;A.recIG+=w;r.rec++}if(isP){A.pre++;A.preIG+=w;r.pre++}
  let m=mm.get(p.ym);if(!m)mm.set(p.ym,m={ym:p.ym,v:{Roubo:0,Furto:0,Veiculos:0,CVLI:0},ig:0});m.v[p.t]++;m.ig+=w;
  if(p.b!=='Malha urbana'&&p.b!=='Ponto importado'){let l=lm.get(p.b);if(!l)lm.set(p.b,l={n:p.b,c:0,ig:0,rec:0,pre:0,x:0,y:0});l.c++;l.ig+=w;l.x+=p.x;l.y+=p.y;if(isR)l.rec++;if(isP)l.pre++}}
 A.meses=[...mm.values()].sort((a,b)=>a.ym-b.ym).map(m=>({...m,k:mlb(m.ym),tot:NAT.reduce((a,k)=>a+m.v[k],0)}));
 A.locs=[...lm.values()].sort((a,b)=>b.ig-a.ig);
 let bs=0,bv=-1;for(let i=0;i<24;i++){const v=A.hora[i]+A.hora[(i+1)%24]+A.hora[(i+2)%24];if(v>bv){bv=v;bs=i}}A.pico={txt:`${bs}h–${(bs+3)%24}h`,pct:A.n?Math.round(bv/A.n*100):0};
 const dt=A.sem.map(l=>l.reduce((a,b)=>a+b,0)),di=dt.indexOf(Math.max(...dt));A.dia={nome:DIAS[di],pct:A.n&&!A.semData?Math.round(dt[di]/A.n*100):0};
 const ri=A.reg.reduce((b,r,i)=>r.ig>A.reg[b].ig?i:b,0);A.regTop={i:ri,nome:RG[ri].n,pct:A.ig?Math.round(A.reg[ri].ig/A.ig*100):0};
 const nk=NAT.reduce((b,k)=>A.nat[k]>A.nat[b]?k:b,'Roubo');A.natTop={k:nk,nome:nm(nk),pct:A.n?Math.round(A.nat[nk]/A.n*100):0};
 A.dRec=A.pre>=10?(A.rec-A.pre)/A.pre*100:null;A.dIG=A.preIG>=10?(A.recIG-A.preIG)/A.preIG*100:null;
 const sz=RG.map(()=>A.meses.map(()=>0));P.forEach(p=>{const k=A.meses.findIndex(m=>m.ym===p.ym);if(k>=0)sz[p.r][k]+=T[p.t].w});A.sazon=sz;
 return A}
const dcls=d=>d==null?'nt':Math.abs(d)<.5?'nt':d>0?'up':'dn',dtxt=d=>d==null?'sem base 30 d':pctTxt(d)+' vs 30d';
function filtrosTxt(){const f=[['fr','região'],['ft','natureza'],['fm','mês'],['fe','época do mês'],['fp','turno']].filter(([i])=>$(i).value!=='').map(([i,l])=>`${l}: ${$(i).selectedOptions[0].text}`);return f.length?f.join('; '):'sem filtros'}

/* ---- gráficos ---- */
const legendaNat=()=>`<div class="lgd">${NAT.map(k=>`<span><i style="background:${T[k].c}"></i>${esc(nm(k))}</span>`).join('')}</div>`;
function svgEvolucao(A,th){
 if(A.semData||!A.meses.length)return semDados('O arquivo não tem datas: a evolução mensal não pode ser calculada.');
 const W=640,H=250,m={l:46,r:10,t:16,b:30},iw=W-m.l-m.r,ih=H-m.t-m.b,mx=nice(Math.max(1,...A.meses.map(x=>x.tot))),n=A.meses.length,sl=iw/n,bw=Math.min(48,sl*.66);let g='';
 for(let i=0;i<=4;i++){const y=m.t+ih-ih*i/4;g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y}" y2="${y}" stroke="${th.grade}"/><text x="${m.l-6}" y="${y+4}" text-anchor="end" font-size="10" fill="${th.mu}">${nfmt(mx*i/4)}</text>`}
 A.meses.forEach((x,i)=>{let y=m.t+ih;const cx=m.l+sl*i+sl/2;NAT.forEach(k=>{const h=ih*x.v[k]/mx;y-=h;if(h>0)g+=`<rect x="${cx-bw/2}" y="${y}" width="${bw}" height="${h}" fill="${T[k].c}"><title>${esc(x.k)} · ${esc(nm(k))}: ${x.v[k]}</title></rect>`});
  g+=`<text x="${cx}" y="${y-4}" text-anchor="middle" font-size="9.5" font-weight="600" fill="${th.fg}">${nfmt(x.tot)}</text>`;if(n<=14||i%2===0)g+=`<text x="${cx}" y="${H-10}" text-anchor="middle" font-size="10" fill="${th.mu}">${esc(x.k.replace(' de ','/'))}</text>`});
 return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Registros por mês, empilhados por natureza" style="width:100%;height:auto;display:block">${g}</svg>`+legendaNat()}
function svgDonut(A,th){
 if(!A.n)return semDados('Sem registros.');const R=54,C=2*Math.PI*R;let off=0,g='';
 NAT.forEach(k=>{const v=A.nat[k];if(!v)return;const l=C*v/A.n;g+=`<circle r="${R}" cx="80" cy="80" fill="none" stroke="${T[k].c}" stroke-width="22" stroke-dasharray="${l} ${C-l}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><title>${esc(nm(k))}: ${nfmt(v)}</title></circle>`;off+=l});
 return`<div class="dnt"><svg viewBox="0 0 160 160" role="img" aria-label="Distribuição por natureza" style="width:150px;height:150px;flex:none">${g}<text x="80" y="78" text-anchor="middle" font-size="22" font-weight="800" fill="${th.fg}">${nfmt(A.n)}</text><text x="80" y="95" text-anchor="middle" font-size="10" fill="${th.mu}">registros</text></svg>
 <ul class="lg2">${NAT.map(k=>`<li><i style="background:${T[k].c}"></i><span>${esc(nm(k))}</span><b>${nfmt(A.nat[k])}</b><small>${(A.nat[k]/A.n*100).toFixed(1).replace('.',',')}%</small></li>`).join('')}</ul></div>`}
function svgHeat(A,th){
 if(A.semData)return semDados('O arquivo não tem datas: não há como separar por dia da semana.');
 const W=640,H=230,m={l:34,t:8,b:22,r:6},cw=(W-m.l-m.r)/24,ch=(H-m.t-m.b)/7,mx=Math.max(1,...A.sem.flat());let g='';
 A.sem.forEach((l,d)=>l.forEach((v,h)=>{g+=`<rect x="${m.l+h*cw+1}" y="${m.t+d*ch+1}" width="${cw-2}" height="${ch-2}" rx="3" fill="rgba(${th.ac},${(.07+.93*v/mx).toFixed(2)})"><title>${DSEM[d]} ${h}h: ${v}</title></rect>`}));
 DSEM.forEach((n,d)=>g+=`<text x="${m.l-6}" y="${m.t+d*ch+ch/2+4}" text-anchor="end" font-size="10" fill="${th.mu}">${n}</text>`);
 for(let h=0;h<24;h+=3)g+=`<text x="${m.l+h*cw+cw/2}" y="${H-6}" text-anchor="middle" font-size="10" fill="${th.mu}">${h}h</text>`;
 return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Registros por dia da semana e hora" style="width:100%;height:auto;display:block">${g}</svg>`}
function svgHoras(A,th){if(!A.n)return semDados('Sem registros.');const W=640,H=130,m={l:30,t:8,b:20,r:6},bw=(W-m.l-m.r)/24,mx=Math.max(1,...A.hora);let g='';
 A.hora.forEach((v,h)=>{const bh=(H-m.t-m.b)*v/mx;g+=`<rect x="${m.l+h*bw+2}" y="${H-m.b-bh}" width="${bw-4}" height="${bh}" rx="2" fill="${th.acc}"><title>${h}h: ${v}</title></rect>`});
 for(let h=0;h<24;h+=3)g+=`<text x="${m.l+h*bw+bw/2}" y="${H-5}" text-anchor="middle" font-size="10" fill="${th.mu}">${h}h</text>`;
 return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Registros por hora" style="width:100%;height:auto;display:block">${g}</svg>`}
function htmlBarrasH(items,fmt,cor){if(!items.length)return semDados('Sem dados.');const mx=Math.max(1e-9,...items.map(i=>Math.abs(i.v)));
 return`<div class="hb">${items.map(i=>`<div class="hbr"${i.att||''}><span class="hbn">${esc(i.n)}</span><span class="hbb"><i style="width:${(Math.abs(i.v)/mx*100).toFixed(1)}%;background:${i.c||cor}"></i></span><span class="hbv">${fmt(i.v)}${i.sub?` <small>${i.sub}</small>`:''}</span></div>`).join('')}</div>`}
function htmlSazon(A,th){if(A.semData||!A.meses.length)return semDados('O arquivo não tem datas: a sazonalidade não pode ser calculada.');
 return`<div class="sz"><table><tr><th></th>${A.meses.map(m=>`<th>${esc(m.k.slice(0,3))}</th>`).join('')}</tr>${RG.map((r,i)=>{const mx=Math.max(1,...A.sazon[i]),pk=A.sazon[i].indexOf(Math.max(...A.sazon[i]));return`<tr><td>${esc(r.n)}</td>${A.sazon[i].map((v,k)=>`<td style="background:rgba(${th.ac},${(.06+.9*v/mx).toFixed(2)});${k===pk?`outline:1.5px solid ${th.fg};outline-offset:-1.5px`:''}" title="${esc(r.n)} · ${esc(A.meses[k].k)}: IG ${nfmt(v)}">&nbsp;</td>`).join('')}</tr>`}).join('')}</table></div>`}
/* imagem do mapa (sem mapa base, para não "contaminar" o canvas) */
const SNAP={};
function snapImg(tipo){const key=[tipo,S.ver,S.pm?S.pm.n+S.pm.W+S.pm.metodo.id:'',S.rt?S.rt.q.length:'',S.cl?S.cl.length:''].join('|');if(SNAP[tipo]&&SNAP[tipo].k===key)return SNAP[tipo].u;
 const w=900,h=620,bb=S.bb,pad=2500,s=Math.min(w/(bb[2]-bb[0]+pad),h/(bb[3]-bb[1]+pad)),V={s,ox:w/2-(bb[0]+bb[2])/2*s,oy:h/2+(bb[1]+bb[3])/2*s},c=document.createElement('canvas');
 if(tipo==='pred'){if(!S.pm)return'';pDrawOn(c,V,{w,h,d:1,tiles:false})}else drawOn(c,V,{w,h,d:1,tiles:false,semRotas:tipo==='occ'});
 const u=c.toDataURL('image/png');SNAP[tipo]={k:key,u};return u}
