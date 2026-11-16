/* ===== bases de teste (sintéticas, com resposta conhecida) =====
   Cada cenário gera os registros a partir de uma semente (mesma semente = mesmos dados) e devolve também a "verdade": o que foi
   plantado nos dados (focos, deriva, contágio, sazonalidade, carnaval). Servem para comparar os algoritmos de previsão em situações em
   que se sabe qual deles deveria ir melhor. Os dados são fictícios e não representam a criminalidade real. */
function prng(seed){let a=(seed|0)||1;
 const u=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296},
  g=()=>Math.sqrt(-2*Math.log(u()||1e-9))*Math.cos(2*Math.PI*u());
 return{u,g,exp:m=>-m*Math.log(1-u()),poisson:l=>{const L=Math.exp(-l);let k=0,p=1;do{k++;p*=u()}while(p>L);return k-1}}}
const cenFoco=n=>CEN.find(c=>c[0]===n);
const cenTotalPeso=()=>CEN.reduce((a,c)=>a+c[3],0);
/* sorteios de espaço, natureza e hora, comuns aos cenários */
function cenSorteios(R){
 const dentro=(la,ln)=>[Math.min(BB.la[1]-.002,Math.max(BB.la[0]+.002,la)),Math.min(BB.ln[1]-.002,Math.max(BB.ln[0]+.002,ln))];
 const tw=cenTotalPeso(),
  foco=c=>{const[la,ln]=dentro(c[1]+R.g()*c[4]/KY,c[2]+R.g()*c[4]/KX);return{la,ln,b:c[0]}},
  mistura=()=>{if(R.u()<.22){const[la,ln]=dentro(BB.la[0]+R.u()*(BB.la[1]-BB.la[0]),BB.ln[0]+R.u()*(BB.ln[1]-BB.ln[0]));return{la,ln,b:'Malha urbana'}}
   let r=R.u()*tw,c=CEN[0];for(const q of CEN){if((r-=q[3])<=0){c=q;break}}return foco(c)},
  natureza=()=>{let r=R.u(),t='Roubo';for(const k in T){if((r-=T[k].pr)<=0){t=k;break}}return t},
  hora=t=>(((Math.round(T[t].mu+R.g()*4.5))%24)+24)%24;
 return{dentro,foco,mistura,natureza,hora}}
const cenPt=(S_,loc,t,h,ago)=>mk(loc.la,loc.ln,t,h,loc.b,Math.max(0,ago));

