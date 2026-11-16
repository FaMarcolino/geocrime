/* ===== v9: planejador de rondas por viatura =====
   Para cada quadrante: escolhe as manchas críticas, divide entre as viaturas (k-médias), ordena cada percurso com o
   tempo de viagem real (matriz OSRM; 2-opt), sai e volta da base, e retira paradas de menor IG até caber no turno. */
const rotaCor=i=>`hsl(${(i*137+10)%360},72%,${i%2?50:42}%)`;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* quadrantes: regiões (polígonos), quadrantes importados ou grade n×n. Cada um tem pts() e has(x,y) */
const LADO_MAX_CEL=1500,FOLGA_CEL=80;/* m: ruas na borda da célula (até 80 m) não contam como fora dela */
/* m: células maiores que isso (áreas esparsas) não viram ronda */
function quadrantes(){const m=$('rq').value;
 if(m==='reg'&&GEO.R)return GEO.R.feats.map((f,i)=>({nome:RG[i]?RG[i].n:f.nome,reg:i,poly:f,x0:f.bbox[0],y0:f.bbox[1],x1:f.bbox[2],y1:f.bbox[3],has:(x,y)=>reg(x,y)===i,pts:()=>S.f.filter(p=>p.r===i)}));
 if(m==='qd'&&GEO.Q)return GEO.Q.feats.map(f=>({nome:f.nome,poly:f,x0:f.bbox[0],y0:f.bbox[1],x1:f.bbox[2],y1:f.bbox[3],has:(x,y)=>geoIn(f,x,y),pts:()=>S.qt.rect(f.bbox[0],f.bbox[1],f.bbox[2],f.bbox[3],[]).filter(p=>geoIn(f,p.x,p.y))}));
 if(m==='cel'){const N=clamp((+$('rn').value|0)||RG.reduce((a,r)=>a+r.v,0)||12,1,60);/* células da QuadTree (os quadradinhos do mapa) de maior gravidade; por padrão, uma por viatura cadastrada */
  return S.lv.filter(l=>l.pts.length>=3&&Math.max(l.x1-l.x0,l.y1-l.y0)<=LADO_MAX_CEL).map(l=>({l,ig:wsum(l.pts)})).sort((a,b)=>b.ig-a.ig).slice(0,N).map((o,k)=>{const l=o.l,top=l.pts.reduce((a,p)=>!a||T[p.t].w>T[a.t].w?p:a,null);
   return{nome:'C'+(k+1)+(top&&top.b?' · '+top.b:''),cel:true,x0:l.x0,y0:l.y0,x1:l.x1,y1:l.y1,has:(x,y)=>x>=l.x0&&x<l.x1&&y>=l.y0&&y<l.y1,dentro:(x,y)=>x>=l.x0-FOLGA_CEL&&x<l.x1+FOLGA_CEL&&y>=l.y0-FOLGA_CEL&&y<l.y1+FOLGA_CEL,pts:()=>l.pts}})}
 const n=[2,3,4,5,6,8].includes(+m)?+m:3,[a,b,c,d]=S.bb,w=(c-a)/n,h=(d-b)/n,o=[];
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
 const cel=$('rq').value==='cel',dentro=$('rdn').checked,sub=dentro&&!cel;S.rsel=null;
 const quads=quadrantes().map(q=>({...q,P:q.pts()})).filter(q=>q.P.length);
 if(!quads.length){S.rt=null;$('rrs').textContent='Sem dados para os filtros.';draw();return}
 quads.forEach(q=>q.ig=wsum(q.P));
 const totV=RG.reduce((a,r)=>a+r.v,0),W=quads.reduce((a,q)=>a+q.ig,0)||1,sug=$('rq').value==='reg'?quads.map(q=>RG[q.reg].v):lrm(totV,quads.map(q=>q.ig/W));
 quads.forEach((q,i)=>{q.vtr=cel?1:sug[i];q.k=cel?1:clamp(sug[i],1,maxv)});
 if(sub)quads.forEach(q=>{if(q.k>1){q.zonas=zonasDe(q,q.k);pintarZonas(q)}});/* cada viatura recebe uma subdivisão da divisão */
 S.rt={quads,q:[],per,turnoMin,servMin,fechado,dentro};$('rrs').innerHTML='Planejando…';draw();
 const planos=await pool(quads.map(q=>async()=>{const out=[],usados=[];
  for(const u of q.zonas&&q.zonas.length>1?q.zonas.map(z=>({z,k:1})):[{z:null,k:q.k}]){const alvo=u.z||q;
   const spots=cel?paradasCelula(q,per):topSpots(per*u.k,R,alvo,usados);if(!spots.length)continue;usados.push(...spots);
   const dep=baseDe(alvo,spots),pts=[...(dep?[dep]:[]),...spots],M=await matriz(pts);
   planejarGrupos(M,spots,dep?1:0,u.k,{turnoMin,servMin,fechado,cap:per}).forEach(r=>{Object.assign(r,{dep,spots,off:dep?1:0,real:false,tempoReal:M.real,zona:u.z});out.push(r)})}
  return out}),3);
 if(tk!==S.rk)return;
 const rotas=[];planos.forEach((p,qi)=>{if(!p.ok)return;p.v.forEach((r,j)=>{r.quad=quads[qi];r.nome=`${quads[qi].nome} · VTR ${j+1}`;r.vtr=j+1;r.c=rotaCor(rotas.length);if(r.zona)r.zona.c=r.c;
  r.g=r.path.map(i=>{const pt=r.dep&&i===0?r.dep:r.spots[i-r.off];return[pt.x,pt.y]});rotas.push(r)})});
 S.rt.q=rotas;
 if(!rotas.length){S.rt=null;$('rrs').textContent='Sem manchas para montar rondas com estes filtros.';draw();return}
 const render=msg=>{const fora=r=>r.fora==null?'—':Math.round(r.fora*100)+'%',H=['Rota','Base','Paradas','Reg. no raio','IG','Km','Tempo (min)','Fora da divisão'],R_=rotas.map(r=>[r.nome,r.dep?r.dep.nome:'—',r.o.length,r.n,r.ig,f1(r.kmR!=null?r.kmR:r.km),Math.round((r.minR!=null?r.minR+servMin*r.o.length:r.min)),fora(r)]);
  S.rep.ronda={h:H,r:R_};S.rep.rondaParadas={h:['Rota','Parada','Local','Registros','IG','Latitude','Longitude'],r:rotas.flatMap(r=>r.o.map((p,i)=>[r.nome,i+1,p.b,p.n,p.s,...latlng(p).split(',')]))};
  $('rrs').innerHTML=`<div style="margin-bottom:4px">${msg}</div><div style="overflow-x:auto"><table style="font-size:11px;white-space:nowrap"><tr>${H.map(h=>`<th>${h}</th>`).join('')}</tr>`+
   rotas.map((r,i)=>`<tr class="hl${S.rsel===i?' on':''}" data-q="${i}" title="Ver paradas e abrir no Maps/Waze"><td><i class="sw" style="background:${r.c}"></i>${R_[i][0]}</td>${R_[i].slice(1).map((c,j)=>`<td${j===6&&r.fora>LIM_FORA?' class="fora-w"':''}>${c}</td>`).join('')}</tr>`).join('')+'</table></div>'+
   `<small>Turno de ${f1(turnoMin/60)} h com ${servMin} min por parada${fechado?', saindo e voltando à base':''}. Clique numa linha para ir à rota e abrir no Google Maps ou no Waze.</small><div id="rdet"></div>`;mostrarDetalhe()};
 const drop=rotas.reduce((a,r)=>a+r.drop.length,0),nst=rotas.reduce((a,r)=>a+r.o.length,0),semBase=!rotas.some(r=>r.dep),est=rotas.some(r=>!r.tempoReal);
 const resumo=(extra='')=>`${quads.length} ${cel?'célula(s)':'divisão(ões)'}${sub?', cada viatura na sua subdivisão':''}, ${rotas.length} rota(s), ${nst} paradas`+(drop?`; <b>${drop} parada(s) de menor IG ficaram fora do turno</b>`:'')+`. ${extra}`+(semBase?' Sem bases posicionadas: cada rota parte da sua parada de maior IG (use "Distribuir bases").':'')+(est?' Tempos estimados (sem internet).':'');
 render(resumo('Buscando rotas pelas ruas…'));draw();
 await geometriaRotas(rotas,3,dentro);if(tk!==S.rk)return;
 const ok=rotas.filter(r=>r.real).length,km=rotas.reduce((a,r)=>a+(r.kmR!=null?r.kmR:r.km),0),alta=rotas.filter(r=>r.fora>LIM_FORA).length,aj=rotas.filter(r=>r.ajustada).length;
 render(resumo(`${f1(km)} km no total. `+(ok===rotas.filter(r=>r.o.length>0).length?'Percursos pelas ruas.':'Parte dos percursos sem rota real: linha reta.')+(aj?` ${aj} rota(s) refeita(s) por trajetos alternativos para ficar ${cel?'na célula':'na subdivisão'}.`:'')+(alta?` <b>${alta} rota(s) ainda saem ${cel?'da célula':'da subdivisão'} em mais de ${Math.round(LIM_FORA*100)}% do trajeto</b> (as ruas atravessam o limite).`:dentro&&ok?(cel?' Trajetos dentro das células.':' Trajetos dentro das subdivisões.'):'')));draw()}

