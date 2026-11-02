function bench(){const P=S.f;if(P.length<50){$('bmr').textContent='Poucos pontos para medir.';return}
 const Q=500,k=+$('k').value,R=+$('R').value,qs=Array.from({length:Q},()=>P[Math.random()*P.length|0]);
 const bk=q=>{const b=[];for(const p of P){const d=(p.x-q.x)**2+(p.y-q.y)**2;if(b.length<k||d<b[b.length-1].d){b.push({p,d});b.sort((a,c)=>a.d-c.d);if(b.length>k)b.pop()}}return b};
 const br=q=>{const o=[];for(const p of P)if((p.x-q.x)**2+(p.y-q.y)**2<=R*R)o.push(p);return o};
 const tm=f=>{const t=performance.now(),r=qs.map(f);return[performance.now()-t,r]};
 tm(q=>S.qt.knn(q.x,q.y,k,[],{v:0}));
 const s1={v:0},s2={v:0},[t1,r1]=tm(q=>S.qt.knn(q.x,q.y,k,[],s1)),[t2,r2]=tm(bk),[t3,r3]=tm(q=>S.qt.rng(q.x,q.y,R,[],s2)),[t4,r4]=tm(br);
 const ok=r1.every((a,i)=>a.length===r2[i].length&&a.every((o,j)=>Math.abs(o.d-r2[i][j].d)<1e-6))&&r3.every((a,i)=>a.length===r4[i].length);
 const sp=(a,b)=>f1(b/Math.max(a,.001))+'×';
 $('bmr').innerHTML=`<table><tr><th>${P.length.toLocaleString('pt-BR')} pts</th><th>QuadTree</th><th>Linear</th><th>Ganho</th></tr>
 <tr><td>k-NN (k=${k})</td><td>${f1(t1)} ms</td><td>${f1(t2)} ms</td><td><b>${sp(t1,t2)}</b></td></tr>
 <tr><td>Raio ${R} m</td><td>${f1(t3)} ms</td><td>${f1(t4)} ms</td><td><b>${sp(t3,t4)}</b></td></tr></table>
 <div style="margin-top:4px">Nós visitados por consulta: ~${Math.round(s1.v/Q)} (k-NN) e ~${Math.round(s2.v/Q)} (raio), contra ${P.length.toLocaleString('pt-BR')} pontos na varredura. Resultados idênticos: ${ok?'✓':'✗'}.</div>`}


const tbl=(H,R)=>'<table><tr>'+H.map(h=>`<th>${h}</th>`).join('')+'</tr>'+R.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('')+'</table>';
function alloc(){if(!S.f.length){$('pp').textContent='Sem dados para os filtros.';return}
 const R=Math.max(200,+$('PR').value|0),cvv=+$('cv').value||1,cV=+$('cvtr').value||0,cP=+$('cpm').value||0,ls=[...S.lv].sort((a,b)=>b.n-a.n),N=RG.reduce((a,r)=>a+r.b,0);
 const nv=[];for(const l of ls){if(nv.length>=N)break;const c={x:(l.x0+l.x1)/2,y:(l.y0+l.y1)/2};if(nv.every(b=>Math.hypot(b.x-c.x,b.y-c.y)>=.7*R))nv.push(c)}
 const cand=ls.slice(0,800).map(l=>{const c=cen(l);return{...c,r:reg(c.x,c.y)}}),cl=cand.map(c=>S.qt.rng(c.x,c.y,R,[],{v:0}).map(p=>p.j)),w=S.f.map(p=>T[p.t].w),cov=new Uint8Array(S.f.length),gr=[];
 for(let q=0;q<Math.max(0,...RG.map(r=>r.b));q++)RG.forEach((rg,ri)=>{if(q>=rg.b)return;let bi=-1,bg=0;
  cl.forEach((a,i)=>{if(cand[i].r!==ri)return;let s=0;for(const j of a)if(!cov[j])s+=w[j];if(s>bg){bg=s;bi=i}});
  if(bi<0)return;gr.push({...cand[bi],vtr:rg.v/rg.b,pm:rg.p/rg.b});cl[bi].forEach(j=>cov[j]=1)});
 const dem=gr.map(()=>0);S.f.forEach(p=>{let bi=-1,bd=R*R;gr.forEach((b,i)=>{const d=(b.x-p.x)**2+(b.y-p.y)**2;if(d<=bd){bd=d;bi=i}});if(bi>=0)dem[bi]++});
 gr.forEach((b,i)=>{b.dem=dem[i]/S.nm;b.cap=b.vtr*cvv;b.ov=b.dem>b.cap});
 const a=coverOf(nv,R),c=coverOf(gr,R),ov=gr.filter(b=>b.ov).length,cost=RG.reduce((s,r)=>s+r.v*cV+r.p*cP,0),att=c[0]/100*S.f.length/S.nm;
 S.posts=gr;S.postR=R;S.last={cw:c[1],ov};
 const H1=['Estratégia','Bases','Cobertura','Pond.'],R1=[['Células mais cheias (original)',nv.length,f1(a[0])+'%',f1(a[1])+'%'],['Máx. cobertura por região',gr.length,f1(c[0])+'%',f1(c[1])+'%']];
 const H2=['Base','Região','Dem./mês','Cap./mês','Uso'],R2=gr.map((b,i)=>[i+1,RG[b.r].n,Math.round(b.dem),Math.round(b.cap),Math.round(b.dem/Math.max(b.cap,1e-9)*100)+'%']);
 S.rep.cobertura={h:H1,r:R1};S.rep.bases={h:H2,r:R2};
 $('pp').innerHTML=tbl(H1,R1)+`<div style="margin:4px 0">Custo mensal: <b>R$ ${cost.toLocaleString('pt-BR')}</b> · por registro coberto/mês: <b>R$ ${att?Math.round(cost/att).toLocaleString('pt-BR'):'—'}</b></div>`+(ov?`<div class="warn">⚠ ${ov} base(s) acima da capacidade de atendimento (círculos vermelhos). Considere redistribuir.</div>`:'<div>Nenhuma base sobrecarregada.</div>')+'<div style="max-height:150px;overflow:auto">'+tbl(H2,R2)+'</div>';draw()}

