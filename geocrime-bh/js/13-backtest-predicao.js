/* ===== predição com backtest, ajustada à quantidade de meses da base =====
   O horizonte da previsão (W dias) e o número de janelas do backtest dependem do tamanho do histórico:
     · poucos meses  → horizonte curto (7 ou 14 dias) e janelas curtas;
     · 8 meses ou mais → 30 dias;
     · mais de 13 meses → também compara com o "mesmo período do ano anterior" (sazonalidade).
   Cada método é validado em janelas de W dias, treinando só com o que é anterior à janela.
   Acerto = % dos registros da janela que caíram nos 5% de células mais bem pontuadas (acaso ≈ 5%). */
const BT_TREINO_MIN=100,BT_TESTE_MIN=12,BT_MAX_JAN=6;
const btHLs=hl=>[...new Set([15,30,60,120,hl].filter(v=>v>0))].sort((a,b)=>a-b);
/* a idade (ago) é contada a partir de hoje; se a base termina há meses, as janelas de teste ficariam vazias. Aqui o registro mais recente passa a ser o dia 0 (só no backtest, em cópias) */
const btRebase=P=>{let m=Infinity;for(const p of P)if(p.ago<m)m=p.ago;return m>0&&m<Infinity?P.map(p=>({...p,ago:p.ago-m})):P};
const btSpan=P=>P.length?Math.max(...P.map(p=>p.ago))+1:0;                 // dias cobertos pela base
const btMeses=sp=>sp/30.44;
/* horizonte: o escolhido pelo usuário (se couber) ou o melhor para o tamanho da base */
function btHorizonte(span,pedido){const op=btOpcoes(span);if(pedido&&pedido!=='auto'&&op.includes(+pedido))return+pedido;return span>=240?30:span>=90?14:7}
const btOpcoes=span=>[7,14,30,60,90].filter(w=>w*3<=span||w===7);
const btCortes=(span,W,max=BT_MAX_JAN)=>{const c=[];for(let k=1;k<=max&&k*W+2*W<=span;k++)c.push(k*W);return c};
const btTemSazonal=(span,W)=>span>=365+2*W;
const btMetodos=(hl,span,W)=>[{id:'A',nome:`Últimos ${W} dias`},{id:'B',nome:'Histórico completo'},...btHLs(hl).map(h=>({id:'C'+h,nome:`Recência (meia-vida ${h} d)`,hl:h})),...(btTemSazonal(span,W)?[{id:'Z',nome:'Mesmo período do ano anterior'}]:[]),...BT_REF];
/* peso de um registro para a previsão feita no instante "cut" (idade contada a partir do corte) */
const btPeso=(m,p,cut,W)=>m.id==='A'?(p.ago>=cut&&p.ago<cut+W?1:0):m.id==='B'?1:m.id==='Z'?(p.ago>=cut+365-W&&p.ago<cut+365?1:0):Math.exp(-Math.LN2*(p.ago-cut)/m.hl);
const btMedia=a=>a.reduce((x,y)=>x+y,0)/(a.length||1),btDP=a=>{const m=btMedia(a);return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/Math.max(1,a.length-1))};

function btGrade(P,R){const[a,b,c,d]=bboxOf(P),cs=Math.max(R,200,Math.sqrt((c-a+2*R)*(d-b+2*R)/4000)),x0=a-R,y0=b-R,nx=Math.ceil((c-a+2*R)/cs),ny=Math.ceil((d-b+2*R)/cs);return{cs,x0,y0,nx,ny,n:nx*ny}}

