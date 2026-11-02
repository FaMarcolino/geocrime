/* ===== v5: ponte com o Power Apps =====
   Parâmetros de URL: embed=1 (esconde o painel lateral; ui=1 mantém), hud=0, host=<origem do Power Apps>,
   reg, tipo, mes, epoca, turno, base (filtros iniciais).
   Entrada: window.postMessage({cmd, id, ...}). Saída: postMessage({src:'geocrime', evt:'ready'|'state'|'ack'|'export', ...}).
   Não há mecanismo nativo no Power Apps para isso: um componente PCF (iframe) faz o papel de ponte, ver GeoCrime_PowerApps_Guia.md. */
const PQ=new URLSearchParams(location.search),HOST=PQ.get('host')||'*',EMB=PQ.get('embed')==='1'&&window.parent!==window;
if(EMB&&PQ.get('ui')!=='1')document.body.classList.add('emb');
if(PQ.get('hud')==='0')document.body.classList.add('nohud');
const post=m=>{if(window.parent===window)return;try{window.parent.postMessage({src:'geocrime',...m},HOST)}catch(e){}};
const latOf=y=>+(LAT0+y/KY).toFixed(6),lngOf=x=>+(LNG0+x/KX).toFixed(6);
function snap(){const D=regStats(),W=S.W||1,R=+$('R').value;let ent=null;
 if(S.pin){const near=S.qt.rng(S.pin.x,S.pin.y,R,[],{v:0}),ra=S.mean?wsum(near)/(Math.PI*R*R)/S.mean:0;
  ent={lat:latOf(S.pin.y),lng:lngOf(S.pin.x),raio:R,ocorrencias:near.length,gravidade:wsum(near),vezesMedia:+ra.toFixed(2),risco:ra>3?'CRÍTICO':ra>1.5?'ALTO':ra>.7?'MÉDIO':'BAIXO',
   proximos:S.knn.map(o=>({natureza:nm(o.p.t),distM:Math.round(Math.sqrt(o.d)),local:o.p.b,lat:latOf(o.p.y),lng:lngOf(o.p.x)}))}}
 return{kpi:{registros:S.f.length,celulas:S.lv.length,profundidade:Math.max(0,...S.lv.map(l=>l.d)),igTotal:S.W,
   saturadas:S.lv.filter(l=>l.d>=l.md&&l.n>l.cap).length,concentracaoTop5Pct:+$('s4').textContent.replace('%','')||0},
  manchas:S.hs.map((o,i)=>({n:i+1,local:o.b,lat:latOf(o.y),lng:lngOf(o.x),registros:o.n,vezesMedia:+o.r.toFixed(2)})),
  regioes:RG.map((r,i)=>({id:i,nome:r.n,reds:D[i].n,igPct:Math.round(D[i].s/W*100),bases:r.b,vtr:r.v,pm:r.p,limite:r.c})),
  meses:(S.ms||[]).map(y=>({valor:y,rotulo:mlb(y)})),entorno:ent,cobertura:S.last||null,relatorios:S.rep}}
let ET;const emit=(evt='state')=>{clearTimeout(ET);ET=setTimeout(()=>post({evt,...snap()}),60)};
{const hk=(f,after)=>(...a)=>{const r=f(...a);after();return r};
 rebuild=hk(rebuild,emit);inspect=hk(inspect,emit);alloc=hk(alloc,emit);predRun=hk(predRun,emit);dbscan=hk(dbscan,emit);cmpRun=hk(cmpRun,emit);redistrib=hk(redistrib,emit);
 const r0=ronda;ronda=async()=>{await r0();emit()}}
/* No painel lateral os botões foram ligados às funções originais; reemitir após qualquer interação. */
document.querySelector('aside').addEventListener('click',()=>setTimeout(emit,700));
document.querySelector('aside').addEventListener('change',()=>setTimeout(emit,700));

const SEL={regiao:'fr',tipo:'ft',mes:'fm',epoca:'fe',turno:'fp'},PAR={raio:'R',k:'k',limitePadrao:'cap',profundidade:'dep',raioBase:'PR',atendVtr:'cv',custoVtr:'cvtr',custoPm:'cpm',meiaVida:'hl',minAglom:'mp',paradas:'rm',quadrantes:'rq'},
 CAM={registros:'lp',densidade:'lq',manchas:'lh',calor:'lk'};
const CMD={
 filtros(m){for(const k in SEL)if(k in m)$(SEL[k]).value=m[k]==null?'':String(m[k]);$('fr').onchange()},
 pesos(m){for(const e of document.querySelectorAll('.wt')){const v=m[e.dataset.t];if(v!=null){e.value=v;T[e.dataset.t].w=Math.max(0,+v)}}rebuild()},
 parametros(m){for(const k in PAR)if(k in m){const e=$(PAR[k]);e.value=m[k];e.dispatchEvent(new Event('input'))}},
 camadas(m){for(const k in CAM)if(k in m)$(CAM[k]).checked=!!m[k];if('rotasReais' in m)$('rr').checked=!!m.rotasReais;if('base' in m){BASE=m.base;$('bs').value=m.base}draw()},
 efetivo(m){let lim=0;for(const l of m.linhas||[]){const r=RG[l.id];if(!r)continue;for(const [a,b] of [['bases','b'],['vtr','v'],['pm','p'],['limite','c']])if(a in l){r[b]=Math.max(0,+l[a]||0);if(b==='c')lim=1}}
  if(lim)rebuild();else{regTable();emit()}},
 async dados(m){if(m.csv){const f=new File([m.csv],m.nome||'powerapps.csv',{type:'text/csv'});await importCSV(f,{auto:true})}else{NSEL=+m.n||NSEL;load(gen(NSEL),'· sintético')}},
 inspecionar(m){inspect((m.lng-LNG0)*KX,(m.lat-LAT0)*KY)},
 zoom(m){if(m.ajustar)fit();else if(m.fator)zoom(m.fator,cn.clientWidth/2,cn.clientHeight/2);draw()},
 comparar(m){if(m.mesA!=null)$('ca').value=m.mesA;if(m.mesB!=null)$('cb').value=m.mesB;cmpRun()},
 limparComparacao(){S.cmp=null;draw()},
 distribuirBases:()=>alloc(),redistribuir:()=>redistrib(),aplicarRedistribuicao(){redistrib();$('ap').click()},
 prever:()=>predRun(),aglomerados:()=>dbscan(),ronda:()=>ronda(),benchmark:()=>benchAll(),
 exportar(m){const mp={csv:'xc',registros:'xr',pdf:'xp'},b=$(mp[m.tipo]);if(!b)throw Error('tipo de exportação inválido');
  if(m.tipo==='pdf'){b.onclick();return}
  window.__capt=(nome,texto)=>post({evt:'export',nome,texto});try{b.onclick()}finally{window.__capt=null}},
 estado:()=>emit()};
window.addEventListener('message',async e=>{const m=e.data;if(!m||typeof m!=='object'||!m.cmd)return;
 if(window.parent!==window&&e.source!==window.parent)return;if(HOST!=='*'&&e.origin!==HOST)return;
 try{if(!CMD[m.cmd])throw Error('comando desconhecido: '+m.cmd);await CMD[m.cmd](m);post({evt:'ack',id:m.id,cmd:m.cmd,ok:true})}
 catch(err){post({evt:'ack',id:m.id,cmd:m.cmd,ok:false,erro:String(err.message||err)})}});
