/* ===== comparação de algoritmos: validação temporal, estatística e recorte por células da QuadTree =====
   Para cada cenário (ou para a base carregada) e cada algoritmo, mede o acerto em janelas de teste (treina só com o que é anterior)
   com duas formas de escolher as áreas a patrulhar, com o MESMO orçamento de área (5% da área de estudo):
     · grade uniforme: as 5% das células de grade com maior pontuação (o que o backtest sempre fez);
     · recorte QuadTree (a proposta do projeto): as folhas da QuadTree construída só com o treino (pequenas onde há muitos registros,
       grandes onde há poucos), em ordem de pontuação por área, até completar o mesmo orçamento.
   O algoritmo é o mesmo nos dois casos; só muda o recorte espacial. Testes: Wilcoxon pareado entre janelas (exato até 25 sem empates),
   intervalo de confiança por bootstrap e correção de Holm dentro de cada cenário. */

/* ---- estatística ---- */
const cmpErf=x=>{const s=Math.sign(x);x=Math.abs(x);const t=1/(1+.3275911*x);return s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x))};
const cmpPhi=z=>.5*(1+cmpErf(z/Math.SQRT2));
/* Wilcoxon de postos sinalizados (bilateral) sobre as diferenças d; zeros são descartados */
function wilcoxon(d){
 const x=d.filter(v=>Number.isFinite(v)&&v!==0),n=x.length;if(!n)return{n:0,p:1,wPos:0,exato:false};
 const o=x.map((v,i)=>[Math.abs(v),i]).sort((a,b)=>a[0]-b[0]),r=new Array(n);let emp=0,tem=false;
 for(let i=0;i<n;){let j=i;while(j+1<n&&o[j+1][0]===o[i][0])j++;const rk=(i+j)/2+1,t=j-i+1;if(t>1){tem=true;emp+=t**3-t}for(let k=i;k<=j;k++)r[o[k][1]]=rk;i=j+1}
 let wp=0;x.forEach((v,i)=>{if(v>0)wp+=r[i]});const tot=n*(n+1)/2,wm=Math.min(wp,tot-wp);
 if(!tem&&n<=25){const w=new Array(tot+1).fill(0);w[0]=1;for(let k=1;k<=n;k++)for(let s=tot;s>=k;s--)w[s]+=w[s-k];let c=0;for(let s=0;s<=wm;s++)c+=w[s];return{n,p:Math.min(1,2*c/2**n),wPos:wp,exato:true}}
 const mu=n*(n+1)/4,v=n*(n+1)*(2*n+1)/24-emp/48,z=(Math.abs(wp-mu)-.5)/Math.sqrt(v);return{n,p:Math.min(1,2*(1-cmpPhi(z))),wPos:wp,z,exato:false}}
/* correção de Holm (controla o erro de ao menos um falso positivo na família) */
function holm(ps){const m=ps.length,o=ps.map((p,i)=>[p,i]).sort((a,b)=>a[0]-b[0]),aj=new Array(m);let mx=0;o.forEach(([p,i],k)=>{mx=Math.max(mx,Math.min(1,(m-k)*p));aj[i]=mx});return aj}
/* intervalo de confiança de 95% da média das diferenças, por bootstrap (reamostra as janelas) */
function bootIC(d,B=2000,seed=7){const n=d.length;if(n<2)return[NaN,NaN];let a=seed|0;const u=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296},m=[];
 for(let b=0;b<B;b++){let s=0;for(let i=0;i<n;i++)s+=d[Math.floor(u()*n)];m.push(s/n)}m.sort((x,y)=>x-y);return[m[Math.floor(.025*B)],m[Math.min(B-1,Math.floor(.975*B))]]}

