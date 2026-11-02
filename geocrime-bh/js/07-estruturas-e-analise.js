/* ===== v4: estruturas concorrentes (k-d tree e grade uniforme) ===== */
function kdBuild(P,d=0){if(!P.length)return null;const a=d%2?'y':'x';P=P.slice().sort((p,q)=>p[a]-q[a]);const m=P.length>>1;return{p:P[m],a,l:kdBuild(P.slice(0,m),d+1),r:kdBuild(P.slice(m+1),d+1)}}
function kdRng(n,x,y,r,o){if(!n)return o;const p=n.p;if((p.x-x)**2+(p.y-y)**2<=r*r)o.push(p);const d=n.a==='x'?x-p.x:y-p.y;if(d-r<=0)kdRng(n.l,x,y,r,o);if(d+r>=0)kdRng(n.r,x,y,r,o);return o}
function kdKnn(n,x,y,k,b){if(!n)return b;const p=n.p,dd=(p.x-x)**2+(p.y-y)**2;if(b.length<k||dd<b[b.length-1]){b.push(dd);b.sort((u,v)=>u-v);if(b.length>k)b.pop()}
 const d=n.a==='x'?x-p.x:y-p.y,[f,s]=d<=0?[n.l,n.r]:[n.r,n.l];kdKnn(f,x,y,k,b);if(b.length<k||d*d<b[b.length-1])kdKnn(s,x,y,k,b);return b}
function gridBuild(P,cs){const m=new Map();for(const p of P){const k=Math.floor(p.x/cs)+','+Math.floor(p.y/cs);(m.get(k)||m.set(k,[]).get(k)).push(p)}return{m,cs}}
function gridRng(G,x,y,r,o){const{m,cs}=G;for(let i=Math.floor((x-r)/cs);i<=Math.floor((x+r)/cs);i++)for(let j=Math.floor((y-r)/cs);j<=Math.floor((y+r)/cs);j++){const c=m.get(i+','+j);if(c)for(const p of c)if((p.x-x)**2+(p.y-y)**2<=r*r)o.push(p)}return o}
function gridKnn(G,x,y,k,b){const{m,cs}=G,ci=Math.floor(x/cs),cj=Math.floor(y/cs);
 for(let r=0;r<300;r++){for(let i=ci-r;i<=ci+r;i++)for(let j=cj-r;j<=cj+r;j++){if(Math.max(Math.abs(i-ci),Math.abs(j-cj))!==r)continue;const c=m.get(i+','+j);if(c)for(const p of c){const d=(p.x-x)**2+(p.y-y)**2;if(b.length<k||d<b[b.length-1]){b.push(d);b.sort((u,v)=>u-v);if(b.length>k)b.pop()}}}if(b.length===k&&b[k-1]<=(r*cs)**2)break}return b}
const linK=(P,k)=>q=>{const b=[];for(const p of P){const d=(p.x-q.x)**2+(p.y-q.y)**2;if(b.length<k||d<b[b.length-1]){b.push(d);b.sort((u,v)=>u-v);if(b.length>k)b.pop()}}return b};
function benchAll(){const P=S.f;if(P.length<50){$('bmr').textContent='Poucos registros para medir.';return}
 const Q=500,k=+$('k').value,R=+$('R').value,qs=Array.from({length:Q},()=>P[Math.random()*P.length|0]),now=()=>performance.now();
 const tm=f=>{const t=now(),r=qs.map(f);return[now()-t,r]},bt=f=>{const t=now(),o=f();return[now()-t,o]};
 const[tq,qt]=bt(()=>{const t=mkQT();P.forEach(p=>t.ins(p));return t}),[tk,kd]=bt(()=>kdBuild(P)),[tg,gd]=bt(()=>gridBuild(P,R));
 const E=[['Varredura linear',0,linK(P,k),q=>{let n=0;for(const p of P)if((p.x-q.x)**2+(p.y-q.y)**2<=R*R)n++;return n}],
  ['QuadTree',tq,q=>qt.knn(q.x,q.y,k,[],{v:0}).map(o=>o.d),q=>qt.rng(q.x,q.y,R,[],{v:0}).length],
  ['k-d tree',tk,q=>kdKnn(kd,q.x,q.y,k,[]),q=>kdRng(kd,q.x,q.y,R,[]).length],
  ['Grade uniforme',tg,q=>gridKnn(gd,q.x,q.y,k,[]),q=>gridRng(gd,q.x,q.y,R,[]).length]];
 let ref;const R_=E.map(([n,b,fk,fr],i)=>{fk(qs[0]);fr(qs[0]);const[t1,r1]=tm(fk),[t2,r2]=tm(fr);if(!i)ref=[r1,r2];
  const ok=i?(r1.every((a,j)=>a.length===ref[0][j].length&&a.every((d,m)=>Math.abs(d-ref[0][j][m])<1e-6))&&r2.every((c,j)=>c===ref[1][j])?'✓':'✗'):'—';
  return[n,f1(b)+' ms',f1(t1)+' ms',f1(t2)+' ms',ok]}),H=['Estrutura','Construção','k-NN','Raio','Confere'];
 S.rep.estruturas={h:H,r:R_};
 $('bmr').innerHTML=`${P.length.toLocaleString('pt-BR')} registros, ${Q} consultas (k=${k}, raio ${R} m).`+tbl(H,R_)+'<div style="margin-top:4px">“Confere” compara com a varredura linear. A grade usa células do tamanho do raio: ótima em dados uniformes, mas sensível à escolha do tamanho. QuadTree e k-d tree se adaptam à densidade.</div>'}
