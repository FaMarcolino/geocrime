/* ===== v5: mapa de predição ===== */
const PH={V:{s:.01,ox:0,oy:0}},f2=v=>v.toFixed(2).replace('.',','),pUn=()=>S.pm&&S.pm.wg?'pontos de gravidade':'ocorrências';
const vfit=(bb,c)=>{const[a,b,e,f]=bb,F=fc(c),s=Math.min(F.aw/Math.max(e-a,500),F.ah/Math.max(f-b,500))*.9;return{s,ox:F.cx-(a+e)/2*s,oy:F.cy+(b+f)/2*s}};
$('pnt').innerHTML=$('ft').innerHTML;$('ppt').innerHTML=$('fp').innerHTML;
/* superfície prevista: densidade (kernel triangular) ponderada pelo método escolhido no backtest; o volume de cada região vem do método de volume vencedor */
const DIAS=['domingo','segunda','terça','quarta','quinta','sexta','sábado'],wdOf=p=>p.wd??(p.wd=new Date(Date.now()-p.ago*864e5).getDay());
/* perfil de horário e de dia da semana dos registros ao redor de uma zona */
function pmPerfil(ns,datas){const h=Array(24).fill(0),d=Array(7).fill(0);for(const p of ns){h[p.h]++;if(datas)d[wdOf(p)]++}const n=ns.length||1;
 let bs=0,bv=-1;for(let i=0;i<24;i++){const v=h[i]+h[(i+1)%24]+h[(i+2)%24];if(v>bv){bv=v;bs=i}}
 const bd=d.indexOf(Math.max(...d));return{hora:`${bs}h–${(bs+3)%24}h`,horaPct:Math.round(bv/n*100),dia:datas?DIAS[bd]:null,diaPct:datas?Math.round(d[bd]/n*100):0,n:ns.length}}
function pmModel(){const nt=$('pnt').value,pt=$('ppt').value,rg=$('fr').value,wg=$('pwg').checked,R=+$('R').value,HL=+$('hl').value||45,wv=p=>wg?T[p.t].w:1;
 const P=S.all.filter(p=>(!nt||p.t===nt)&&inPer(p.h,pt)&&(rg===''||p.r===+rg));if(P.length<50)return null;
 const bt=btCache(P,R,HL,wv,[nt,pt,rg,wg].join('|'),$('phz').value||'auto'),W=bt.W,sel=$('pmm').value||'auto',auto=sel==='auto',
  id=auto?(bt.res?bt.res.melhor:'C'+HL):sel,metodo=bt.mets.find(m=>m.id===id)||bt.mets.find(m=>m.id==='C'+HL);
 const q=mkQT();P.forEach(p=>q.ins(p));
 const[a,b,c,d]=bboxOf(P),cs=Math.max(R/2,150,Math.sqrt((c-a+2*R)*(d-b+2*R)/20000)),x0=a-R,y0=b-R,nx=Math.ceil((c-a+2*R)/cs),ny=Math.ceil((d-b+2*R)/cs),K=new Float32Array(nx*ny),rr=new Int8Array(nx*ny),sr=RG.map(()=>0);
 for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const cx=x0+(i+.5)*cs,cy=y0+(j+.5)*cs;let t=0;for(const p of q.rng(cx,cy,R,[],{v:0}))t+=wv(p)*btPeso(metodo,p,0,W)*(1-Math.hypot(p.x-cx,p.y-cy)/R);
  if(t>0){const r=reg(cx,cy);K[i*ny+j]=t;rr[i*ny+j]=r;sr[r]+=t}}
 const span=Math.floor((bt.sp-1)/W)+1,hist=btVolDados(P,wv,0,W),vm=bt.vol.melhor,F=hist.map(h=>volPrev(h,vm,span)),ult=hist.map(h=>h[0]),datas=bt.sp>1;
 const E=new Float32Array(nx*ny),cells=[];let mx=0;
 for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const k=i*ny+j;if(K[k]<=0)continue;const r=rr[k],e=sr[r]?F[r]*K[k]/sr[r]:0;E[k]=e;if(e>0){cells.push({x:x0+(i+.5)*cs,y:y0+(j+.5)*cs,e,r,k});mx=Math.max(mx,e)}}
 const w=Math.ceil(R/cs),sum=k=>{const i0=Math.floor(k/ny),j0=k%ny;let s=0;for(let i=Math.max(0,i0-w);i<=Math.min(nx-1,i0+w);i++)for(let j=Math.max(0,j0-w);j<=Math.min(ny-1,j0+w);j++){const dx=(i-i0)*cs,dy=(j-j0)*cs;if(dx*dx+dy*dy<=R*R)s+=E[i*ny+j]}return s},zs=[];
 for(const c of cells.slice().sort((u,v)=>v.e-u.e)){if(zs.length>=10)break;if(zs.every(z=>Math.hypot(z.x-c.x,z.y-c.y)>=2*R)){const nn=q.knn(c.x,c.y,1,[],{v:0})[0],e=sum(c.k),sd=1.2816*Math.sqrt(e),ns=q.rng(c.x,c.y,R,[],{v:0}),loc=nn&&nn.p.b!=='Malha urbana'&&nn.p.b!=='Ponto importado'?nn.p.b:'';
  zs.push({x:c.x,y:c.y,e,lo:Math.max(0,e-sd),hi:e+sd,prob:1-Math.exp(-e),b:loc,r:RG[c.r].n,perfil:pmPerfil(ns,datas),lat:latOf(c.y),lng:lngOf(c.x),rua:RUA.get(c.x.toFixed(0)+','+c.y.toFixed(0))||''})}}
 zs.sort((u,v)=>v.e-u.e);
 return{cells,cs,mx,nx,ny,x0,y0,E,zs,R,HL,wg,P,n:P.length,total:F.reduce((a,c)=>a+c,0),te:P.filter(p=>p.ago<W),bt,metodo,auto,vm,F,ult,W,datas}}

