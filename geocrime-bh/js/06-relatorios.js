/* ===== v3: relatórios ===== */
const TT={resumo:'Resumo',regioes:'Efetivo e demanda por região',manchas:'Manchas criminais',redistribuicao:'Redistribuição de policiamento',cobertura:'Cobertura de policiamento',bases:'Capacidade das bases',comparacao:'Comparação de períodos',previsao:'Previsão',ronda:'Ronda preventiva por quadrante',rondaParadas:'Ronda preventiva: paradas',rotaArea:'Rota da área selecionada',zonasPrev:'Zonas previstas (próximos 30 dias)',backtest:'Backtest da predição (janelas de 30 dias)',backtestVolume:'Backtest do volume previsto por região',sazon:'Sazonalidade',estruturas:'Comparação de estruturas',escala:'Escalabilidade (ms/consulta)',clusters:'Aglomerados (DBSCAN)'};
const dlf=(n,t,m)=>{if(window.__capt){window.__capt(n,t);return}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click()};
function repBase(){const D=regStats(),W=S.W||1,fl=['ft','fr','fm','fe','fp'].map(i=>$(i).selectedOptions[0].text).join(' | ');
 return{resumo:{h:['Indicador','Valor'],r:[['Registros filtrados',S.f.length],['Índice de gravidade total',S.W],['Células da QuadTree',S.lv.length],['Filtros',fl]]},
  regioes:{h:['Região','REDS','IG%','Bases','VTR','PM','Limite célula'],r:RG.map((r,i)=>[r.n,D[i].n,Math.round(D[i].s/W*100),r.b,r.v,r.p,r.c])},
  manchas:{h:['#','Local','Registros','Densidade'],r:S.hs.map((o,i)=>[i+1,o.b,o.n,f1(o.r)+'x'])},...S.rep}}
$('xc').onclick=()=>dlf('relatorio_geocrime.csv','\ufeff'+Object.entries(repBase()).map(([k,v])=>TT[k]+'\n'+[v.h,...v.r].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n')).join('\n\n'),'text/csv');
$('xr').onclick=()=>dlf('registros_filtrados.csv','\ufeff'+['lat;lng;natureza;peso;hora;data;regiao',...S.f.map(p=>[(LAT0+p.y/KY).toFixed(6),(LNG0+p.x/KX).toFixed(6),nm(p.t),T[p.t].w,p.h,new Date(Date.now()-p.ago*864e5).toISOString().slice(0,10),RG[p.r].n].join(';'))].join('\n'),'text/csv');
$('xp').onclick=()=>{let img='';try{img=`<img src="${$('c').toDataURL()}" style="max-width:100%">`}catch(e){}
 try{if(S.pm)img+=`<h2>Mapa de predição</h2><img src="${$('pc').toDataURL()}" style="max-width:100%">`}catch(e){}
 $('rep').innerHTML=`<h1>GeoCrime BH — Relatório de análise criminal</h1><p>${new Date().toLocaleString('pt-BR')}</p>${img}`+Object.entries(repBase()).map(([k,v])=>`<h2>${TT[k]}</h2>`+tbl(v.h,v.r)).join('')+'<h2>Limitações e uso responsável</h2><ul>'+ETICA.map(t=>`<li>${t}</li>`).join('')+'</ul>';window.print()};


