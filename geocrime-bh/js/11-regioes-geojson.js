/* ===== v9: regiões e quadrantes por polígono (GeoJSON) =====
   As regionais de BH vêm embutidas (00-dados-regionais-bh.js). O usuário pode importar outros polígonos
   (regiões ou quadrantes de patrulha) em WGS84 ou SIRGAS 2000 / UTM 23S; ficam salvos no navegador. */
const GEO={R:null,Q:null};                       // conjuntos ativos: {feats:[{nome,parts,bbox,area,cx,cy}],campo,fonte}
const REG_SEM=RG.map(r=>({...r}));               // regiões aproximadas (sementes) originais

const geoNorm=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const geoTitulo=s=>String(s).toLowerCase().replace(/(^|[\s-])([a-zà-ú])/g,(m,a,b)=>a+b.toUpperCase()).replace(/ (De|Da|Do|Dos|Das|E) /g,x=>x.toLowerCase());

/* SIRGAS 2000 / UTM → WGS84 (série de Krüger; erro < 1 cm em BH, validado contra o arquivo oficial) */
function utmToLL(E,N,zone=23,south=true){
 const a=6378137,f=1/298.257222101,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2),x=E-500000,y=south?N-1e7:N,M=y/k0,
  mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2**3/256)),e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2)),
  p1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu),
  s=Math.sin(p1),c=Math.cos(p1),t=Math.tan(p1),N1=a/Math.sqrt(1-e2*s*s),T1=t*t,C1=ep2*c*c,R1=a*(1-e2)/(1-e2*s*s)**1.5,d=x/(N1*k0),
  lat=p1-(N1*t/R1)*(d*d/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*d**4/24+(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*d**6/720),
  lon=(d-(1+2*T1+C1)*d**3/6+(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*d**5/120)/c;
 return[(zone*6-183)+lon*180/Math.PI,lat*180/Math.PI]}

const geoAreaAnel=r=>{let s=0;for(let i=0;i<r.length-1;i++)s+=r[i][0]*r[i+1][1]-r[i+1][0]*r[i][1];return s/2};
const geoBBox=r=>{let a=1e18,b=1e18,c=-1e18,d=-1e18;for(const p of r){if(p[0]<a)a=p[0];if(p[0]>c)c=p[0];if(p[1]<b)b=p[1];if(p[1]>d)d=p[1]}return[a,b,c,d]};

/* lê um objeto GeoJSON e devolve feições em metros do app; lança Error com mensagem em português */
function geoParse(obj){
 const feats=[];const walk=o=>{if(!o||typeof o!=='object')return;if(Array.isArray(o))o.forEach(walk);else if(o.type==='FeatureCollection')walk(o.features);else if(o.type==='Feature')feats.push(o);else if(/^(Multi)?Polygon$/.test(o.type))feats.push({type:'Feature',properties:{},geometry:o})};
 walk(obj);
 const polys=f=>{const g=f&&f.geometry;return!g?[]:g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[]};
 const ok=feats.filter(f=>polys(f).some(p=>p&&p[0]&&p[0].length>=4));
 if(!ok.length)throw new Error('Nenhum polígono encontrado (esperado FeatureCollection com Polygon ou MultiPolygon).');
 if(ok.length>120)throw new Error(`Feições demais (${ok.length}); o limite é 120.`);
 const p0=polys(ok[0]).find(p=>p&&p[0]&&p[0].length)[0][0];let modo='wgs',sw=false;
 if(Math.abs(p0[0])>180||Math.abs(p0[1])>90){if(p0[0]>1e5&&p0[0]<9e5&&p0[1]>6e6&&p0[1]<9e6)modo='utm';else throw new Error('Coordenadas projetadas desconhecidas. Exporte em WGS84 (EPSG:4326) ou SIRGAS 2000 / UTM 23S (EPSG:31983).')}
 else if(p0[0]>-22&&p0[0]<-18&&p0[1]>-46&&p0[1]<-42)sw=true;           // veio como lat,lon
 const conv=c=>{let lo=c[0],la=c[1];if(modo==='utm')[lo,la]=utmToLL(c[0],c[1]);else if(sw)[lo,la]=[c[1],c[0]];return[(lo-LNG0)*KX,(la-LAT0)*KY]};
 const out=ok.map((f,i)=>{const parts=[];for(const pg of polys(f)){if(!pg||!pg[0]||pg[0].length<4)continue;const outer=pg[0].map(conv);parts.push({outer,holes:pg.slice(1).filter(h=>h.length>=4).map(h=>h.map(conv)),bbox:geoBBox(outer)})}
  let A=0,cx=0,cy=0;for(const p of parts){const r=p.outer;let sa=0,sx=0,sy=0;for(let k=0;k<r.length-1;k++){const c=r[k][0]*r[k+1][1]-r[k+1][0]*r[k][1];sa+=c;sx+=(r[k][0]+r[k+1][0])*c;sy+=(r[k][1]+r[k+1][1])*c}
   sa/=2;const ha=p.holes.reduce((s,h)=>s+Math.abs(geoAreaAnel(h)),0),a1=Math.max(Math.abs(sa)-ha,1);A+=a1;cx+=sx/(6*sa||1)*a1;cy+=sy/(6*sa||1)*a1}
  const bb=geoBBox(parts.flatMap(p=>p.outer));return{props:f.properties||{},parts,bbox:bb,area:A,cx:cx/A,cy:cy/A,idx:i}});
 const dentro=out.filter(f=>f.cx>(BB.ln[0]-.25-LNG0)*KX&&f.cx<(BB.ln[1]+.25-LNG0)*KX&&f.cy>(BB.la[0]-.25-LAT0)*KY&&f.cy<(BB.la[1]+.25-LAT0)*KY).length;
 if(dentro<out.length/2)throw new Error('As feições estão fora de Belo Horizonte. Confira o sistema de coordenadas do arquivo.');
 const keys=[...new Set(out.flatMap(f=>Object.keys(f.props)))];
 return{feats:out,keys,modo:modo==='utm'?'SIRGAS 2000 / UTM 23S (convertido)':sw?'WGS84 (lat,lon invertidos; corrigido)':'WGS84'}}

/* campo provável com o nome da feição */
function geoCampoNome(keys,feats){
 const pref=['nome','name','regional','regiao','nm_regional','nm_regiao','nm_quadrante','quadrante','nm_area','nm_nome','descricao','sigla'];
 for(const p of pref){const k=keys.find(k=>geoNorm(k)===geoNorm(p));if(k)return k}
 return keys.find(k=>feats.every(f=>typeof f.props[k]==='string'&&f.props[k].trim()))||keys.find(k=>feats.some(f=>f.props[k]!=null))||null}
function geoSet(parsed,campo,fonte){
 const usados=new Map();
 const feats=parsed.feats.map((f,i)=>{let nome=campo&&f.props[campo]!=null&&String(f.props[campo]).trim()?String(f.props[campo]).trim():`Área ${i+1}`;const n=(usados.get(nome)||0)+1;usados.set(nome,n);if(n>1)nome+=` (${n})`;return{...f,nome}});
 return{feats,campo,fonte,modo:parsed.modo}}

/* ponto em polígono (ray casting), com furos e multipartes */
const geoPip=(r,x,y)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
function geoIn(f,x,y){if(x<f.bbox[0]||x>f.bbox[2]||y<f.bbox[1]||y>f.bbox[3])return false;
 for(const p of f.parts){if(x<p.bbox[0]||x>p.bbox[2]||y<p.bbox[1]||y>p.bbox[3])continue;if(geoPip(p.outer,x,y)&&!p.holes.some(h=>geoPip(h,x,y)))return true}return false}
function geoLocate(set,x,y){for(let i=0;i<set.feats.length;i++)if(geoIn(set.feats[i],x,y))return i;return-1}

/* ---- aplicar ao app ---- */
function preencherRegioes(){const v=$('fr').value;$('fr').innerHTML='<option value="">Todas as regiões</option>'+RG.map((r,i)=>`<option value="${i}">${r.n}</option>`).join('');$('fr').value=v!==''&&+v<RG.length?v:''}
function modosRonda(){const sel=$('rq'),v=sel.value;
 sel.innerHTML=(GEO.R?`<option value="reg">Regiões (${GEO.R.feats.length} polígonos)</option>`:'')+(GEO.Q?`<option value="qd">Quadrantes importados (${GEO.Q.feats.length})</option>`:'')+'<option value="2">Grade 2×2</option><option value="3">Grade 3×3</option><option value="4">Grade 4×4</option>';
 sel.value=[...sel.options].some(o=>o.value===v)?v:sel.options[0].value}
function geoInfo(){const r=GEO.R,q=GEO.Q;
 $('geoinfo').innerHTML=`<b>Regiões:</b> ${r?`${r.feats.length} polígonos · ${r.fonte}`:'aproximadas (ponto mais próximo de uma semente)'}<br><b>Quadrantes:</b> ${q?`${q.feats.length} polígonos · ${q.fonte}`:'nenhum (a ronda usa regiões ou grade)'}`;modosRonda()}
function aplicarRegioes(set){
 const velhas=new Map(RG.map(r=>[geoNorm(r.n),r])),cap=+$('cap').value||25,atual=new Map(RG.map((r,i)=>[geoNorm(r.n),i])),semente=new Map(REG_SEM.map((r,i)=>[geoNorm(r.n),i]));
 /* ordem: regiões já em uso, depois as de referência (Centro-Sul, Leste…), depois as novas na ordem do arquivo */
 const rank=f=>{const k=geoNorm(geoTitulo(f.nome));return atual.has(k)?atual.get(k):semente.has(k)?100+semente.get(k):1e3+f.idx};
 set.feats.sort((a,b)=>rank(a)-rank(b));
 const novas=set.feats.map((f,i)=>{const nome=geoTitulo(f.nome),o=velhas.get(geoNorm(nome));if(o){o.x=f.cx;o.y=f.cy;return o}return{n:nome,pk:(i*5)%12,tr:0,b:3,v:6,p:30,c:cap,x:f.cx,y:f.cy}});
 RG.length=0;RG.push(...novas);GEO.R=set;preencherRegioes();geoInfo();
 if(S.all&&S.all.length){S.all.forEach(p=>p.r=reg(p.x,p.y));S.pm=null;$('pm').hidden=true;rebuild();hourChart()}}
function restaurarSementes(){RG.length=0;RG.push(...REG_SEM.map(r=>({...r})));GEO.R=null;preencherRegioes();geoInfo();
 if(S.all&&S.all.length){S.all.forEach(p=>p.r=reg(p.x,p.y));S.pm=null;$('pm').hidden=true;rebuild();hourChart()}}
function aplicarQuadrantes(set){GEO.Q=set;geoInfo();S.rt=null;draw()}
function regionaisBH(){return geoSet(geoParse(BH_REGIONAIS),'NOME','Regionais de BH (PBH, CC-BY)')}

/* ---- contornos no mapa ---- */
function geoDraw(g,X,Y,regs=true){
 const tr=(set,cor,lw,dash,hi)=>{if(!set)return;g.save();g.strokeStyle=cor;g.lineWidth=lw;g.setLineDash(dash||[]);g.lineJoin='round';
  set.feats.forEach((f,i)=>{for(const p of f.parts){g.beginPath();p.outer.forEach((q,k)=>k?g.lineTo(X(q[0]),Y(q[1])):g.moveTo(X(q[0]),Y(q[1])));g.closePath();
   if(i===hi){g.save();g.strokeStyle=cv('--ac');g.lineWidth=lw+1.8;g.stroke();g.restore()}else g.stroke()}});g.restore()};
 if(regs){tr(GEO.R,'rgba(0,0,0,.6)',3.6,null,-1);tr(GEO.R,'rgba(226,232,240,.9)',1.5,null,$('fr').value===''?-1:+$('fr').value)}
 tr(GEO.Q,'rgba(255,176,32,.85)',1.6,[6,4],-1)}

/* ---- janela modal genérica ---- */
function abrirModal({titulo,html,okTxt='Importar',onOk,onMount}){
 $('mdt').textContent=titulo;$('mdb').innerHTML=html;$('mdo').textContent=okTxt;$('mdo').disabled=false;$('md').hidden=false;
 $('mdo').onclick=async()=>{$('mdo').disabled=true;try{await onOk()}catch(e){toast('Erro: '+(e.message||e),'er');$('mdo').disabled=false;return}fecharModal()};
 if(onMount)onMount()}
function fecharModal(){$('md').hidden=true;$('mdb').innerHTML=''}
$('mdx').onclick=$('mdc').onclick=fecharModal;
$('md').addEventListener('pointerdown',e=>{if(e.target===$('md'))fecharModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('md').hidden){fecharModal();e.stopImmediatePropagation()}},true);