/* nome da rua de cada zona (serviço "nearest" do OSRM; opcional, exige internet) */
const RUA=new Map();
async function pmRuas(M){const pend=M.zs.filter(z=>!z.rua);if(!pend.length)return;
 await pool(pend.map(z=>async()=>{const key=z.x.toFixed(0)+','+z.y.toFixed(0);const r=await fetch(`https://router.project-osrm.org/nearest/v1/driving/${lngOf(z.x)},${latOf(z.y)}?number=1`),j=await r.json(),n=j.waypoints&&j.waypoints[0]&&j.waypoints[0].name;if(n){RUA.set(key,n);z.rua=n}}),3);
 if(S.pm===M&&$('pz'))$('pz').innerHTML=pmZonasHTML(M);S.rep.zonasPrev&&pmRelZonas(M)}
function pmZonasHTML(M){const un=pUn();return M.zs.map((z,i)=>`<div class="hl zn" data-z="${i}"><div class="zt"><span class="zn1"><b style="color:#d946ef">P${i+1}</b> <b>${z.rua||z.b||z.r}</b></span><span class="pb" title="Chance de ao menos uma ocorrência em ${M.R} m nos próximos ${M.W} dias">${Math.round(z.prob*100)}%</span></div>
 <small class="mu">${[z.rua&&z.b?z.b:'',z.r].filter(Boolean).join(' · ')}</small><small class="mu">≈ ${f1(z.e)} (${f1(z.lo)}–${f1(z.hi)}) ${un} em ${M.W} dias, raio de ${M.R} m</small><small class="mu">Mais provável: <b>${z.perfil.hora}</b> (${z.perfil.horaPct}%)${z.perfil.dia?` · <b>${z.perfil.dia}</b> (${z.perfil.diaPct}%)`:''}</small></div>`).join('')}
