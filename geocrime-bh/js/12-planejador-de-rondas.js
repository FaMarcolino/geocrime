/* ===== v9: planejador de rondas por viatura =====
   Para cada quadrante: escolhe as manchas críticas, divide entre as viaturas (k-médias), ordena cada percurso com o
   tempo de viagem real (matriz OSRM; 2-opt), sai e volta da base, e retira paradas de menor IG até caber no turno. */
const rotaCor=i=>`hsl(${(i*137+10)%360},72%,${i%2?50:42}%)`;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* quadrantes: regiões (polígonos), quadrantes importados ou grade n×n. Cada um tem pts() e has(x,y) */
function quadrantes(){const m=$('rq').value;
 if(m==='reg'&&GEO.R)return GEO.R.feats.map((f,i)=>({nome:RG[i]?RG[i].n:f.nome,reg:i,poly:f,x0:f.bbox[0],y0:f.bbox[1],x1:f.bbox[2],y1:f.bbox[3],has:(x,y)=>reg(x,y)===i,pts:()=>S.f.filter(p=>p.r===i)}));
 if(m==='qd'&&GEO.Q)return GEO.Q.feats.map(f=>({nome:f.nome,poly:f,x0:f.bbox[0],y0:f.bbox[1],x1:f.bbox[2],y1:f.bbox[3],has:(x,y)=>geoIn(f,x,y),pts:()=>S.qt.rect(f.bbox[0],f.bbox[1],f.bbox[2],f.bbox[3],[]).filter(p=>geoIn(f,p.x,p.y))}));
 const n=[2,3,4].includes(+m)?+m:3,[a,b,c,d]=S.bb,w=(c-a)/n,h=(d-b)/n,o=[];
 for(let j=n-1;j>=0;j--)for(let i=0;i<n;i++){const q={x0:a+i*w,x1:i===n-1?c+1:a+(i+1)*w,y0:b+j*h,y1:j===n-1?d+1:b+(j+1)*h};q.has=(x,y)=>x>=q.x0&&x<q.x1&&y>=q.y0&&y<q.y1;q.pts=()=>S.qt.rect(q.x0,q.y0,q.x1,q.y1,[]);o.push(q)}
 const CP={2:['NO','NE','SO','SE'],3:['NO','N','NE','O','C','L','SO','S','SE']};o.forEach((q,k)=>q.nome='Q'+(k+1)+(CP[n]?' · '+CP[n][k]:''));return o}

/* base (posto) mais adequada: a mais próxima do centro das paradas, preferindo as que ficam dentro do quadrante */
function baseDe(q,spots){const B=S.posts||[];if(!B.length||!spots.length)return null;
 const cx=spots.reduce((a,s)=>a+s.x,0)/spots.length,cy=spots.reduce((a,s)=>a+s.y,0)/spots.length;let best=null,bd=1e18;
 for(const b of B){const d=Math.hypot(b.x-cx,b.y-cy)*(q&&q.has&&!q.has(b.x,b.y)?3:1);if(d<bd){bd=d;best=b}}
 return best?{x:best.x,y:best.y,nome:'Base '+(B.indexOf(best)+1)}:null}

/* k-médias ponderado pelo IG (inicialização determinística) com teto de paradas por grupo */
function agrupar(spots,k,cap){
 if(spots.length<=k)return spots.map(s=>[s]);if(k<=1)return[spots.slice()];
 const cs=[spots[0]];while(cs.length<k){let bi=null,bd=-1;for(const s of spots){const d=Math.min(...cs.map(c=>Math.hypot(c.x-s.x,c.y-s.y)));if(d>bd){bd=d;bi=s}}cs.push(bi)}
 let cent=cs.map(c=>({x:c.x,y:c.y})),G=[];
 for(let it=0;it<15;it++){G=cent.map(()=>[]);for(const s of spots){let b=0,bd=1e18;cent.forEach((c,i)=>{const d=(c.x-s.x)**2+(c.y-s.y)**2;if(d<bd){bd=d;b=i}});G[b].push(s)}
  cent=cent.map((c,i)=>{const g=G[i];if(!g.length)return c;const w=g.reduce((a,s)=>a+(s.s||1),0);return{x:g.reduce((a,s)=>a+s.x*(s.s||1),0)/w,y:g.reduce((a,s)=>a+s.y*(s.s||1),0)/w}})}
 for(let pass=0;pass<spots.length;pass++){const over=G.findIndex(g=>g.length>cap);if(over<0)break;const g=G[over];let wi=0;for(let i=1;i<g.length;i++)if((g[i].s||0)<(g[wi].s||0))wi=i;const s=g.splice(wi,1)[0];
  let bi=-1,bd=1e18;G.forEach((h,i)=>{if(i===over||h.length>=cap)return;const d=Math.hypot(cent[i].x-s.x,cent[i].y-s.y);if(d<bd){bd=d;bi=i}});if(bi<0){g.push(s);break}G[bi].push(s)}
 return G.filter(g=>g.length)}