/* uma janela: treino = registros mais antigos que o corte; teste = os W dias seguintes ao corte */
/* opt.qt: avalia também o recorte por células da QuadTree (ver 13b-comparacao.js) */
function btJanela(P,G,R,cut,mets,W,opt){
 const tr=P.filter(p=>p.ago>=cut),te=P.filter(p=>p.ago>=cut-W&&p.ago<cut);if(tr.length<BT_TREINO_MIN||te.length<BT_TESTE_MIN)return null;
 const q=mkQT();tr.forEach(p=>q.ins(p));const S_=mets.map(()=>new Float32Array(G.n));
 for(let i=0;i<G.nx;i++)for(let j=0;j<G.ny;j++){const cx=G.x0+(i+.5)*G.cs,cy=G.y0+(j+.5)*G.cs,ns=q.rng(cx,cy,R,[],{v:0});if(!ns.length)continue;const k=i*G.ny+j;
  for(const p of ns){const kw=1-Math.hypot(p.x-cx,p.y-cy)/R;for(let m=0;m<mets.length;m++)if(!mets[m].escore)S_[m][k]+=kw*btPeso(mets[m],p,cut,W)}}
 const par={};mets.forEach((m,mi)=>{if(m.escore){const o=m.escore({tr,q,G,cut,W});S_[mi]=o.s;par[m.id]=o.par}});
 const N=Math.max(1,Math.round(.05*G.n)),cel=p=>{const i=Math.floor((p.x-G.x0)/G.cs),j=Math.floor((p.y-G.y0)/G.cs);return i>=0&&j>=0&&i<G.nx&&j<G.ny?i*G.ny+j:-1};
 const tev=te.filter(p=>cel(p)>=0),tc=te.map(cel).filter(k=>k>=0),res={},cnt=new Map();tc.forEach(k=>cnt.set(k,(cnt.get(k)||0)+1));const maxHit=[...cnt.values()].sort((a,b)=>b-a).slice(0,N).reduce((a,b)=>a+b,0);/* máximo de acertos possível com N células (para o PEI*) */
 mets.forEach((m,mi)=>{const set=new Set(Array.from({length:G.n},(_,k)=>k).sort((u,v)=>S_[mi][v]-S_[mi][u]||u-v).slice(0,N)),nh=tc.filter(k=>set.has(k)).length,hit=tc.length?nh/tc.length*100:0;res[m.id]={hit,pai:hit/(N/G.n*100),pei:maxHit?nh/maxHit:0}});
 let nQT=0;if(opt&&opt.qt){const Q=btRecorteQT(q,G,tev,.05);nQT=Q.nFolhas;mets.forEach((m,mi)=>Object.assign(res[m.id],Q.avaliar(S_[mi])))}
 return{par,nQT,cut,ntr:tr.length,nte:te.length,trMinAgo:Math.min(...tr.map(p=>p.ago)),teMinAgo:Math.min(...te.map(p=>p.ago)),teMaxAgo:Math.max(...te.map(p=>p.ago)),res}}

function btResumo(wins,mets){
 const n=wins.length,st={};
 for(const m of mets){const h=wins.map(w=>w.res[m.id].hit),dif=wins.map(w=>w.res[m.id].hit-w.res.A.hit),md=btMedia(dif);
  st[m.id]={nome:m.nome,ref:!!m.ref,hit:btMedia(h),dp:btDP(h),pai:btMedia(wins.map(w=>w.res[m.id].pai)),pei:btMedia(wins.map(w=>w.res[m.id].pei)),vit:dif.filter(d=>d>0).length,dif:md,se:btDP(dif)/Math.sqrt(n)}}
 const prop=mets.filter(m=>!m.ref),bruto=prop.reduce((b,m)=>st[m.id].hit>st[b.id].hit+1e-9?m:b,prop[0]).id;
 let melhor=bruto,consistente=true;
 if(bruto!=='A'){const s=st[bruto];consistente=n>=3&&s.vit>=Math.ceil(.7*n)&&s.dif>s.se;if(!consistente)melhor='A'}
 const pe=wins.map(w=>w.par&&w.par.E).filter(Boolean),par=pe.length?{E:{th:btMedia(pe.map(x=>x.th)),om:btMedia(pe.map(x=>x.om)),sg:btMedia(pe.map(x=>x.sg)),N:Math.round(btMedia(pe.map(x=>x.N)))}}:{};
 return{n,st,bruto,melhor,consistente,par}}

/* ---- algoritmos da literatura (só para comparação: aparecem no backtest, mas não mudam o mapa nem a escolha automática) ----
   P  Prospective hot-spotting, Bowers, Johnson e Pease (2004, Br. J. Criminol.): cada registro recente eleva o risco ao redor, e o efeito
      cai com a distância e o tempo. Implementação própria da ideia: peso 1/((1+faixa de distância de 100 m)·(1+semana)), até 400 m e 60 dias.
   E  Processo auto-excitante (tipo ETAS), Mohler et al. (2011, JASA): intensidade = fundo μ(x) + gatilhos θ·ω·e^(−ω·Δt)·g_σ(Δx); parâmetros
      por EM (declustering estocástico) com tempo em dias; previsão = integral da intensidade no horizonte. Usa no máximo os 4.000 registros mais recentes. */