/* parte do trajeto (por comprimento) que cai fora da divisão: usa o ponto médio de cada trecho da geometria */
const LIM_FORA=.10;
function foraShare(g,has,a=0,b=1){const c=[0];for(let i=1;i<g.length;i++)c.push(c[i-1]+Math.hypot(g[i][0]-g[i-1][0],g[i][1]-g[i-1][1]));const Lt=c.at(-1)||1;let L=0,F=0;
 for(let i=1;i<g.length;i++){const d=c[i]-c[i-1],m=(c[i]+c[i-1])/2/Lt;if(m<a||m>b)continue;L+=d;if(!has((g[i][0]+g[i-1][0])/2,(g[i][1]+g[i-1][1])/2))F+=d}return L?F/L:0}
/* território da rota: a subdivisão da viatura ou, sem subdivisão, a divisão inteira */
const hasDe=r=>{const q=r.zona||r.quad||{};return q.dentro||q.has};
/* a ida e a volta da base não contam quando a base está fora do território da rota (a viatura sai de onde está a base) */
function foraRota(r){const has=hasDe(r);if(!has||!r.g)return null;let a=0,b=1;
 if(r.dep&&r.legs&&r.legs.length>1&&!has(r.dep.x,r.dep.y)){const tot=r.legs.reduce((s,v)=>s+v,0)||1;a=r.legs[0]/tot;if(S.rt&&S.rt.fechado)b=1-r.legs.at(-1)/tot}
 return foraShare(r.g,has,a,b)}
