/* Executa por último: todas as funções (inclusive de interface) já existem quando a base é carregada. */
$('lg').innerHTML=Object.keys(T).map(k=>`<span><i style="background:${T[k].c}"></i>${nm(k)}</span>`).join('');
new ResizeObserver(draw).observe(cn);
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{draw();hourChart()});
aplicarRegioes(regionaisBH());          // polígonos oficiais das regionais de BH antes de gerar/atribuir registros
load(gen(3000),'· sintético');
baseCartao().catch(()=>{});geoRestaurar().catch(()=>{});

{const f={};for(const k in SEL)if(PQ.has(k==='regiao'?'reg':k))f[k]=PQ.get(k==='regiao'?'reg':k);
 if(Object.keys(f).length)CMD.filtros(f);if(PQ.has('base'))CMD.camadas({base:PQ.get('base')});
 post({evt:'ready',regioes:RG.map((r,i)=>({id:i,nome:r.n})),naturezas:['','Roubo','Furto','CVLI','Veiculos'],...snap()})}