const BT_REF=[{id:'P',nome:'Prospective hot-spotting (Bowers 2004)',ref:true,escore:btEscoreProspectivo},{id:'E',nome:'Processo auto-excitante / ETAS (Mohler 2011)',ref:true,escore:btEscoreETAS}];
function btEscoreProspectivo({q,G,cut}){const s=new Float32Array(G.n);
 for(let i=0;i<G.nx;i++)for(let j=0;j<G.ny;j++){const cx=G.x0+(i+.5)*G.cs,cy=G.y0+(j+.5)*G.cs;let t=0;
  for(const p of q.rng(cx,cy,400,[],{v:0})){const a=p.ago-cut;if(a>=60)continue;t+=1/((1+Math.floor(Math.hypot(p.x-cx,p.y-cy)/100))*(1+Math.floor(a/7)))}
  s[i*G.ny+j]=t}
 return{s}}
function btEscoreETAS({tr,G,cut,W}){
 const RAD=900,H=300,TMAX=30,MAXN=4000,gk=(d,s)=>Math.exp(-d*d/(2*s*s))/(2*Math.PI*s*s);
 const ev=tr.length>MAXN?tr.slice().sort((a,b)=>a.ago-b.ago).slice(0,MAXN):tr,N=ev.length,u=ev.map(p=>p.ago-cut),T=Math.max(...u)+1;
 const qe=mkQT();ev.forEach(p=>qe.ins(p));const idx=new Map(ev.map((p,i)=>[p,i]));
 const nb=ev.map((p,i)=>{const o=[];for(const r of qe.rng(p.x,p.y,RAD,[],{v:0})){const j=idx.get(r);if(j===i||j===undefined)continue;o.push([j,Math.hypot(r.x-p.x,r.y-p.y)])}return o});
 /* candidatos a "pai" de cada registro: mais antigos (ou do mesmo dia, de índice menor), até 30 dias antes */
 const pais=nb.map((l,i)=>l.filter(([j])=>{const dt=u[j]-u[i];return dt<=TMAX&&(dt>0||(dt===0&&j<i))}).map(([j,d])=>[j,d,Math.max(.5,u[j]-u[i])]));
 let th=.3,om=1/7,sg=200,pb=new Float64Array(N).fill(.7);
 for(let it=0;it<12;it++){
  const mu=ev.map((p,i)=>{let s=pb[i]*gk(0,H);for(const[j,d]of nb[i])if(d<=3*H)s+=pb[j]*gk(d,H);return s/T});
  let sT=0,sTdt=0,sR2=0;const npb=new Float64Array(N);
  for(let i=0;i<N;i++){let tot=mu[i];const v=pais[i].map(([j,d,dt])=>{const x=th*om*Math.exp(-om*dt)*gk(d,sg);tot+=x;return x});
   if(!(tot>0)){npb[i]=1;continue}
   npb[i]=mu[i]/tot;pais[i].forEach(([j,d,dt],k)=>{const w=v[k]/tot;sT+=w;sTdt+=w*dt;sR2+=w*d*d})}
  th=Math.min(.95,Math.max(.01,sT/N));if(sTdt>0)om=Math.min(2,Math.max(1/TMAX,sT/sTdt));if(sT>0)sg=Math.min(600,Math.max(40,Math.sqrt(sR2/(2*sT))));pb=npb}
 const s=new Float32Array(G.n),k1=1-Math.exp(-om*W);
 for(let i=0;i<G.nx;i++)for(let j=0;j<G.ny;j++){const cx=G.x0+(i+.5)*G.cs,cy=G.y0+(j+.5)*G.cs;let m=0,g=0;
  for(const r of qe.rng(cx,cy,RAD,[],{v:0})){const a=idx.get(r);if(a===undefined)continue;const d=Math.hypot(r.x-cx,r.y-cy);if(d<=3*H)m+=pb[a]*gk(d,H);if(d<=3*sg&&u[a]<=60)g+=th*Math.exp(-om*u[a])*k1*gk(d,sg)}
  s[i*G.ny+j]=m/T*W+g}
 return{s,par:{th,om,sg,N}}}