const BASES_TESTE={
 estacionario:{nome:'Focos fixos (controle)',dias:730,
  desc:'24 meses, 4.000 registros. Os focos são sempre os mesmos e não há contágio nem sazonalidade. É o controle: aqui o histórico completo (KDE) deveria ir bem e o contágio não deveria ser encontrado.',
  gerar(seed){const R=prng(seed),S_=cenSorteios(R),out=[];
   for(let i=0;i<4000;i++){const t=S_.natureza();out.push(cenPt(S_,S_.mistura(),t,S_.hora(t),Math.floor(R.u()*730)))}
   return{pontos:out,verdade:{tipo:'estacionario',nota:'distribuição espacial constante no tempo'}}}},
 deriva:{nome:'Foco que se desloca',dias:730,
  desc:'24 meses, 4.000 registros. 40% dos registros vêm de um foco que anda de Barreiro até Venda Nova ao longo dos dois anos; o restante é fixo. Foi projetada para favorecer métodos que dão mais peso ao recente.',
  gerar(seed){const R=prng(seed),S_=cenSorteios(R),out=[],A=cenFoco('Barreiro'),B=cenFoco('Venda Nova'),sig=700;
   const centro=ago=>{const f=1-ago/730;return[A[1]+(B[1]-A[1])*f,A[2]+(B[2]-A[2])*f]};
   for(let i=0;i<4000;i++){const t=S_.natureza(),ago=Math.floor(R.u()*730);let loc;
    if(R.u()<.4){const[la,ln]=centro(ago),d=S_.dentro(la+R.g()*sig/KY,ln+R.g()*sig/KX);loc={la:d[0],ln:d[1],b:'Foco móvel'}}else loc=S_.mistura();
    out.push(cenPt(S_,loc,t,S_.hora(t),ago))}
   return{pontos:out,verdade:{tipo:'deriva',de:{lat:A[1],lng:A[2],nome:A[0]},para:{lat:B[1],lng:B[2],nome:B[0]},fracao:.4,sigma:sig,dias:730,centro:ago=>centro(ago)}}}},
 contagio:{nome:'Contágio (auto-excitação)',dias:730,
  desc:'24 meses, cerca de 4.000 registros. Cada crime gera, em média, 0,6 crimes seguintes num raio de ~120 m, com vida média de 4 dias (parâmetros reais do processo). Foi projetada para favorecer o processo auto-excitante e o prospective hot-spotting.',
  gerar(seed){const R=prng(seed),S_=cenSorteios(R),out=[],TH=.6,VIDA=4,SIG=120,DIAS=730,fila=[];
   for(let d=0;d<DIAS;d++){const n=R.poisson(2.2);for(let i=0;i<n;i++){const t=S_.natureza();fila.push({t:d+R.u(),loc:S_.mistura(),tp:t})}}
   while(fila.length){const e=fila.pop(),ago=Math.floor(DIAS-e.t);if(e.t>=DIAS)continue;out.push(cenPt(S_,e.loc,e.tp,S_.hora(e.tp),ago));
    const nf=R.poisson(TH);for(let k=0;k<nf;k++){const[la,ln]=S_.dentro(e.loc.la+R.g()*SIG/KY,e.loc.ln+R.g()*SIG/KX);fila.push({t:e.t+R.exp(VIDA),loc:{la,ln,b:e.loc.b},tp:e.tp})}}
   return{pontos:out,verdade:{tipo:'contagio',theta:TH,vidaDias:VIDA,sigmaM:SIG,fundoPorDia:2.2,dias:DIAS}}}},
 sazonal:{nome:'Sazonal (muda a cada estação)',dias:1095,
  desc:'36 meses, 5.000 registros. O foco principal muda com a estação do ano e se repete todo ano: Centro e Savassi no verão, Barreiro e Buritis no outono, Venda Nova e Floramar no inverno, Pampulha e Carlos Prates na primavera. Foi projetada para favorecer o método do mesmo período do ano anterior.',
  gerar(seed){const R=prng(seed),S_=cenSorteios(R),out=[],EST=[['Centro','Savassi'],['Barreiro','Buritis'],['Venda Nova','Floramar'],['Pampulha','Carlos Prates']],
   est=mes=>mes===11||mes<=1?0:mes<=4?1:mes<=7?2:3;
   for(let i=0;i<5000;i++){const t=S_.natureza(),ago=Math.floor(R.u()*1095),mes=mkDate(ago).ym%12;let loc;const u=R.u();
    if(u<.6)loc=S_.foco(cenFoco(EST[est(mes)][R.u()<.5?0:1]));else if(u<.85){let r=R.u()*cenTotalPeso(),c=CEN[0];for(const q of CEN){if((r-=q[3])<=0){c=q;break}}loc=S_.foco(c)}else loc=S_.mistura();
    out.push(cenPt(S_,loc,t,S_.hora(t),ago))}
   return{pontos:out,verdade:{tipo:'sazonal',estacoes:EST.map((f,i)=>({nome:['verão (dez a fev)','outono (mar a mai)','inverno (jun a ago)','primavera (set a nov)'][i],focos:f})),dias:1095}}}},
 carnaval:{nome:'Carnaval em 5 anos',dias:1825,
  desc:'5 anos, cerca de 7.200 registros. Todo ano, de sábado a terça de Carnaval, os registros triplicam em Savassi, Centro, Barro Preto e Sagrada Família, à noite e de madrugada. O Carnaval muda de data de um ano para o outro (calculado pela Páscoa). Cada ano vira uma janela de teste: treina só com o que é anterior e prevê esses 4 dias.',
  gerar(seed){const R=prng(seed),S_=cenSorteios(R),out=[],DIAS=1825,Z=['Savassi','Centro','Barro Preto','Sagrada Família'],N0=7000,hoje=new Date();hoje.setHours(0,0,0,0);
   for(let i=0;i<N0;i++){const t=S_.natureza();let ago;do{ago=Math.floor(R.u()*DIAS)}while(R.u()*1.3>(new Date(hoje.getTime()-ago*864e5).getDay()>=5?1.3:1));/* sexta e sábado com 30% mais registros */
    out.push(cenPt(S_,S_.mistura(),t,S_.hora(t),ago))}
   const janelas=[];
   for(let y=hoje.getFullYear()-5;y<=hoje.getFullYear();y++){const pa=pascoa(y),ter=new Date(pa.getTime());ter.setDate(pa.getDate()-47);const agoTer=Math.round((hoje.getTime()-ter.getTime())/864e5);if(agoTer<0||agoTer+3>=DIAS)continue;/* fora do período ou no futuro */
    for(let d=0;d<4;d++){const ago=agoTer+d,n=R.poisson(3*N0/DIAS);for(let k=0;k<n;k++){let r=R.u(),t='Furto';if(r<.5);else if((r-=.5)<.35)t='Roubo';else if((r-=.35)<.10)t='Veiculos';else t='CVLI';
      const c=cenFoco(Z[Math.floor(R.u()*Z.length)]),loc=S_.foco([c[0],c[1],c[2],c[3],c[4]*.6]),h=(20+Math.floor(R.u()*9))%24;out.push(cenPt(S_,loc,t,h,ago))}}
    janelas.push({ano:y,data:isoLocal(ter),inicioAgo:agoTer+3,fimAgo:agoTer,cut:agoTer+4,W:4,historicoDias:DIAS-(agoTer+4)})}
   return{pontos:out,verdade:{tipo:'carnaval',zonas:Z,janelas,multiplicador:3,dias:DIAS}}}}};
/* Páscoa (algoritmo gregoriano anônimo): o Carnaval é a terça, 47 dias antes */
function pascoa(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1;return new Date(y,mes-1,dia)}

/* carrega o cenário como a base atual do app */
function carregarCenario(id,seed=1){const c=BASES_TESTE[id];if(!c)return null;const o=c.gerar(seed);
 load(o.pontos,`· cenário: ${c.nome} (${o.pontos.length.toLocaleString('pt-BR')}, semente ${seed})`);S.cenario={id,seed,verdade:o.verdade};return o}

/* painel na aba Pesquisa */
(()=>{const sel=$('bts');if(!sel)return;sel.innerHTML=Object.entries(BASES_TESTE).map(([k,c])=>`<option value="${k}">${c.nome}</option>`).join('');
 const desc=()=>{$('btd').textContent=BASES_TESTE[sel.value].desc};sel.onchange=desc;desc();
 $('btg').onclick=()=>{const id=sel.value,sd=Math.max(1,+$('btsd').value|0||1),o=carregarCenario(id,sd);toast(`${BASES_TESTE[id].nome}: ${o.pontos.length.toLocaleString('pt-BR')} registros fictícios carregados`)}})();
