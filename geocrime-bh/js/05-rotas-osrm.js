/* ===== rotas reais (OSRM) e utilitários de requisição ===== */
async function osrm(P){const c=P.map(p=>`${(LNG0+p.x/KX).toFixed(6)},${(LAT0+p.y/KY).toFixed(6)}`).join(';'),r=await fetch(`https://router.project-osrm.org/route/v1/driving/${c}?overview=full&geometries=geojson`),t=(await r.json()).routes[0];
 return{g:t.geometry.coordinates.map(([a,b])=>[(a-LNG0)*KX,(b-LAT0)*KY]),km:t.distance/1000,min:t.duration/60}}
/* matriz de durações/distâncias reais entre pontos; sem internet usa linha reta × 1,35 a 25 km/h */
const VEL_KMH=25,CIRC=1.35;
async function matriz(pts){
 if(pts.length>1&&pts.length<=90){try{const c=pts.map(p=>`${(LNG0+p.x/KX).toFixed(6)},${(LAT0+p.y/KY).toFixed(6)}`).join(';'),r=await fetch(`https://router.project-osrm.org/table/v1/driving/${c}?annotations=duration,distance`),j=await r.json();
  if(j.durations&&j.distances&&j.durations.every(l=>l.every(v=>v!=null))&&j.distances.every(l=>l.every(v=>v!=null)))return{dur:j.durations,dist:j.distances,real:true}}catch(e){}}
 const dist=pts.map(a=>pts.map(b=>Math.hypot(a.x-b.x,a.y-b.y)*CIRC)),dur=dist.map(l=>l.map(d=>d/(VEL_KMH/3.6)));return{dur,dist,real:false}}
/* executa tarefas assíncronas com no máximo n em paralelo (o servidor público de rotas limita a taxa) */
async function pool(tarefas,n=3){const res=new Array(tarefas.length);let i=0;
 await Promise.all(Array.from({length:Math.min(n,tarefas.length)},async()=>{for(;;){const k=i++;if(k>=tarefas.length)return;try{res[k]={ok:true,v:await tarefas[k]()}}catch(e){res[k]={ok:false,e}}}}));return res}
async function knnRoutes(){S.kr=[];if(!$('rr').checked||!S.pin)return;const tk=S.tk=(S.tk||0)+1,pin=S.pin,K=S.knn.slice(),rs=await Promise.allSettled(K.map(o=>osrm([pin,o.p])));if(tk!==S.tk)return;
 S.kr=rs.map(r=>r.status==='fulfilled'?r.value:null);const bs=S.kr.reduce((b,r,i)=>r&&(b<0||r.km<S.kr[b].km)?i:b,-1);
 S.kr.forEach((r,i)=>{const e=$('kr'+i);if(e)e.innerHTML=r?` <b${i===bs?' style="color:#16a34a"':''}>· ${f1(r.km)} km, ${Math.round(r.min)} min por rota</b>`:' · rota indisponível'});draw()}