function pmRelZonas(M){const un=pUn();S.rep.zonasPrev={h:['Zona','Rua','Local','Regional',`Previsto (${un}/${M.W} d)`,'Intervalo 80%','Chance de ≥1','Horário provável','Dia provável','Latitude','Longitude'],r:M.zs.map((z,i)=>['P'+(i+1),z.rua||'—',z.b||'—',z.r,f1(z.e),`${f1(z.lo)}–${f1(z.hi)}`,Math.round(z.prob*100)+'%',z.perfil.hora+' ('+z.perfil.horaPct+'%)',z.perfil.dia?z.perfil.dia+' ('+z.perfil.diaPct+'%)':'—',z.lat,z.lng])}}
function pmRun(){const el=$('pml'),M=S.pm=pmModel();
 if(!M){el.innerHTML='<div class="warn">Poucos registros para prever com esses filtros (mínimo 50). Mude a natureza, o turno ou a região.</div>';pDraw();return}
 const sel=$('pmm'),cur=sel.value;sel.innerHTML='<option value="auto">Método: automático (backtest)</option>'+M.bt.mets.map(m=>`<option value="${m.id}">${m.nome}</option>`).join('');sel.value=[...sel.options].some(o=>o.value===cur)?cur:'auto';
 const autoW=btHorizonte(M.bt.sp,'auto'),hz=['<option value="auto">Horizonte: automático ('+autoW+' dias)</option>',...M.bt.opcoes.map(w=>`<option value="${w}">Horizonte: ${w} dias</option>`)].join(''),hv=$('phz').value;
 for(const id of['phz','pmz']){$(id).innerHTML=hz;$(id).value=[...$(id).options].some(o=>o.value===hv)?hv:'auto'}$('pmtt').textContent='Mapa de predição · próximos '+M.W+' dias';
 const un=pUn(),tot=M.total,wp=M.bt.vol.n?M.bt.vol.wapeT[M.vm]:null;btRelatorio(M);pmRelZonas(M);
 el.innerHTML=`<div class="ch"><b>Onde pode ocorrer o próximo crime</b></div><small style="color:var(--mu)">Total previsto: <b>≈ ${f1(tot)}</b> ${un} em ${M.W} dias${wp!=null?` (erro típico do total nas janelas passadas: ±${f1(wp*100)}%, ou seja, ${f1(Math.max(0,tot*(1-wp)))}–${f1(tot*(1+wp))})`:''} · ${M.n.toLocaleString('pt-BR')} registros no histórico · método: <b>${M.metodo.nome}</b>${M.auto?'':' (manual)'}</small>`+
  `<div id="pz" style="margin:6px 0">${pmZonasHTML(M)}</div><small class="mu">O percentual é a chance de ao menos uma ocorrência dentro do raio, no horizonte previsto (modelo de Poisson).</small>`+
  `<div style="height:8px;border-radius:4px;margin-top:8px;background:linear-gradient(90deg,hsl(55,100%,50%),hsl(0,100%,42%))"></div><div style="display:flex;justify-content:space-between;color:var(--mu);font-size:10px"><span>menor</span><span>maior: ≈ ${f2(M.mx)} por célula de ${Math.round(M.cs)} m</span></div>`+
  `<div class="ch" style="margin-top:8px"><b>Validação (backtest)</b></div>`+btTexto(M)+btVolTexto(M)+
  `<small style="color:var(--mu)">Intervalo 80% pela variação de Poisson. Indica locais e períodos prováveis, nunca pessoas. Usa todo o histórico (respeita a região do filtro).</small>`;
 pDraw();pmRuas(M).catch(()=>{})}