/* ordena as paradas (índices da matriz) minimizando o tempo de viagem: vizinho mais próximo + 2-opt.
   modo: 'fechado' = base→paradas→base; 'aberto' = base→paradas; 'livre' = sem base (começa na 1ª parada). Retorna o caminho completo. */
function ordenarRota(idx,D,modo){
 if(!idx.length)return modo==='fechado'?[0,0]:modo==='aberto'?[0]:[];
 const ini=modo==='livre'?idx[0]:0;let cur=ini,rest=idx.filter(i=>i!==ini),o=[];
 if(modo==='livre')o.push(ini);
 while(rest.length){let bi=0;for(let i=1;i<rest.length;i++)if(D[cur][rest[i]]<D[cur][rest[bi]])bi=i;cur=rest.splice(bi,1)[0];o.push(cur)}
 let path=modo==='fechado'?[0,...o,0]:modo==='aberto'?[0,...o]:o;
 const custo=p=>{let s=0;for(let i=1;i<p.length;i++)s+=D[p[i-1]][p[i]];return s};let bc=custo(path);
 for(let it=0,im=true;im&&it<30;it++){im=false;const hi=modo==='fechado'?path.length-2:path.length-1;
  for(let i=1;i<hi;i++)for(let j=i+1;j<=hi;j++){const c=[...path.slice(0,i),...path.slice(i,j+1).reverse(),...path.slice(j+1)],cc=custo(c);if(cc<bc-1e-6){path=c;bc=cc;im=true}}}
 return path}

/* divide as paradas em k rotas e as ajusta ao turno. M = matriz dos pontos [base?, ...spots]; off = 1 se há base */
function planejarGrupos(M,spots,off,k,{turnoMin,servMin,fechado,cap}){
 const dep=off===1,modo=dep?(fechado?'fechado':'aberto'):'livre',out=[];
 for(const g of agrupar(spots,k,cap||spots.length)){
  let st=g.map(s=>spots.indexOf(s)+off);const drop=[];
  const tempo=(p,n)=>{let t=0;for(let i=1;i<p.length;i++)t+=M.dur[p[i-1]][p[i]];return t/60+servMin*n};
  let path=ordenarRota(st,M.dur,modo);
  while(tempo(path,st.length)>turnoMin&&st.length>1){let wi=0;for(let i=1;i<st.length;i++)if((spots[st[i]-off].s||0)<(spots[st[wi]-off].s||0))wi=i;drop.push(spots[st[wi]-off]);st.splice(wi,1);path=ordenarRota(st,M.dur,modo)}
  const ord=path.filter(i=>i>=off&&!(dep&&i===0)).map(i=>spots[i-off]);
  let m=0;for(let i=1;i<path.length;i++)m+=M.dist[path[i-1]][path[i]];
  out.push({path,o:ord,drop,min:tempo(path,st.length),km:m/1000,excede:tempo(path,st.length)>turnoMin,ig:ord.reduce((a,s)=>a+(s.s||0),0),n:ord.reduce((a,s)=>a+(s.n||0),0)})}
 return out}