function scale(){const cn_=$('sc'),g=cn_.getContext('2d'),N=[1000,2000,5000,10000,20000,40000],k=+$('k').value,names=['Linear','QuadTree','k-d tree','Grade'],cols=['#ef4444','#6366f1','#10b981','#f59e0b'],res=names.map(()=>[]);cn_.style.display='block';
 for(const n of N){const P=gen(n),bb=bboxOf(P),cx=(bb[0]+bb[2])/2,cy=(bb[1]+bb[3])/2,h=Math.max(bb[2]-bb[0],bb[3]-bb[1])/2+10,qt=new QT(cx-h,cy-h,cx+h,cy+h,25,9);P.forEach(p=>qt.ins(p));
  const kd=kdBuild(P),gd=gridBuild(P,500),qs=Array.from({length:150},()=>P[Math.random()*n|0]),f=[linK(P,k),q=>qt.knn(q.x,q.y,k,[],{v:0}),q=>kdKnn(kd,q.x,q.y,k,[]),q=>gridKnn(gd,q.x,q.y,k,[])];
  f.forEach((fn,i)=>{const t=performance.now();qs.forEach(fn);res[i].push((performance.now()-t)/150)})}
 const W=280,H=140,L=Math.log10,all=res.flat().map(v=>L(Math.max(v,1e-4))),lo=Math.min(...all),hi=Math.max(...all),X=i=>30+i/(N.length-1)*(W-40),Y=v=>H-22-(L(Math.max(v,1e-4))-lo)/(hi-lo||1)*(H-44);
 g.clearRect(0,0,W,H);g.font='9px sans-serif';g.fillStyle=cv('--mu');N.forEach((n,i)=>g.fillText(n>=1000?n/1000+'k':n,X(i)-6,H-8));g.fillText('ms por consulta k-NN (escala log) × nº de registros',4,10);
 res.forEach((r,i)=>{g.beginPath();r.forEach((v,j)=>j?g.lineTo(X(j),Y(v)):g.moveTo(X(j),Y(v)));g.strokeStyle=cols[i];g.lineWidth=2;g.stroke();g.fillStyle=cols[i];g.fillText(names[i],34+i*62,22)});
 S.rep.escala={h:['Registros',...names],r:N.map((n,j)=>[n,...res.map(r=>r[j].toFixed(4))])}}