function pmOpen(){if(typeof setView==='function'&&VISTA!=='mapa')setView('mapa');const was=$('pm').hidden;$('pm').hidden=false;if(was){PH.V={...S.V};$('pnt').value=$('ft').value;$('ppt').value=$('fp').value}pmRun()}
$('pmc').onclick=()=>{$('pm').hidden=true};$('pnt').onchange=$('ppt').onchange=$('pwg').onchange=$('pmm').onchange=pmRun;
$('phz').onchange=$('pmz').onchange=e=>{$('phz').value=$('pmz').value=e.target.value;if(!$('pm').hidden)pmRun()};$('ppr').onchange=$('pzn').onchange=pDraw;
$('pr').onclick=e=>{if(e.target.id==='pmo')pmOpen()};
$('pml').onclick=e=>{const t=e.target.closest('[data-z]'),z=t&&S.pm&&S.pm.zs[+t.dataset.z];if(z)flyTo(z.x,z.y,Math.max(S.pm.R*3,600),PH,pDraw,$('pc'))};
$('pzi').onclick=()=>zoomA(1.4,PH,pDraw,$('pc'));$('pzo').onclick=()=>zoomA(1/1.4,PH,pDraw,$('pc'));$('pzf').onclick=()=>fly(vfit(S.bb,$('pc')),PH,pDraw,$('pc'));
function pDraw(){if($('pm').hidden)return;const c=$('pc'),w=c.clientWidth,h=c.clientHeight;if(!w)return;pDrawOn(c,PH.V,{w,h,d:devicePixelRatio||1,tiles:true})}
function pDrawOn(c,V,o){const{w,h,d}=o,M=S.pm;
 if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=w*d;c.height=h*d}
 const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);g.fillStyle=cv('--cv');g.fillRect(0,0,w,h);
 const s=V.s,X=x=>V.ox+x*s,Y=y=>V.oy-y*s;if(o.tiles)tiles(g,w,h,X,Y,V);if($('lr').checked)geoDraw(g,X,Y,true);
 if(M){for(const o of M.cells){const q=Math.sqrt(o.e/M.mx);if(q<.05)continue;const x=X(o.x-M.cs/2),y=Y(o.y+M.cs/2),z=M.cs*s+.6;if(x>w||y>h||x+z<0||y+z<0)continue;g.fillStyle=`hsla(${55-55*q},100%,${50-8*q}%,${.15+.6*q})`;g.fillRect(x,y,z,z)}
  if($('ppr').checked){g.fillStyle=cv('--fg');for(const p of M.te){const x=X(p.x),y=Y(p.y);if(x>0&&y>0&&x<w&&y<h)g.fillRect(x-1.5,y-1.5,3,3)}}
  if($('pzn').checked){g.font='bold 11px sans-serif';g.textAlign='center';M.zs.forEach((z,i)=>{g.beginPath();g.arc(X(z.x),Y(z.y),M.R*s,0,7);g.setLineDash([5,4]);g.strokeStyle='#d946ef';g.lineWidth=2;g.stroke();g.setLineDash([]);g.fillStyle='#d946ef';g.fillText('P'+(i+1),X(z.x),Y(z.y)+4)});g.textAlign='start'}}
 if($('lr').checked)regLabels(g,X,Y,w,h);scaleBar(g,s,h)}
{const pc=$('pc'),tp=document.createElement('div');tp.className='tip';$('pm').appendChild(tp);let pd=null;
 pc.onpointerdown=e=>{FL++;pc.setPointerCapture(e.pointerId);pd={x:e.offsetX,y:e.offsetY};tp.style.display='none'};
 pc.onpointermove=e=>{if(pd){PH.V.ox+=e.offsetX-pd.x;PH.V.oy+=e.offsetY-pd.y;pd.x=e.offsetX;pd.y=e.offsetY;pDraw();return}
  const M=S.pm;if(!M)return;const V=PH.V,x=(e.offsetX-V.ox)/V.s,y=(V.oy-e.offsetY)/V.s,i=Math.floor((x-M.x0)/M.cs),j=Math.floor((y-M.y0)/M.cs),v=i>=0&&j>=0&&i<M.nx&&j<M.ny?M.E[i*M.ny+j]:0;
  if(v>0){tp.innerHTML=`<b>≈ ${f2(v)}</b> ${pUn()} em ${M.W} dias<br>nesta célula (${Math.round(M.cs)} m) · ${RG[reg(x,y)].n}`;tp.style.display='block';tp.style.left=Math.min(e.offsetX+14,pc.clientWidth-220)+'px';tp.style.top=e.offsetY+14+'px'}else tp.style.display='none'};
 pc.onpointerup=()=>{pd=null};pc.onpointerleave=()=>{tp.style.display='none'};
 pc.addEventListener('wheel',e=>{e.preventDefault();FL++;const V=PH.V,f=e.deltaY<0?1.2:1/1.2,x=(e.offsetX-V.ox)/V.s,y=(V.oy-e.offsetY)/V.s;V.s*=f;V.ox=e.offsetX-x*V.s;V.oy=e.offsetY+y*V.s;pDraw()},{passive:false});
 new ResizeObserver(pDraw).observe(pc)}