/* ---- recorte por células da QuadTree ---- */
const btFolhas=(q,o=[])=>{if(q.ch)q.ch.forEach(c=>btFolhas(c,o));else o.push(q);return o};
const btFolhaDe=(q,x,y)=>{let n=q;while(n.ch)n=n.ch[(x>=n.mx)+2*(y>=n.my)];return n};
function btRecorteQT(q,G,tev,frac){
 const gx1=G.x0+G.nx*G.cs,gy1=G.y0+G.ny*G.cs,A=G.n*G.cs*G.cs,B=frac*A,fol=[],pos=new Map();
 for(const l of btFolhas(q)){const w=Math.min(l.x1,gx1)-Math.max(l.x0,G.x0),h=Math.min(l.y1,gy1)-Math.max(l.y0,G.y0);if(w<=0||h<=0)continue;
  const i0=Math.max(0,Math.ceil((l.x0-G.x0)/G.cs-.5)),i1=Math.min(G.nx-1,Math.floor((l.x1-G.x0)/G.cs-.5)),j0=Math.max(0,Math.ceil((l.y0-G.y0)/G.cs-.5)),j1=Math.min(G.ny-1,Math.floor((l.y1-G.y0)/G.cs-.5)),cel=[];
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++)cel.push(i*G.ny+j);
  if(!cel.length)cel.push(Math.min(G.nx-1,Math.max(0,Math.floor((l.mx-G.x0)/G.cs)))*G.ny+Math.min(G.ny-1,Math.max(0,Math.floor((l.my-G.y0)/G.cs))));
  pos.set(l,fol.length);fol.push({a:w*h,cel})}
 const cont=new Array(fol.length).fill(0);for(const p of tev){const k=pos.get(btFolhaDe(q,p.x,p.y));if(k!==undefined)cont[k]++}
 /* escolhe folhas por densidade (pontuação por área) até completar o orçamento de área; folhas que estourariam o orçamento são puladas */
 const escolher=dens=>{const ord=dens.map((_,i)=>i).sort((u,v)=>dens[v]-dens[u]||u-v),sel=[];let cum=0;for(const k of ord)if(cum+fol[k].a<=B){sel.push(k);cum+=fol[k].a}return{sel,cum}};
 const mx=escolher(fol.map((f,k)=>cont[k]/f.a)),maxHit=mx.sel.reduce((s,k)=>s+cont[k],0),nt=tev.length;
 return{nFolhas:fol.length,avaliar(S){const dens=fol.map(f=>f.cel.reduce((s,k)=>s+S[k],0)/f.cel.length),o=escolher(dens),nh=o.sel.reduce((s,k)=>s+cont[k],0),hit=nt?nh/nt*100:0,fr=o.cum/A;
  return{hitQ:hit,paiQ:fr>0?hit/(fr*100):0,peiQ:maxHit?nh/maxHit:0,areaQ:fr}}}}

/* ---- KDE adaptativo (largura de banda variável, medida com a QuadTree) ----
   Cada registro de treino espalha seu peso (recência, meia-vida hl) num kernel triangular de raio h = distância ao k-ésimo vizinho (vizinhos
   mais próximos pela QuadTree), limitada a [R/2, 2R]. O kernel é normalizado pela área (π·h²/3): onde há muitos registros o foco fica
   estreito e preciso; onde há poucos, fica suave. Mesmo peso temporal do método "Recência (meia-vida hl)", então a diferença entre os dois
   vem só da largura de banda (variável × fixa em R). Só para comparação: não entra no seletor nem na escolha automática. */
const KDEA_K=15;
function btMetKDEA(hl,R){return{id:'K',nome:`KDE adaptativo, QuadTree (meia-vida ${hl} d)`,ref:true,vs:'C'+hl,escore:({tr,q,G,cut})=>{
 const s=new Float32Array(G.n),hmin=R/2,hmax=2*R,k=Math.min(KDEA_K+1,tr.length);
 for(const p of tr){const w=Math.exp(-Math.LN2*(p.ago-cut)/hl);if(w<1e-3)continue;
  const b=q.knn(p.x,p.y,k,[],{v:0}),h=Math.min(hmax,Math.max(hmin,Math.sqrt(b[b.length-1].d))),a=w*3/(Math.PI*h*h);
  const i0=Math.max(0,Math.floor((p.x-h-G.x0)/G.cs-.5)),i1=Math.min(G.nx-1,Math.ceil((p.x+h-G.x0)/G.cs-.5)),j0=Math.max(0,Math.floor((p.y-h-G.y0)/G.cs-.5)),j1=Math.min(G.ny-1,Math.ceil((p.y+h-G.y0)/G.cs-.5));
  for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const d=Math.hypot(G.x0+(i+.5)*G.cs-p.x,G.y0+(j+.5)*G.cs-p.y);if(d<h)s[i*G.ny+j]+=a*(1-d/h)}}
 return{s}}}}