/* subdivisões: cada viatura fica com o território mais próximo do seu centro (k-médias, pelo IG dos registros da divisão) */
function zonasDe(q,k){const pts=q.P.map(p=>({x:p.x,y:p.y,s:T[p.t].w})),C=agrupar(pts,k,pts.length).map(g=>{const w=g.reduce((a,s)=>a+s.s,0)||1;return{x:g.reduce((a,s)=>a+s.x*s.s,0)/w,y:g.reduce((a,s)=>a+s.y*s.s,0)/w}});
 const perto=(x,y)=>{let b=0,bd=1e18;C.forEach((c,i)=>{const d=(c.x-x)**2+(c.y-y)**2;if(d<bd){bd=d;b=i}});return b};
 const Z=C.map((c,j)=>({nome:q.nome+' · sub '+(j+1),j,cx:c.x,cy:c.y,has:(x,y)=>perto(x,y)===j&&q.has(x,y),pts:()=>q.P.filter(p=>perto(p.x,p.y)===j)}));Z.perto=perto;return Z}
/* mancha colorida das subdivisões (varredura 32×32 por divisão, em faixas), desenhada atrás das rotas */
function pintarZonas(q){const Z=q.zonas,N=32,w=(q.x1-q.x0)/N,h=(q.y1-q.y0)/N,R=[];if(!Z||Z.length<2)return;
 for(let j=0;j<N;j++){let id0=-2,xs=0;for(let i=0;i<=N;i++){const x=q.x0+(i+.5)*w,y=q.y0+(j+.5)*h,id=i<N&&q.has(x,y)?Z.perto(x,y):-1;
  if(id!==id0){if(id0>=0)R.push({x0:q.x0+xs*w,x1:q.x0+i*w,y0:q.y0+j*h,y1:q.y0+(j+1)*h,z:id0});id0=id;xs=i}}}
 q.tint=R}