/* ===== v3: regiões, datas, filtros ===== */
const RG=[['Centro-Sul',-19.940,-43.935,10,.2],['Leste',-19.915,-43.910,2,-.3],['Nordeste',-19.880,-43.915,5,.4],['Noroeste',-19.905,-43.985,7,.1],['Norte',-19.830,-43.915,0,.3],['Oeste',-19.955,-43.985,8,-.2],['Pampulha',-19.855,-43.975,11,0],['Barreiro',-19.985,-44.020,4,.5],['Venda Nova',-19.815,-43.950,6,-.4]]
 .map(r=>({n:r[0],pk:r[3],tr:r[4],b:3,v:6,p:30,c:25,x:(r[2]-LNG0)*KX,y:(r[1]-LAT0)*KY}));
const reg=(x,y)=>{if(GEO.R){const i=geoLocate(GEO.R,x,y);if(i>=0)return i}let b=0,bd=1e18;RG.forEach((c,i)=>{const d=(c.x-x)**2+(c.y-y)**2;if(d<bd){bd=d;b=i}});return b};
$('fr').innerHTML+=RG.map((r,i)=>`<option value="${i}">${r.n}</option>`).join('');
const pass=(d,nm)=>{const t=$('ft').value,p=$('fp').value,r=$('fr').value,e=$('fe').value,m=$('fm').value;return(!t||d.t===t)&&inPer(d.h,p)&&(r===''||d.r===+r)&&(nm||!m||d.ym===+m)&&(!e||(e==='i'?d.dm<=10:e==='m'?d.dm>10&&d.dm<=20:d.dm>20))};
const bboxOf=P=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const p of P){a=Math.min(a,p.x);b=Math.min(b,p.y);c=Math.max(c,p.x);d=Math.max(d,p.y)}return[a,b,c,d]};
const mkQT=()=>new QT(...S.box,(x,y)=>RG[reg(x,y)].c,+$('dep').value);
S.rep={};
function buildMonths(){const ms=[...new Set(S.all.map(p=>p.ym))].sort((a,b)=>a-b),o=ms.map(y=>`<option value="${y}">${mlb(y)}</option>`).join('');S.ms=ms;
 $('fm').innerHTML='<option value="">Todos os meses</option>'+o;$('ca').innerHTML=$('cb').innerHTML=o;$('ca').value=ms[Math.max(0,ms.length-2)];$('cb').value=ms[ms.length-1]}