/* ---- execução ---- */
const CMP={res:null,rodando:false,parar:false};
const cmpFolga=()=>new Promise(r=>setTimeout(r,0));
async function cmpRodar({fonte='cenarios',sementes=5,janelas=0,onProg=()=>{}}={}){
 const R=+$('R').value,HL=+$('hl').value||45,salvo={all:S.all,box:S.box,bb:S.bb,area:S.area},raw=[];CMP.rodando=true;CMP.parar=false;
 try{
  const tarefas=fonte==='cenarios'?Object.keys(BASES_TESTE).flatMap(id=>Array.from({length:sementes},(_,i)=>({id,seed:i+1}))):[{id:'carregada',seed:0}];let k=0;
  for(const t of tarefas){if(CMP.parar)break;onProg(++k,tarefas.length,t);await cmpFolga();
   let P=salvo.all,verdade=null,nome=($('src').textContent||'').replace(/^·\s*/,'')||'Base carregada';
   if(t.id!=='carregada'){const o=BASES_TESTE[t.id].gerar(t.seed);P=o.pontos;verdade=o.verdade;nome=BASES_TESTE[t.id].nome}
   P=btRebase(P);S.all=P;setBox();/* a QuadTree usa a caixa dos dados em S.box */
   const sp=btSpan(P);let W,cortes;
   if(t.id==='carnaval'){W=4;cortes=verdade.janelas.filter(j=>j.historicoDias>=400).map(j=>j.cut)}else{W=btHorizonte(sp,'auto');cortes=btCortes(sp,W,janelas||BT_MAX_JAN)}
   const mets=[...btMetodos(HL,sp,W),btMetKDEA(HL,R)],G=btGrade(P,R);let sc=raw.find(r=>r.id===t.id);
   if(!sc){sc={id:t.id,nome,W,mets:mets.map(m=>({id:m.id,nome:m.nome,ref:!!m.ref,vs:m.vs})),wins:[]};raw.push(sc)}
   for(const c of cortes){const w=btJanela(P,G,R,c,mets,W,{qt:true});if(w)sc.wins.push({seed:t.seed,cut:c,res:w.res,par:w.par,nQT:w.nQT,ntr:w.ntr,nte:w.nte});await cmpFolga()}}
 }finally{S.all=salvo.all;S.box=salvo.box;S.bb=salvo.bb;S.area=salvo.area;CMP.rodando=false}
 const res=cmpAgregar(raw);res.params={R,HL,fonte,sementes:fonte==='cenarios'?sementes:0,profundidade:+$('dep').value,parou:CMP.parar};CMP.res=res;cmpRelatorio(res);return res}

/* ---- agregação e testes ---- */
function cmpAgregar(raw){
 const media=btMedia,sd=btDP;
 const cenarios=raw.filter(sc=>sc.wins.length).map(sc=>{const wins=sc.wins,n=wins.length,col=(id,k)=>wins.map(w=>w.res[id][k]);
  const linhas=sc.mets.map(m=>{const g=col(m.id,'hit'),q=col(m.id,'hitQ'),b=col('B','hit'),dB=g.map((v,i)=>v-b[i]),dC=q.map((v,i)=>v-g[i]);
   return{id:m.id,nome:m.nome,ref:m.ref,
    grade:{hit:media(g),sd:sd(g),pai:media(col(m.id,'pai')),pei:media(col(m.id,'pei'))},
    qt:{hit:media(q),sd:sd(q),pai:media(col(m.id,'paiQ')),pei:media(col(m.id,'peiQ')),area:media(col(m.id,'areaQ'))},
    dBase:{m:media(dB),ic:bootIC(dB),p:wilcoxon(dB).p},dCorte:{m:media(dC),ic:bootIC(dC),p:wilcoxon(dC).p},
    /* comparação pareada direta com o método de mesma recência (só para o KDE adaptativo): isola o efeito da largura de banda */
    dVs:m.vs&&wins.every(w=>w.res[m.vs])?(d=>({vs:m.vs,m:media(d),ic:bootIC(d),p:wilcoxon(d).p}))(g.map((v,i)=>v-col(m.vs,'hit')[i])):null}});
  const fb=linhas.filter(l=>l.id!=='B'),ab=holm(fb.map(l=>l.dBase.p)),ac=holm(linhas.map(l=>l.dCorte.p));
  fb.forEach((l,i)=>l.dBase.padj=ab[i]);linhas.forEach((l,i)=>l.dCorte.padj=ac[i]);
  const melhor=k=>linhas.reduce((b,l)=>l[k].hit>b[k].hit?l:b,linhas[0]).id,sem=new Set(wins.map(w=>w.seed)).size;
  return{id:sc.id,nome:sc.nome,W:sc.W,n,sementes:sem,nFolhas:Math.round(media(wins.map(w=>w.nQT))),linhas,melhorGrade:melhor('grade'),melhorQT:melhor('qt'),
   etas:wins.some(w=>w.par&&w.par.E)?{th:media(wins.filter(w=>w.par&&w.par.E).map(w=>w.par.E.th)),vida:media(wins.filter(w=>w.par&&w.par.E).map(w=>1/w.par.E.om)),sg:media(wins.filter(w=>w.par&&w.par.E).map(w=>w.par.E.sg))}:null}});
 let fav=0,contra=0,neutro=0,total=0;cenarios.forEach(c=>c.linhas.forEach(l=>{total++;const d=l.dCorte;if(d.padj<.05)d.m>0?fav++:contra++;else neutro++}));
 return{cenarios,resumo:{total,fav,contra,neutro}}}