/* ===== ronda preventiva ===== */
async function ronda(){
 const R=+$('R').value,per=clamp(+$('rm').value|0,1,20),maxv=clamp(+$('rv').value|0,1,8),turnoMin=Math.max(30,(+$('rh').value||6)*60),servMin=Math.max(0,+$('rs').value||0),fechado=$('rl').checked,tk=S.rk=(S.rk||0)+1;
 const quads=quadrantes().map(q=>({...q,P:q.pts()})).filter(q=>q.P.length);
 if(!quads.length){S.rt=null;$('rrs').textContent='Sem dados para os filtros.';draw();return}
 quads.forEach(q=>q.ig=wsum(q.P));
 const totV=RG.reduce((a,r)=>a+r.v,0),W=quads.reduce((a,q)=>a+q.ig,0)||1,sug=$('rq').value==='reg'?quads.map(q=>RG[q.reg].v):lrm(totV,quads.map(q=>q.ig/W));
 quads.forEach((q,i)=>{q.vtr=sug[i];q.k=clamp(sug[i],1,maxv)});
 S.rt={quads,q:[],per,turnoMin,servMin,fechado};$('rrs').innerHTML='Planejando…';draw();
 const planos=await pool(quads.map(q=>async()=>{
  const spots=topSpots(per*q.k,R,q);if(!spots.length)return[];
  const dep=baseDe(q,spots),pts=[...(dep?[dep]:[]),...spots],M=await matriz(pts);
  const rs=planejarGrupos(M,spots,dep?1:0,q.k,{turnoMin,servMin,fechado,cap:per});
  rs.forEach(r=>{r.dep=dep;r.spots=spots;r.off=dep?1:0;r.real=false;r.tempoReal=M.real});return rs}),3);
 if(tk!==S.rk)return;
 const rotas=[];planos.forEach((p,qi)=>{if(!p.ok)return;p.v.forEach((r,j)=>{r.quad=quads[qi];r.nome=`${quads[qi].nome} · VTR ${j+1}`;r.vtr=j+1;r.c=rotaCor(rotas.length);
  r.g=r.path.map(i=>{const pt=r.dep&&i===0?r.dep:r.spots[i-r.off];return[pt.x,pt.y]});rotas.push(r)})});
 S.rt.q=rotas;
 if(!rotas.length){S.rt=null;$('rrs').textContent='Sem manchas para montar rondas com estes filtros.';draw();return}
 const render=msg=>{const H=['Rota','Base','Paradas','Reg. no raio','IG','Km','Tempo (min)'],R_=rotas.map(r=>[r.nome,r.dep?r.dep.nome:'—',r.o.length,r.n,r.ig,f1(r.kmR!=null?r.kmR:r.km),Math.round((r.minR!=null?r.minR+servMin*r.o.length:r.min))]);
  S.rep.ronda={h:H,r:R_};S.rep.rondaParadas={h:['Rota','Parada','Local','Registros','IG'],r:rotas.flatMap(r=>r.o.map((p,i)=>[r.nome,i+1,p.b,p.n,p.s]))};
  $('rrs').innerHTML=`<div style="margin-bottom:4px">${msg}</div><div style="overflow-x:auto"><table style="font-size:11px;white-space:nowrap"><tr>${H.map(h=>`<th>${h}</th>`).join('')}</tr>`+
   rotas.map((r,i)=>`<tr class="hl" data-q="${i}" title="Ir para a rota"><td><i class="sw" style="background:${r.c}"></i>${R_[i][0]}</td>${R_[i].slice(1).map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')+'</table></div>'+
   `<small>Turno de ${f1(turnoMin/60)} h com ${servMin} min por parada${fechado?', saindo e voltando à base':''}. Clique numa linha para ir à rota.</small>`};
 const drop=rotas.reduce((a,r)=>a+r.drop.length,0),nst=rotas.reduce((a,r)=>a+r.o.length,0),semBase=!rotas.some(r=>r.dep),est=rotas.some(r=>!r.tempoReal);
 const resumo=(extra='')=>`${quads.length} quadrante(s), ${rotas.length} rota(s), ${nst} paradas`+(drop?`; <b>${drop} parada(s) de menor IG ficaram fora do turno</b>`:'')+`. ${extra}`+(semBase?' Sem bases posicionadas: cada rota parte da sua parada de maior IG (use "Distribuir bases").':'')+(est?' Tempos estimados (sem internet).':'');
 render(resumo('Buscando rotas pelas ruas…'));draw();
 await geometriaRotas(rotas,3);if(tk!==S.rk)return;
 const ok=rotas.filter(r=>r.real).length,km=rotas.reduce((a,r)=>a+(r.kmR!=null?r.kmR:r.km),0);
 render(resumo(`${f1(km)} km no total. `+(ok===rotas.filter(r=>r.o.length>0).length?'Percursos pelas ruas.':'Parte dos percursos sem rota real: linha reta.')));draw()}
async function geometriaRotas(rotas,n){const res=await pool(rotas.map(r=>()=>osrm(r.path.map(i=>r.dep&&i===0?r.dep:r.spots[i-r.off]))),n);res.forEach((x,i)=>{if(x.ok)Object.assign(rotas[i],{g:x.v.g,kmR:x.v.km,minR:x.v.min,real:true})})}

/* ===== contornos e rotas desenhados no mapa ===== */
function drawRoutes(g,X,Y,s0){const s=s0||S.V.s,pl=(P,c,wd)=>{g.beginPath();P.forEach((q,i)=>i?g.lineTo(X(q[0]),Y(q[1])):g.moveTo(X(q[0]),Y(q[1])));g.strokeStyle=c;g.lineWidth=wd;g.stroke()},
 dot=(p,c,i,r)=>{g.beginPath();g.arc(X(p.x),Y(p.y),r,0,7);g.fillStyle=c;g.fill();g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke();g.fillStyle='#fff';g.textAlign='center';g.fillText(i,X(p.x),Y(p.y)+3.5);g.textAlign='start'},
 base=(b,c)=>{g.fillStyle=c;g.strokeStyle='#fff';g.lineWidth=2;g.fillRect(X(b.x)-7,Y(b.y)-7,14,14);g.strokeRect(X(b.x)-7,Y(b.y)-7,14,14);g.fillStyle='#fff';g.textAlign='center';g.fillText('B',X(b.x),Y(b.y)+3.5);g.textAlign='start'};
 (S.kr||[]).forEach(r=>r&&pl(r.g,'#16a34a',3));
 if(S.rt){g.font='bold 11px sans-serif';
  for(const q of S.rt.quads){const c=S.rt.q.find(r=>r.quad===q);g.save();g.setLineDash([8,5]);g.strokeStyle=c?c.c:'#94a3b8';g.lineWidth=1.5;
   if(q.poly&&$('rq').value!=='reg')for(const p of q.poly.parts){g.beginPath();p.outer.forEach((v,i)=>i?g.lineTo(X(v[0]),Y(v[1])):g.moveTo(X(v[0]),Y(v[1])));g.closePath();g.stroke()}
   else if(!q.poly)g.strokeRect(X(q.x0),Y(q.y1),(q.x1-q.x0)*s,(q.y1-q.y0)*s);
   g.restore();g.fillStyle=c?c.c:'#94a3b8';const lx=q.poly?q.poly.cx:q.x0+6/s,ly=q.poly?q.poly.cy:q.y1-16/s;g.textAlign=q.poly?'center':'start';g.fillText(q.nome,X(lx),Y(ly));g.textAlign='start'}
  for(const r of S.rt.q){pl(r.g,r.c,3.5);r.o.forEach((p,i)=>dot(p,r.c,i+1,9));if(r.dep)base(r.dep,r.c)}}
 if(S.sr&&S.selM){g.font='bold 10px sans-serif';for(const r of S.sr.r){pl(r.g,r.c,3.5);r.o.forEach((p,i)=>dot(p,r.c,i+1,8));if(r.dep)base(r.dep,r.c)}}}

/* clicar numa linha da tabela voa até a rota */
$('rrs').onclick=e=>{const t=e.target.closest('[data-q]'),r=t&&S.rt&&S.rt.q[+t.dataset.q];if(!r)return;
 const xs=r.g.map(p=>p[0]),ys=r.g.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);flyTo((x0+x1)/2,(y0+y1)/2,Math.max(x1-x0,y1-y0,800)/2*1.25)};

/* ===== rota real ligando os registros de uma área selecionada ===== */
const MAXW=60;
function clusterStops(P,r0){let r=r0,C;
 for(;;){C=[];for(const p of P.slice().sort((a,b)=>T[b.t].w-T[a.t].w)){const c=C.find(k=>(k.x-p.x)**2+(k.y-p.y)**2<=r*r);if(c){c.n++;c.s+=T[p.t].w}else C.push({x:p.x,y:p.y,n:1,s:T[p.t].w,b:p.b})}
  if(C.length<=MAXW||r>8000)break;r*=1.5}
 return{C:C.slice(0,MAXW),r}}
async function selRoute(P){const tk=S.st=(S.st||0)+1,out=h=>{if(tk===S.st&&$('srt'))$('srt').innerHTML=h};S.sr=null;
 if(P.length<2){out('<small>Poucos registros na área para traçar rota (mínimo 2).</small>');draw();return}
 const{C,r}=clusterStops(P,40),agr=P.length>C.length?` (${P.length} registros agrupados em ${C.length} paradas, raio de ${Math.round(r)} m)`:'';
 if(C.length<2){out(`<small>Todos os registros estão num mesmo ponto (${Math.round(r)} m): sem trecho a percorrer.</small>`);draw();return}
 const turnoMin=Math.max(30,(+$('rh').value||6)*60),servMin=Math.max(0,+$('rs').value||0),fechado=$('rl').checked,m=S.selM,
  dep=baseDe({has:(x,y)=>x>=m.x0&&x<=m.x1&&y>=m.y0&&y<=m.y1},C),off=dep?1:0;
 out('<b>Rota:</b> calculando tempos de viagem…');
 const M=await matriz([...(dep?[dep]:[]),...C]);if(tk!==S.st||!S.selM)return;
 let rotas,k=1;const kmax=Math.min(10,C.length);
 for(;k<=kmax;k++){rotas=planejarGrupos(M,C,off,k,{turnoMin,servMin,fechado,cap:Math.ceil(C.length/k)});if(rotas.every(x=>!x.drop.length))break}
 if(k>kmax)k=kmax;
 rotas.forEach((x,j)=>{x.dep=dep;x.spots=C;x.off=off;x.nome='VTR '+(j+1);x.c=rotaCor(j);x.g=x.path.map(i=>{const p=dep&&i===0?dep:C[i-off];return[p.x,p.y]})});
 S.sr={r:rotas,M};draw();
 const drop=rotas.reduce((a,x)=>a+x.drop.length,0);
 const resumo=(extra='')=>`<b>Rota real ligando os registros da área:</b> ${C.length} paradas${agr}.<br>Turno de ${f1(turnoMin/60)} h: ${drop?`<b>${k} viatura(s) não bastam; ${drop} parada(s) de menor IG ficaram de fora</b>`:`<b>${k} viatura(s)</b> cobrem todas as paradas`}${dep?`, saindo de ${dep.nome}`:' (sem bases posicionadas)'}.`+extra;
 out(resumo('<br>Buscando trajeto pelas ruas…'));
 await geometriaRotas(rotas,3);if(tk!==S.st||!S.sr)return;
 const ok=rotas.filter(x=>x.real).length,km=rotas.reduce((a,x)=>a+(x.kmR!=null?x.kmR:x.km),0);
 S.rep.rotaArea={h:['Rota','Parada','Local','Registros','IG'],r:rotas.flatMap(x=>x.o.map((p,i)=>[x.nome,i+1,p.b,p.n,p.s]))};
 out(resumo(`<br>${rotas.map(x=>`<i class="sw" style="background:${x.c}"></i>${x.nome}: ${x.o.length} paradas, ${f1(x.kmR!=null?x.kmR:x.km)} km, ~${Math.round(x.minR!=null?x.minR+servMin*x.o.length:x.min)} min`).join('<br>')}<br><b>Total: ${f1(km)} km.</b>`+(ok===rotas.length?'':`<br><small>${rotas.length-ok} rota(s) sem trajeto pelas ruas (sem internet ou fora da malha): linha reta.</small>`)));draw()}