const pontosRota=r=>r.path.map(i=>r.dep&&i===0?r.dep:r.spots[i-r.off]);
/* alternativas de um trecho a→b (o OSRM devolve até 3 trajetos) */
async function osrmAlt(a,b){const c=[a,b].map(p=>`${(LNG0+p.x/KX).toFixed(6)},${(LAT0+p.y/KY).toFixed(6)}`).join(';'),j=await(await fetch(`https://router.project-osrm.org/route/v1/driving/${c}?overview=full&geometries=geojson&alternatives=true`)).json();
 return(j.routes||[]).map(t=>({g:t.geometry.coordinates.map(([x,y])=>[(x-LNG0)*KX,(y-LAT0)*KY]),km:t.distance/1000,min:t.duration/60}))}
/* refaz a rota trecho a trecho, escolhendo em cada um o trajeto que menos sai da divisão (sem passar de 1,5× o tempo do mais rápido) */
async function reroteiar(r){const P=pontosRota(r),has=hasDe(r),fe=S.rt&&S.rt.fechado,foraB=r.dep&&!has(r.dep.x,r.dep.y);let g=[],km=0,min=0,L=0,F=0;const legs=[];
 for(let i=1;i<P.length;i++){const alts=await osrmAlt(P[i-1],P[i]);if(!alts.length)throw new Error('sem trajeto');const base=foraB&&(i===1||(fe&&i===P.length-1)),rap=Math.min(...alts.map(a=>a.min)),bons=alts.filter(a=>a.min<=rap*1.5);bons.forEach(a=>a.f=foraShare(a.g,has));
  const b=bons.sort(base?(u,v)=>u.min-v.min:(u,v)=>u.f-v.f||u.min-v.min)[0];g.push(...(g.length?b.g.slice(1):b.g));km+=b.km;min+=b.min;legs.push(b.km*1000);if(!base){L+=b.km;F+=b.f*b.km}}
 const f=L?F/L:0;if(f<r.fora-1e-9)Object.assign(r,{g,kmR:km,minR:min,legs,fora:f,ajustada:true})}
async function geometriaRotas(rotas,n,dentro){const res=await pool(rotas.map(r=>()=>osrm(pontosRota(r))),n);res.forEach((x,i)=>{if(x.ok)Object.assign(rotas[i],{g:x.v.g,kmR:x.v.km,minR:x.v.min,legs:x.v.legs,real:true})});
 rotas.forEach(r=>{if(r.real)r.fora=foraRota(r)});
 if(dentro)await pool(rotas.filter(r=>r.real&&r.fora>LIM_FORA).map(r=>()=>reroteiar(r)),n)}

/* ===== abrir no Google Maps / Waze ===== */
const latlng=p=>`${(LAT0+p.y/KY).toFixed(6)},${(LNG0+p.x/KX).toFixed(6)}`;
const urlWaze=p=>`https://waze.com/ul?ll=${latlng(p)}&navigate=yes`;
/* o Google Maps aceita origem, destino e até 9 paradas intermediárias por link: rotas maiores viram partes encadeadas */
function linksMaps(r){const P=pontosRota(r),out=[];if(P.length===1)return[`https://www.google.com/maps/dir/?api=1&destination=${latlng(P[0])}&travelmode=driving`];
 for(let i=0;i<P.length-1;i+=10){const s=P.slice(i,i+11);out.push(`https://www.google.com/maps/dir/?api=1&origin=${latlng(s[0])}&destination=${latlng(s.at(-1))}&travelmode=driving`+(s.length>2?`&waypoints=${s.slice(1,-1).map(latlng).join('%7C')}`:''))}return out}