/* ---- tabelas, texto e relatório ---- */
const cmpN=(v,c=1)=>Number.isFinite(v)?v.toFixed(c).replace('.',','):'—',cmpP=p=>p==null||!Number.isFinite(p)?'—':p<.001?'<0,001':cmpN(p,3),cmpD=l=>`${l.m>=0?'+':''}${cmpN(l.m)} (${cmpN(l.ic[0])} a ${cmpN(l.ic[1])})`;
function cmpTabela(c){const H=['Método','Grade: acerto %','PAI','PEI*','QuadTree: acerto %','PAI','PEI*','Δ vs KDE, p.p. (IC 95%)','p (Holm)','Δ recorte, p.p. (IC 95%)','p (Holm)'];
 return{h:H,r:c.linhas.map(l=>[l.nome+(l.ref?' †':''),cmpN(l.grade.hit),cmpN(l.grade.pai),cmpN(l.grade.pei,2),cmpN(l.qt.hit),cmpN(l.qt.pai),cmpN(l.qt.pei,2),l.id==='B'?'—':cmpD(l.dBase),l.id==='B'?'—':cmpP(l.dBase.padj),cmpD(l.dCorte),cmpP(l.dCorte.padj)])}}
function cmpRelatorio(R){if(!R||!R.cenarios.length){delete S.rep.compAlg;return}
 const sg=v=>(v>=0?'+':'')+cmpN(v);
 S.rep.compAlg={h:['Cenário','Método','Grade: acerto %','PAI','PEI*','QuadTree: acerto %','PAI','PEI*','Δ vs KDE (p.p.)','p (Holm)','Δ recorte (p.p.)','p (Holm)'],r:R.cenarios.flatMap(c=>c.linhas.map(l=>[c.nome,l.nome+(l.ref?' (literatura)':''),cmpN(l.grade.hit),cmpN(l.grade.pai),cmpN(l.grade.pei,2),cmpN(l.qt.hit),cmpN(l.qt.pai),cmpN(l.qt.pei,2),l.id==='B'?'—':sg(l.dBase.m),l.id==='B'?'—':cmpP(l.dBase.padj),sg(l.dCorte.m),cmpP(l.dCorte.padj)]))};
 S.rep.compAlgDados=R}
const CMP_LEGENDA='Acerto = % dos registros de teste que caem nas áreas escolhidas; os dois recortes usam o mesmo orçamento de área (5% da área de estudo). PAI = acerto ÷ fração da área usada. PEI* = acertos ÷ máximo possível com o mesmo recorte (0 a 1). Δ = diferença média por janela, em pontos percentuais, com intervalo de confiança de 95% por bootstrap das janelas; p = teste de Wilcoxon pareado, corrigido por Holm dentro do cenário. † = algoritmo da literatura, só para comparação. As janelas de uma mesma semente compartilham dados de treino, então os p-valores são aproximados (tendem a ser otimistas).';
function cmpResumoTexto(R){const r=R.resumo,p=R.params||{};
 return`${R.cenarios.length} cenário(s), ${p.fonte==='cenarios'?p.sementes+' semente(s), ':''}recorte QuadTree com profundidade máxima ${p.profundidade}. Em ${r.total} combinações algoritmo × cenário, o recorte por células da QuadTree ${r.fav?`<b>melhorou o acerto de forma significativa em ${r.fav}</b>`:'não melhorou o acerto de forma significativa em nenhuma'}${r.contra?`, <b>piorou em ${r.contra}</b>`:''} e não mostrou diferença significativa em ${r.neutro} (p ajustado por Holm < 0,05).`}