/* ---- importar polígonos do usuário ---- */
async function lerGeo(file,tipo){
 let parsed,obj;
 try{obj=JSON.parse((await file.text()).replace(/^﻿/,''));parsed=geoParse(obj)}catch(e){const m=e instanceof SyntaxError?'O arquivo não é um JSON/GeoJSON válido.':e.message;$('geoinfo').insertAdjacentHTML('beforeend','');toast(m,'er');return}
 const campo0=geoCampoNome(parsed.keys,parsed.feats),rot=tipo==='R'?'regiões':'quadrantes';
 const prev=c=>{const set=geoSet(parsed,c,file.name);return set.feats.slice(0,12).map(f=>geoTitulo(f.nome)).join(', ')+(set.feats.length>12?`… (+${set.feats.length-12})`:'')};
 abrirModal({titulo:`Importar ${rot} (GeoJSON)`,okTxt:`Usar como ${rot}`,
  html:`<div class="hint">${parsed.feats.length} polígono(s) · coordenadas: ${parsed.modo}</div>
   <label style="display:block;margin:6px 0">Campo com o nome de cada área<select id="gcn" style="width:100%;margin-top:4px">${parsed.keys.map(k=>`<option ${k===campo0?'selected':''}>${k}</option>`).join('')}<option value="">(sem nome: numerar)</option></select></label>
   <div class="res" id="gcp"></div>
   ${tipo==='R'?'<small style="color:var(--mu)">Regiões com o mesmo nome das atuais mantêm bases, VTR, PM e limite; as novas começam com valores padrão. Os registros são reatribuídos às novas regiões.</small>':'<small style="color:var(--mu)">Os quadrantes aparecem no mapa (tracejado laranja) e podem ser escolhidos na ronda preventiva.</small>'}`,
  onMount(){const up=()=>{$('gcp').textContent=prev($('gcn').value||null)};$('gcn').onchange=up;up()},
  async onOk(){const set=geoSet(parsed,$('gcn').value||null,file.name);if(tipo==='R')aplicarRegioes(set);else aplicarQuadrantes(set);
   try{await idbSet(tipo==='R'?'geoR':'geoQ',{obj,campo:set.campo,fonte:file.name})}catch(e){}
   fit(null,1);toast(`${set.feats.length} ${rot} importadas (${parsed.modo})`)}})}