/* ---- volume por região ---- */
const BT_VOL=[{id:'V1',nome:'Último período'},{id:'V2',nome:'Média de 3 períodos'},{id:'V3',nome:'Tendência linear'}];
function btVolDados(P,wv,cut,W){const M=RG.map(()=>Array(13).fill(0));P.forEach(p=>{if(p.ago<cut)return;const k=Math.floor((p.ago-cut)/W);if(k<13)M[p.r][k]+=wv(p)});return M}
function volPrev(b,metodo,span){
 const y=b.slice(0,Math.max(1,Math.min(12,span))).reverse();
 if(metodo==='V1'||y.length<2)return y[y.length-1];
 if(metodo==='V2'||y.length<4){const l=y.slice(-3);return btMedia(l)}
 const n=y.length,mx=(n-1)/2,my=btMedia(y);let sxy=0,sxx=0;y.forEach((v,i)=>{sxy+=(i-mx)*(v-my);sxx+=(i-mx)**2});
 return Math.max(0,Math.min(2*Math.max(...y,1),my+(sxx?sxy/sxx:0)*(n-mx)))}
function btVolume(P,wv,W,cortes,sp){
 const err={V1:0,V2:0,V3:0},errT={V1:0,V2:0,V3:0};let act=0,nj=0;
 for(const c of cortes){const span=Math.floor((sp-c)/W);if(span<2)continue;const H=btVolDados(P,wv,c,W),A=RG.map(()=>0);
  P.forEach(p=>{if(p.ago>=c-W&&p.ago<c)A[p.r]+=wv(p)});const tot=A.reduce((a,v)=>a+v,0);if(!tot)continue;nj++;act+=tot;
  for(const m of BT_VOL){let ps=0;H.forEach((b,r)=>{const pv=volPrev(b,m.id,span);ps+=pv;err[m.id]+=Math.abs(pv-A[r])});errT[m.id]+=Math.abs(ps-tot)}}
 const wape={},wapeT={};BT_VOL.forEach(m=>{wape[m.id]=act?err[m.id]/act:null;wapeT[m.id]=act?errT[m.id]/act:null});
 const ok=BT_VOL.filter(m=>wape[m.id]!=null);
 return{n:nj,wape,wapeT,melhor:ok.length?ok.reduce((b,m)=>wape[m.id]<wape[b.id]-1e-9?m:b,ok[0]).id:'V2'}}

function btRun(P,R,hl,wv,pedido){
 P=btRebase(P);
 const sp=btSpan(P),W=btHorizonte(sp,pedido),mets=btMetodos(hl,sp,W),G=btGrade(P,R),cortes=btCortes(sp,W),wins=[];
 for(const c of cortes){const w=btJanela(P,G,R,c,mets,W);if(w)wins.push(w)}
 return{mets,wins,res:wins.length>=2?btResumo(wins,mets):null,vol:btVolume(P,wv,W,cortes,sp),G,W,sp,meses:btMeses(sp),cortes,opcoes:btOpcoes(sp),sazonal:btTemSazonal(sp,W),pedido:pedido||'auto'}}
let BTC={k:'',v:null};
function btCache(P,R,hl,wv,tag,pedido){const k=[tag,R,hl,P.length,RG.length,pedido||'auto'].join('|');if(BTC.k!==k)BTC={k,v:btRun(P,R,hl,wv,pedido)};return BTC.v}

/* ---- texto e tabelas do backtest (painel do mapa de predição e relatório) ---- */
function btBase(bt){const d=n=>new Date(Date.now()-n*864e5).toLocaleDateString('pt-BR',{month:'short',year:'numeric'}).replace('.','');
 const aviso=bt.pedido!=='auto'&&+bt.pedido!==bt.W?` (o horizonte pedido de ${bt.pedido} d não cabe nesta base)`:'';
 return`Base com <b>${f1(bt.meses)} ${bt.meses<1.5?'mês':'meses'}</b> (${d(bt.sp-1)} a ${d(0)}): previsão para os próximos <b>${bt.W} dias</b>${aviso}, validada em ${bt.wins.length} janela(s) de ${bt.W} d${bt.sazonal?'; com mais de 13 meses, o app também compara com o mesmo período do ano anterior':bt.meses<13?'; a sazonalidade anual só entra com mais de 13 meses de dados':''}.`}