function cmpHTML(R){
 if(!R)return'<div class="card"><p class="mu">Escolha a fonte e clique em <b>Rodar comparação</b>. Cada algoritmo é avaliado em janelas de teste (treina só com o que é anterior), com a grade uniforme e com o recorte por células da QuadTree, usando a mesma área.</p></div>';
 const nome=id=>({A:'Últimos N dias',B:'KDE (histórico)',P:'Prospective hot-spotting',E:'ETAS'}[id]||id);
 return`<div class="card"><p>${cmpResumoTexto(R)}</p><small class="mu">${CMP_LEGENDA}</small></div>`+R.cenarios.map(c=>{const t=cmpTabela(c),mg=c.linhas.find(l=>l.id===c.melhorGrade),mq=c.linhas.find(l=>l.id===c.melhorQT),b=c.linhas.find(l=>l.id==='B');
  return`<div class="card cmpc"><h3>${esc(c.nome)}</h3><small class="mu">${c.n} janela(s) de ${c.W} d${c.sementes>1?` em ${c.sementes} sementes`:''}; ${c.nFolhas} células na QuadTree em média. Melhor na grade: <b>${esc(mg.nome)}</b> (${cmpN(mg.grade.hit)}%); melhor com o recorte QuadTree: <b>${esc(mq.nome)}</b> (${cmpN(mq.qt.hit)}%).${c.etas?` ETAS: θ=${cmpN(c.etas.th,2)}, vida ${cmpN(c.etas.vida)} d, σ=${cmpN(c.etas.sg,0)} m.`:''}</small>
   <div class="tw"><table class="cmpt"><tr>${t.h.map(h=>`<th>${h}</th>`).join('')}</tr>${t.r.map((r,i)=>`<tr${c.linhas[i].ref?' class="ref"':''}>${r.map((x,j)=>`<td${(j===8||j===10)&&parseFloat(String(x).replace(',','.').replace('<',''))<.05?' class="sig"':''}>${esc(x)}</td>`).join('')}</tr>`).join('')}</table></div></div>`}).join('')}
function cmpCSV(){if(!S.rep.compAlg)return toast('Rode a comparação primeiro.','er');const t=S.rep.compAlg;dlf('comparacao_algoritmos.csv','﻿'+[t.h,...t.r].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\n'),'text/csv')}

/* ---- tela (aba Comparação) ---- */
const CMPUI={fonte:'cenarios'};
function renderCmp(){if(typeof VISTA!=='undefined'&&VISTA!=='cmp')return;
 const s=CMP.rodando?'':CMP.res?cmpResumoTexto(CMP.res):'Compara os algoritmos nos cenários de teste (ou na base carregada) com a grade uniforme e com o recorte por células da QuadTree.';
 if(!CMP.rodando){$('vcs').innerHTML=s;$('vcx').innerHTML=cmpHTML(CMP.res)}}
$('vcf').onclick=e=>{const b=e.target.closest('button');if(!b||CMP.rodando)return;CMPUI.fonte=b.dataset.f;[...$('vcf').children].forEach(x=>x.classList.toggle('on',x===b));$('vcn').closest('label').hidden=CMPUI.fonte!=='cenarios'};
$('vcr').onclick=async()=>{if(CMP.rodando){CMP.parar=true;$('vcr').textContent='Parando…';return}
 const n=Math.min(20,Math.max(1,+$('vcn').value|0||5));$('vcr').textContent='Parar';$('vcr').classList.remove('pri');$('vcp').hidden=false;$('vcx').innerHTML='';
 const t0=performance.now();
 try{await cmpRodar({fonte:CMPUI.fonte,sementes:n,onProg:(k,tot,t)=>{$('vcp').textContent=`Rodando ${k} de ${tot}: ${t.id==='carregada'?'base carregada':BASES_TESTE[t.id].nome+' (semente '+t.seed+')'} · ${Math.round((performance.now()-t0)/1000)} s`}});
  $('vcp').textContent=`Concluído em ${Math.round((performance.now()-t0)/1000)} s.${CMP.res.params.parou?' (interrompido)':''}`}
 catch(e){$('vcp').textContent='Erro na comparação: '+e.message;CMP.res=null}
 $('vcr').textContent='Rodar comparação';$('vcr').classList.add('pri');renderCmp()};
$('vcc').onclick=cmpCSV;