function topSpots(n,R,bx){const out=[],sc=S.lv.filter(l=>{if(!bx)return true;const c=cen(l);return bx.has?bx.has(c.x,c.y):c.x>=bx.x0&&c.x<bx.x1&&c.y>=bx.y0&&c.y<bx.y1}).map(l=>{const c=cen(l),a=S.qt.rng(c.x,c.y,R,[],{v:0});return{...c,s:wsum(a),n:a.length}}).sort((a,b)=>b.s-a.s);
 for(const c of sc){if(out.length>=n)break;if(out.every(o=>Math.hypot(o.x-c.x,o.y-c.y)>=2*R))out.push(c)}
 for(const o of out){const q=S.qt.knn(o.x,o.y,1,[],{v:0})[0];o.b=q?q.p.b:'—';o.r=S.mean?o.s/(Math.PI*R*R)/S.mean:0}return out}
function regStats(){const D=RG.map(()=>({n:0,s:0}));S.f.forEach(p=>{const q=D[p.r];q.n++;q.s+=T[p.t].w});return D}
function extras(){S.nm=Math.max(1,new Set(S.f.map(p=>p.ym)).size);delete S.rep.cobertura;delete S.rep.bases;
 const sat=S.lv.filter(l=>l.d>=l.md&&l.n>l.cap),by={};sat.forEach(l=>{const r=RG[reg((l.x0+l.x1)/2,(l.y0+l.y1)/2)].n;by[r]=(by[r]||0)+l.n});
 $('al').innerHTML=sat.length?`<div class="warn">⚠ <b>${sat.length}</b> célula(s) saturada(s): atingiram a profundidade máxima e ainda excedem o limite (${sat.reduce((a,l)=>a+l.n,0)} registros sem subdivisão). Regiões: ${Object.entries(by).map(([r,n])=>`${r} (${n})`).join(', ')}. Aumente a profundidade ou o limite da região.</div>`:'';
 regTable();matrix();$('pp').textContent='Filtros alterados: recalcule a distribuição das bases.'}
function regTable(){const D=regStats(),W=S.W||1,ss=D.map(d=>d.s).sort((a,b)=>a-b),n=ss.length,q=p=>ss[Math.min(n-1,Math.floor(n*p))],cl=s=>s>=q(.78)?'Crítica':s>=q(.45)?'Alta':s>=q(.223)?'Média':'Baixa';
 const nf=(i,k,l)=>`<label class="nf"><small>${l}</small><input type="number" min="0" data-i="${i}" data-k="${k}" value="${RG[i][k]}"></label>`,tot=k=>RG.reduce((a,r)=>a+r[k],0);
 $('rt').innerHTML=RG.map((r,i)=>{const c=cl(D[i].s);return`<div class="rg-c" data-r="${i}"><div class="rg-h"><span class="rn" title="Filtrar por esta região">${r.n}</span><span class="rg-k k-${c[0]}">${c}</span></div><div class="rg-m"><b>${D[i].n.toLocaleString('pt-BR')}</b> registros · <b>${Math.round(D[i].s/W*100)}%</b> da gravidade</div><div class="rg-i">${nf(i,'b','Bases')}${nf(i,'v','VTR')}${nf(i,'p','PM')}${nf(i,'c','Limite')}</div></div>`}).join('')+
  `<div class="rg-tot"><b>Totais</b> · ${tot('b')} bases · ${tot('v')} VTR · ${tot('p')} PM</div>`;
 $('rt').querySelectorAll('input').forEach(e=>e.onchange=()=>{RG[+e.dataset.i][e.dataset.k]=Math.max(0,+e.value);if(e.dataset.k==='c')rebuild();else $('rt').querySelector('.rg-tot').innerHTML=`<b>Totais</b> · ${tot('b')} bases · ${tot('v')} VTR · ${tot('p')} PM`});
 $('rt').querySelectorAll('.rn').forEach(e=>e.onclick=()=>{$('fr').value=e.closest('[data-r]').dataset.r;$('fr').onchange()})}
function matrix(){const ms=S.ms||[],M=RG.map(()=>ms.map(()=>0));S.all.forEach(p=>{if(pass(p,1)){const k=ms.indexOf(p.ym);if(k>=0)M[p.r][k]+=T[p.t].w}});
 const pk=M.map(r=>{const m=Math.max(...r);return r.indexOf(m)});
 S.rep.sazon={h:['Região','Mês de pico','IG no pico'],r:RG.map((r,i)=>[r.n,mlb(ms[pk[i]]||0),M[i][pk[i]]|0])};
 $('mx').innerHTML='<table style="border-collapse:collapse;font-size:10px;width:100%"><tr><td></td>'+ms.map(y=>`<td style="text-align:center">${mlb(y).slice(0,3)}</td>`).join('')+'</tr>'+RG.map((r,i)=>{const mx=Math.max(1,...M[i]);return`<tr><td>${r.n.slice(0,9)}</td>`+M[i].map((v,k)=>`<td style="background:rgba(239,68,68,${(v/mx*.85).toFixed(2)});${k===pk[i]?'outline:1px solid var(--fg)':''}" title="${v}">&nbsp;</td>`).join('')+'</tr>'}).join('')+'</table><div style="margin-top:4px">Pico por região: '+S.rep.sazon.r.map(r=>`${r[0]} (${r[1]})`).join(', ')+'</div>'}