function btTexto(M){
 const bt=M.bt,r=bt.res,p=x=>f1(x)+'%',W=bt.W;
 const base=`<div class="hint">${btBase(bt)}</div>`;
 if(!r)return base+`<div class="hint">Histórico curto: ${bt.wins.length} janela(s) válida(s). Para validar preciso de ao menos 2 janelas de ${W} dias com ${BT_TREINO_MIN}+ registros de treino e ${BT_TESTE_MIN}+ de teste. Usando ${M.metodo.nome}, sem prova de desempenho.</div>`;
 let v;
 if(r.melhor!=='A')v=`<b>${r.st[r.melhor].nome}</b> supera os últimos ${W} dias em ${r.st[r.melhor].vit} de ${r.n} janelas (${r.st[r.melhor].dif>=0?'+':''}${f1(r.st[r.melhor].dif)} p.p.).`;
 else if(r.bruto!=='A')v=`${r.st[r.bruto].nome} teve o maior acerto médio, mas o ganho sobre os últimos ${W} dias <b>não é consistente</b> (${r.st[r.bruto].vit} de ${r.n} janelas; ${f1(r.st[r.bruto].dif)} p.p.). Por isso o automático usa o método mais simples: <b>últimos ${W} dias</b>.`;
 else v='Nenhum método superou o período anterior nesta base: o automático usa o mais simples.';
 const rows=bt.mets.map(m=>{const s=r.st[m.id],uso=m.id===M.metodo.id;return`<tr${uso?' style="font-weight:700;color:var(--ac)"':''}><td>${m.nome}${m.ref?' †':''}${uso?' ✓':''}</td><td>${p(s.hit)}</td><td>${f1(s.pai)}</td><td>${f2(s.pei)}</td><td>${m.id==='A'?'—':s.vit+'/'+r.n}</td></tr>`}).join('');
 return base+`<div class="hint">${v}</div><div style="overflow-x:auto"><table style="font-size:11px;white-space:nowrap"><tr><th>Método</th><th>Acerto</th><th>PAI</th><th>PEI*</th><th>Vit.</th></tr>${rows}</table></div><small style="color:var(--mu)">${r.n} janela(s) de ${W} d. Acerto = % dos registros do período seguinte nos 5% de células mais pontuadas (acaso ≈ 5%). PAI = acerto ÷ 5. PEI* = acertos ÷ máximo possível com a mesma área (0 a 1). Vit. = janelas em que o método superou os últimos ${W} dias. † = algoritmo da literatura, só para comparação: não muda o mapa nem o método automático.</small>`}
function btVolTexto(M){const v=M.bt.vol;if(!v.n)return'<small style="color:var(--mu)">Volume: sem janelas para validar; usando a média dos últimos períodos.</small>';
 return`<small style="color:var(--mu)">Volume por região: <b>${BT_VOL.find(m=>m.id===M.vm).nome}</b> (erro médio ${f1(v.wape[M.vm]*100)}% em ${v.n} janela(s); último período ${f1(v.wape.V1*100)}%, média de 3 períodos ${f1(v.wape.V2*100)}%, tendência ${f1(v.wape.V3*100)}%).</small>`}
function btRelatorio(M){const r=M.bt.res,v=M.bt.vol,W=M.bt.W;
 S.rep.backtest=r?{h:['Método','Acerto médio %','Desvio','PAI','PEI*',`Janelas vencidas vs últimos ${W} dias`,'Em uso'],r:M.bt.mets.map(m=>[m.nome+(m.ref?' (literatura)':''),f1(r.st[m.id].hit),f1(r.st[m.id].dp),f1(r.st[m.id].pai),f2(r.st[m.id].pei),m.id==='A'?'—':r.st[m.id].vit+'/'+r.n,m.id===M.metodo.id?'sim':''])}:{h:['Situação'],r:[['Histórico curto: sem validação']]};
 S.rep.backtestVolume={h:['Método de volume','Erro (WAPE) %','Em uso'],r:BT_VOL.map(m=>[m.nome,v.wape[m.id]==null?'—':f1(v.wape[m.id]*100),m.id===M.vm?'sim':''])}}

/* ---- predição do botão "Prever" ---- */
function predRun(){
 pmOpen();const M=S.pm;if(!M){$('pr').textContent='Dados insuficientes para prever (mínimo de 50 registros no recorte).';return}
 const W=M.bt.W,H=['Região',`Últ. ${W} d`,`Prev. ${W} d`,'Δ'],R_=RG.map((r,i)=>[r.n,Math.round(M.ult[i]),Math.round(M.F[i]),(Math.round(M.F[i])-Math.round(M.ult[i])>=0?'+':'')+(Math.round(M.F[i])-Math.round(M.ult[i]))]);S.rep.previsao={h:H,r:R_};
 $('pr').innerHTML=`<b>Método em uso:</b> ${M.metodo.nome}${M.auto?' (escolhido pelo backtest)':' (escolhido por você)'}<br>`+btTexto(M)+btVolTexto(M)+
  `<button id="pmo" class="pri" style="width:100%;margin:6px 0">Abrir mapa de predição</button><b>Previsão por região (próximos ${W} dias)</b>`+tbl(H,R_)}