$('gfr').onchange=e=>{const f=e.target.files[0];if(f)lerGeo(f,'R');e.target.value=''};
$('gfq').onchange=e=>{const f=e.target.files[0];if(f)lerGeo(f,'Q');e.target.value=''};
$('gbh').onclick=async()=>{aplicarRegioes(regionaisBH());try{await idbDel('geoR')}catch(e){}fit(null,1);toast('Regionais de BH (PBH) em uso')};
$('gfx').onclick=async()=>{restaurarSementes();try{await idbDel('geoR')}catch(e){}toast('Regiões aproximadas em uso')};
$('gqx').onclick=async()=>{GEO.Q=null;geoInfo();S.rt=null;draw();try{await idbDel('geoQ')}catch(e){}toast('Quadrantes removidos')};

/* restaura polígonos salvos pelo usuário (executado na inicialização, depois de carregar os dados) */
async function geoRestaurar(){
 try{const r=await idbGet('geoR');if(r){const p=geoParse(r.obj);aplicarRegioes(geoSet(p,r.campo,r.fonte));toast('Regiões salvas restauradas: '+r.fonte)}}catch(e){}
 try{const q=await idbGet('geoQ');if(q){const p=geoParse(q.obj);aplicarQuadrantes(geoSet(p,q.campo,q.fonte));toast('Quadrantes salvos restaurados: '+q.fonte)}}catch(e){}}