/* ===== v4: DBSCAN (vizinhança por busca em raio na QuadTree) ===== */
function dbscan(){const eps=+$('R').value,mp=+$('mp').value||12,P=S.f,lab=new Int32Array(P.length).fill(-2);let c=0;
 if(!P.length){$('dbr').textContent='Sem dados.';return}
 for(let i=0;i<P.length;i++){if(lab[i]!==-2)continue;const nb=S.qt.rng(P[i].x,P[i].y,eps,[],{v:0});if(nb.length<mp){lab[i]=-1;continue}
  lab[i]=c;const q=nb.slice();
  for(let h=0;h<q.length;h++){const z=q[h],j=z.j;if(lab[j]===-1){lab[j]=c;continue}if(lab[j]!==-2)continue;lab[j]=c;const n2=S.qt.rng(z.x,z.y,eps,[],{v:0});if(n2.length>=mp)for(const y of n2)if(lab[y.j]<0)q.push(y)}c++}
 const cls=Array.from({length:c},()=>[]);P.forEach((p,j)=>{if(lab[j]>=0)cls[lab[j]].push(p)});
 S.cl=cls.map(m=>{const{x,y}=cen({pts:m}),w=wsum(m),nn=S.qt.knn(x,y,1,[],{v:0})[0];return{x,y,n:m.length,s:w,rad:Math.max(...m.map(p=>Math.hypot(p.x-x,p.y-y)))+30,b:nn?nn.p.b:'—'}}).sort((a,b)=>b.s-a.s);
 const noise=lab.reduce((a,v)=>a+(v===-1),0),H=['#','Local','Registros','IG','Raio (m)'],R_=S.cl.slice(0,12).map((o,i)=>['A'+(i+1),o.b,o.n,o.s,Math.round(o.rad)]);S.rep.clusters={h:H,r:R_};
 $('dbr').innerHTML=`<b>${c}</b> aglomerado(s); <b>${noise}</b> registros isolados (${f1(noise/P.length*100)}%). Número de aglomerados definido pelos dados, sem fixar quantos.`+(c?tbl(H,R_):'<div class="warn">Nenhum aglomerado: reduza o mínimo de registros ou aumente o raio.</div>');draw()}

/* ===== v4: calor (KDE por kernel triangular) ===== */
function kdeDraw(g,X,Y,s){if(!S.f.length)return;const R=+$('R').value;
 if(!S.kde){const[a,b,c,d]=bboxOf(S.f),cs=Math.max(R/2,150,Math.sqrt((c-a+2*R)*(d-b+2*R)/30000)),x0=a-R,y0=b-R,nx=Math.ceil((c-a+2*R)/cs),ny=Math.ceil((d-b+2*R)/cs),v=[];let mx=0;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const cx=x0+(i+.5)*cs,cy=y0+(j+.5)*cs;let t=0;for(const p of S.qt.rng(cx,cy,R,[],{v:0}))t+=T[p.t].w*(1-Math.hypot(p.x-cx,p.y-cy)/R);if(t>0){v.push([cx,cy,t]);mx=Math.max(mx,t)}}
  S.kde={v,cs,mx}}
 const{v,cs,mx}=S.kde;for(const[cx,cy,t]of v){const q=t/mx;g.fillStyle=`hsla(${60-60*q},100%,50%,${.08+.55*q})`;g.fillRect(X(cx-cs/2),Y(cy+cs/2),cs*s+.5,cs*s+.5)}}

/* ===== v4: seleção de área ===== */
function selStats(){const m=S.selM;if(!m||m.x1-m.x0<30)return;const P=S.qt.rect(m.x0,m.y0,m.x1,m.y1,[]),ar=(m.x1-m.x0)*(m.y1-m.y0),sc=wsum(P),by={},hh=Array(24).fill(0);
 P.forEach(p=>{by[p.t]=(by[p.t]||0)+1;hh[p.h]++});const ra=S.mean?sc/ar/S.mean:0;
 $('sl').innerHTML=`<b>Área selecionada:</b> ${f1(ar/1e6)} km²<br>${P.length} registros · IG ${sc} · <b>${f1(ra)}×</b> a média (<b>${ra>3?'CRÍTICO':ra>1.5?'ALTO':ra>.7?'MÉDIO':'BAIXO'}</b>)<br>`+
 (Object.entries(by).map(([t,n])=>`<span style="color:${T[t].c}">●</span> ${nm(t)} ${n}`).join(' · ')||'sem registros')+(P.length?`<br>Horário de pico: <b>${hh.indexOf(Math.max(...hh))}h</b>`:'')+'<div id="srt" style="margin-top:6px"></div>';selRoute(P)}

const ETICA=['Registro policial não é crime ocorrido: há subnotificação e viés de registro, e o mapa mostra onde se registra, não necessariamente onde se comete.','Concentrar policiamento onde há mais registros pode reforçar o próprio padrão (ciclo de retroalimentação). Use a previsão como apoio, com supervisão humana.','Os pesos de gravidade e a classificação de risco são escolhas de política pública, não verdades técnicas. Documente e revise.','A previsão indica locais e períodos, nunca pessoas. Ela é probabilística e deve ser validada continuamente.','Efetivo, viaturas, capacidade e custos exibidos são valores ilustrativos até serem substituídos por dados oficiais.','Privacidade: o processamento é local no navegador. As rotas reais (OSRM) e o mapa base (Esri) enviam coordenadas e áreas visualizadas a serviços externos.'];