/* ===== v3: redistribuição ===== */
function lrm(tot,sh){const q=sh.map(x=>x*tot),b=q.map(Math.floor),r=tot-b.reduce((a,c)=>a+c,0);q.map((v,i)=>[v-b[i],i]).sort((a,c)=>c[0]-a[0]).slice(0,r).forEach(([,i])=>b[i]++);return b}
function redistrib(){if(!S.W){$('rd').textContent='Sem dados.';return}const D=regStats(),sh=D.map(d=>d.s/S.W),sug={};
 for(const k of['b','v','p'])sug[k]=lrm(RG.reduce((a,r)=>a+r[k],0),sh);
 const dl=(a,b)=>`${a}→${b} (${b-a>=0?'+':''}${b-a})`,H=['Região','Bases','VTR','PM'],R_=RG.map((r,i)=>[r.n,...['b','v','p'].map(k=>dl(r[k],sug[k][i]))]);
 S.rep.redistribuicao={h:H,r:R_};$('rd').innerHTML=`<div class="res">Distribui o efetivo total proporcionalmente ao IG de cada região (filtros ativos).${tbl(H,R_)}<button id="ap" class="pri" style="width:100%;margin-top:6px">Aplicar redistribuição</button></div>`;
 $('ap').onclick=()=>{alloc();const a=S.last;RG.forEach((r,i)=>{for(const k of['b','v','p'])r[k]=sug[k][i]});regTable();alloc();const b=S.last;$('rd').innerHTML=`<div class="res"><b>Antes → depois</b><br>Cobertura ponderada: ${f1(a.cw)}% → <b>${f1(b.cw)}%</b><br>Bases sobrecarregadas: ${a.ov} → <b>${b.ov}</b><br>Bases reposicionadas no mapa.</div>`}}

/* ===== v3: comparar períodos ===== */
function cmpRun(){const A=+$('ca').value,B=+$('cb').value;if(A===B){$('cr').textContent='Escolha dois meses diferentes.';return}
 const pa=S.all.filter(d=>pass(d,1)&&d.ym===A),pb=S.all.filter(d=>pass(d,1)&&d.ym===B),q=mkQT();pa.concat(pb).forEach(p=>q.ins(p));
 const lv=q.leaves([]).map(l=>{const a=l.pts.filter(p=>p.ym===A).length;return{l,d:l.pts.length-2*a}});S.cmp={lv,mx:Math.max(1,...lv.map(o=>Math.abs(o.d)))};
 const ra=RG.map(()=>0),rb=RG.map(()=>0);pa.forEach(p=>ra[p.r]++);pb.forEach(p=>rb[p.r]++);
 const dl=RG.map((r,i)=>rb[i]-ra[i]),up=dl.indexOf(Math.max(...dl)),dn=dl.indexOf(Math.min(...dl)),H=['Região',mlb(A),mlb(B),'Δ'],R_=RG.map((r,i)=>[r.n,ra[i],rb[i],(dl[i]>=0?'+':'')+(ra[i]?Math.round(dl[i]/ra[i]*100)+'%':'—')]);
 S.rep.comparacao={h:H,r:R_};$('cr').innerHTML=`Total: ${pa.length} → ${pb.length}. Vermelho = aumentou, azul = diminuiu.`+tbl(H,R_)+`<div>Maior alta: <b>${RG[up].n}</b> (${dl[up]>=0?'+':''}${dl[up]}). Maior queda: <b>${RG[dn].n}</b> (${dl[dn]}).</div>`;draw()}
function cmpDraw(g,X,Y,s){for(const o of S.cmp.lv){if(!o.d)continue;const l=o.l,k=Math.abs(o.d)/S.cmp.mx;g.fillStyle=o.d>0?`rgba(239,68,68,${.15+.6*k})`:`rgba(59,130,246,${.15+.6*k})`;g.fillRect(X(l.x0),Y(l.y1),(l.x1-l.x0)*s,(l.y1-l.y0)*s)}}