function mostrarDetalhe(){const e=$('rdet'),r=S.rt&&S.rt.q[S.rsel];if(!e)return;if(!r){e.innerHTML='';return}
 const ms=linksMaps(r),A=(u,t)=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`;
 e.innerHTML=`<div class="rdet"><b><i class="sw" style="background:${r.c}"></i>${esc(r.nome)}</b>${r.fora!=null?` · ${Math.round(r.fora*100)}% fora da divisão`:''}
  <div class="row wrap">${ms.map((u,k)=>`<a class="bt" href="${u}" target="_blank" rel="noopener noreferrer">Rota no Google Maps${ms.length>1?` (parte ${k+1} de ${ms.length})`:''}</a>`).join('')}</div>
  <ol>${r.dep?`<li class="bs">${esc(r.dep.nome)} (saída) ${A(urlWaze(r.dep),'Waze')}</li>`:''}${r.o.map(p=>`<li>${esc(p.b||'Parada')} · ${p.n} reg., IG ${p.s} ${A(urlWaze(p),'Waze')} ${A('https://www.google.com/maps/dir/?api=1&destination='+latlng(p)+'&travelmode=driving','Maps')}</li>`).join('')}</ol>
  <small>O Maps abre a rota inteira (até 10 pontos por link). O Waze só navega para um destino por vez, então use a lista parada a parada. Abrir um link envia as coordenadas ao Google ou ao Waze.</small></div>`}
function paradasCelula(q,n){return clusterStops(q.P,40).C.sort((a,b)=>b.s-a.s).slice(0,n)}

/* ===== contornos e rotas desenhados no mapa ===== */
function drawRoutes(g,X,Y,s0){const s=s0||S.V.s,pl=(P,c,wd)=>{g.beginPath();P.forEach((q,i)=>i?g.lineTo(X(q[0]),Y(q[1])):g.moveTo(X(q[0]),Y(q[1])));g.strokeStyle=c;g.lineWidth=wd;g.stroke()},
 dot=(p,c,i,r)=>{g.beginPath();g.arc(X(p.x),Y(p.y),r,0,7);g.fillStyle=c;g.fill();g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke();g.fillStyle='#fff';g.textAlign='center';g.fillText(i,X(p.x),Y(p.y)+3.5);g.textAlign='start'},
 base=(b,c)=>{g.fillStyle=c;g.strokeStyle='#fff';g.lineWidth=2;g.fillRect(X(b.x)-7,Y(b.y)-7,14,14);g.strokeRect(X(b.x)-7,Y(b.y)-7,14,14);g.fillStyle='#fff';g.textAlign='center';g.fillText('B',X(b.x),Y(b.y)+3.5);g.textAlign='start'};
 (S.kr||[]).forEach(r=>r&&pl(r.g,'#16a34a',3));
 if(S.rt){g.font='bold 11px sans-serif';
  for(const q of S.rt.quads)if(q.tint){g.save();g.globalAlpha=.16;for(const t of q.tint){const z=q.zonas[t.z];if(!z||!z.c)continue;g.fillStyle=z.c;g.fillRect(X(t.x0),Y(t.y1),(t.x1-t.x0)*s+.5,(t.y1-t.y0)*s+.5)}g.restore()}
  for(const q of S.rt.quads){const c=S.rt.q.find(r=>r.quad===q);g.save();g.setLineDash([8,5]);g.strokeStyle=c?c.c:'#94a3b8';g.lineWidth=1.5;
   if(q.poly&&$('rq').value!=='reg')for(const p of q.poly.parts){g.beginPath();p.outer.forEach((v,i)=>i?g.lineTo(X(v[0]),Y(v[1])):g.moveTo(X(v[0]),Y(v[1])));g.closePath();g.stroke()}
   else if(!q.poly)g.strokeRect(X(q.x0),Y(q.y1),(q.x1-q.x0)*s,(q.y1-q.y0)*s);
   g.restore();g.fillStyle=c?c.c:'#94a3b8';const lx=q.poly?q.poly.cx:q.x0+6/s,ly=q.poly?q.poly.cy:q.y1-16/s;g.textAlign=q.poly?'center':'start';g.fillText(q.nome,X(lx),Y(ly));g.textAlign='start'}
  for(const r of S.rt.q){pl(r.g,r.c,3.5);r.o.forEach((p,i)=>dot(p,r.c,i+1,9));if(r.dep)base(r.dep,r.c)}}
 if(S.sr&&S.selM){g.font='bold 10px sans-serif';for(const r of S.sr.r){pl(r.g,r.c,3.5);r.o.forEach((p,i)=>dot(p,r.c,i+1,8));if(r.dep)base(r.dep,r.c)}}}

/* clicar numa linha da tabela voa até a rota */
$('rrs').onclick=e=>{if(e.target.closest('a'))return;const t=e.target.closest('[data-q]'),r=t&&S.rt&&S.rt.q[+t.dataset.q];if(!r)return;S.rsel=+t.dataset.q;$('rrs').querySelectorAll('tr.hl').forEach(x=>x.classList.toggle('on',x===t));mostrarDetalhe();
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
