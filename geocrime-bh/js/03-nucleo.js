const S={all:[],f:[],qt:null,lv:[],hs:[],posts:[],pin:null,knn:[],V:{s:.01,ox:0,oy:0}};let NSEL=3000;

function gen(n){const tw=CEN.reduce((a,c)=>a+c[3],0),out=[];
 for(let i=0;i<n;i++){let la,ln,b;
  if(Math.random()<.22){la=BB.la[0]+Math.random()*(BB.la[1]-BB.la[0]);ln=BB.ln[0]+Math.random()*(BB.ln[1]-BB.ln[0]);b='Malha urbana'}
  else{let r=Math.random()*tw,c=CEN[0];for(const q of CEN){if((r-=q[3])<=0){c=q;break}}b=c[0];la=c[1]+gs()*c[4]/KY;ln=c[2]+gs()*c[4]/KX}
  la=Math.min(BB.la[1]-.002,Math.max(BB.la[0]+.002,la));ln=Math.min(BB.ln[1]-.002,Math.max(BB.ln[0]+.002,ln));
  let r=Math.random(),t='Roubo';for(const k in T){if((r-=T[k].pr)<=0){t=k;break}}
  const p=mk(la,ln,t,(((Math.round(T[t].mu+gs()*4.5))%24)+24)%24,b),G=RG[p.r];let a,w,m;
  do{a=Math.floor(Math.random()*365);m=mkDate(a);w=(1+.5*Math.cos(2*Math.PI*(m.ym%12-G.pk)/12))*(1+G.tr*(1-a/182))*(m.dm<=7||m.dm>=26?1.25:1)}while(Math.random()*2.9>w);
  Object.assign(p,m);out.push(p)}
 return out}

function setBox(){let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const p of S.all){a=Math.min(a,p.x);b=Math.min(b,p.y);c=Math.max(c,p.x);d=Math.max(d,p.y)}
 const cx=(a+c)/2,cy=(b+d)/2,h=Math.max(c-a,d-b)/2+10;S.box=[cx-h,cy-h,cx+h,cy+h];S.bb=[a,b,c,d];S.area=Math.max(1,(c-a)*(d-b))}
const inPer=(h,p)=>{if(!p)return true;const[a,b]=p.split('-').map(Number);return h>=a&&h<=b};
const cen=l=>{let x=0,y=0,w=0;for(const p of l.pts){const q=T[p.t].w;x+=p.x*q;y+=p.y*q;w+=q}if(!w){x=y=0;for(const p of l.pts){x+=p.x;y+=p.y}w=l.pts.length||1}return{x:x/w,y:y/w}};

function rebuild(){
 const t=$('ft').value,p=$('fp').value;
 S.f=S.all.filter(d=>pass(d));S.f.forEach((d,j)=>d.j=j);
 S.g={};for(const k in T)S.g[k]=[];S.f.forEach(d=>S.g[d.t].push(d));
 S.qt=mkQT();S.f.forEach(d=>S.qt.ins(d));
 S.lv=S.qt.leaves([]);S.lv.forEach(l=>l.dn=l.n/((l.x1-l.x0)*(l.y1-l.y0)));
 S.md=Math.max(1e-12,...S.lv.map(l=>l.dn));
 S.ver=(S.ver||0)+1;S.W=wsum(S.f);S.mean=S.W/S.area;S.posts=[];S.cmp=null;S.pz=null;S.rt=null;S.sr=null;S.kr=[];S.cl=null;S.kde=null;extras();chips();
 hotspots();if(S.pin)inspect(S.pin.x,S.pin.y);else draw()}

/* Hotspots: densidade ponderada por gravidade em raio fixo (consulta por raio na QuadTree) + supressão de sobreposição */
function hotspots(){const R=+$('R').value,out=topSpots(5,R);S.hs=out;
 $('s1').textContent=S.f.length.toLocaleString('pt-BR');$('s2').textContent=S.lv.length;$('s3').textContent=Math.max(0,...S.lv.map(l=>l.d));
 const sh=S.f.length?out.reduce((a,o)=>a+o.n,0)/S.f.length*100:0;$('s4').textContent=Math.round(sh)+'%';
 const ar=5*Math.PI*R*R/S.area*100;
 $('hs').innerHTML=out.map((o,i)=>`<div class="hl" data-i="${i}" title="Ir para a mancha">#${i+1} <b>${o.b}</b> · ${o.n} oc. · ${f1(o.r)}× a média</div>`).join('')+(out.length?`<div style="color:var(--mu);margin-top:4px">As 5 manchas criminais (raio ${R} m) concentram <b>${Math.round(sh)}%</b> das ocorrências em apenas <b>${f1(ar)}%</b> da área de estudo.</div>`:'<div style="color:var(--mu)">Sem dados para os filtros.</div>')}

function hourChart(){const c=$('hc'),g=c.getContext('2d'),t=$('ft').value,p=$('fp').value,h=Array(24).fill(0);
 S.all.forEach(d=>{if(!t||d.t===t)h[d.h]++});const m=Math.max(1,...h);g.clearRect(0,0,230,58);
 h.forEach((v,i)=>{g.fillStyle=inPer(i,p)?'#6366f1':cv('--bd');const bh=v/m*40;g.fillRect(i*9.6+1,45-bh,8,bh)});
 g.fillStyle=cv('--mu');g.font='9px sans-serif';[0,6,12,18,23].forEach(i=>g.fillText(i+'h',i*9.6,56))}

/* Mapa base: tiles Esri desenhados no canvas (requer internet; funciona ao abrir o arquivo localmente) */
const TL={};let BASE='ruas';
const tX=(ln,z)=>(ln+180)/360*2**z,tY=(la,z)=>{const r=la*Math.PI/180;return(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*2**z};
const lnOf=(x,z)=>x/2**z*360-180,laOf=(y,z)=>Math.atan(Math.sinh(Math.PI*(1-2*y/2**z)))*180/Math.PI;
function tiles(g,w,h,X,Y,V=S.V){if(BASE==='none')return;const{s,ox,oy}=V;
 const z=Math.max(9,Math.min(BASE==='gray'?16:18,Math.round(Math.log2(156543.03*Math.cos(LAT0*Math.PI/180)*s))));
 const laT=LAT0+(oy/s)/KY,laB=LAT0+((oy-h)/s)/KY,lnL=LNG0+(-ox/s)/KX,lnR=LNG0+((w-ox)/s)/KX;
 const x0=Math.floor(tX(lnL,z)),x1=Math.floor(tX(lnR,z)),y0=Math.floor(tY(laT,z)),y1=Math.floor(tY(laB,z));
 if((x1-x0+1)*(y1-y0+1)>80)return;
 const dk=matchMedia('(prefers-color-scheme:dark)').matches,
  base=BASE==='sat'?'World_Imagery/MapServer':BASE==='ruas'?'World_Street_Map/MapServer':'Canvas/World_'+(dk?'Dark':'Light')+'_Gray_Base/MapServer';
 for(let tx=x0;tx<=x1;tx++)for(let ty=y0;ty<=y1;ty++){
  const u=`https://server.arcgisonline.com/ArcGIS/rest/services/${base}/tile/${z}/${ty}/${tx}`;let im=TL[u];
  if(!im){im=TL[u]=new Image();im.onload=()=>{draw();pDraw()};im.src=u}
  if(!im.complete||!im.naturalWidth)continue;
  const a=(lnOf(tx,z)-LNG0)*KX,b=(lnOf(tx+1,z)-LNG0)*KX,c=(laOf(ty,z)-LAT0)*KY,d=(laOf(ty+1,z)-LAT0)*KY;
  g.drawImage(im,X(a),Y(c),(b-a)*s+.6,(c-d)*s+.6)}
 g.fillStyle=cv('--mu');g.font='10px sans-serif';g.fillText('Mapa base © Esri',w-100,h-8)}

function draw(){const c=$('c'),w=c.clientWidth,h=c.clientHeight;if(!w)return;drawOn(c,S.V,{w,h,d:devicePixelRatio||1,tiles:true,main:true})}
/* desenha o mapa num canvas qualquer (também usado para gerar a imagem do relatório, sem mapa base) */
function drawOn(c,V,o){
 const{w,h,d}=o;
 if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=w*d;c.height=h*d}
 const g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);g.fillStyle=cv('--cv');g.fillRect(0,0,w,h);
 const{s,ox,oy}=V,X=x=>ox+x*s,Y=y=>oy-y*s,R=+$('R').value;
 const circ=(x,y,r,st,da,fi)=>{g.beginPath();g.arc(X(x),Y(y),r*s,0,7);if(fi){g.fillStyle=fi;g.fill()}g.setLineDash(da||[]);g.strokeStyle=st;g.lineWidth=1.5;g.stroke();g.setLineDash([])};
 if(o.tiles)tiles(g,w,h,X,Y,V);
 if($('lk').checked&&!S.cmp)kdeDraw(g,X,Y,s);
 if(S.cmp)cmpDraw(g,X,Y,s);else if($('lq').checked)for(const l of S.lv){const x=X(l.x0),y=Y(l.y1),cw=(l.x1-l.x0)*s,ch=(l.y1-l.y0)*s;if(x>w||y>h||x+cw<0||y+ch<0)continue;
  const q=Math.log(1+l.dn*1e6)/Math.log(1+S.md*1e6);g.fillStyle=`hsla(${220-220*q},85%,55%,${.06+.4*q})`;g.fillRect(x,y,cw,ch);g.strokeStyle='rgba(148,163,184,.35)';g.lineWidth=1;g.strokeRect(x,y,cw,ch)}
 if($('lr').checked)geoDraw(g,X,Y);
 if($('lp').checked){const z=Math.max(1.2,Math.min(3.5,s*40));for(const k in T){g.fillStyle=T[k].c;const r=k==='CVLI'?z*1.4:z;for(const p of S.g[k]){const x=X(p.x),y=Y(p.y);if(x>-5&&y>-5&&x<w+5&&y<h+5)g.fillRect(x-r,y-r,2*r,2*r)}}}
 if($('lh').checked){g.font='bold 12px sans-serif';S.hs.forEach((o,i)=>{circ(o.x,o.y,R,'#ca8a04',[6,4]);g.fillStyle='#ca8a04';g.fillText('#'+(i+1),X(o.x)-6,Y(o.y)-R*s-4)})}
 (S.pz||[]).forEach(o=>circ(o.x,o.y,R,'#d946ef',[2,3],'rgba(217,70,239,.12)'));(S.cl||[]).forEach((o,i)=>{circ(o.x,o.y,o.rad,'#f97316',[],'rgba(249,115,22,.10)');if(i<12){g.fillStyle='#ea580c';g.font='bold 11px sans-serif';g.fillText('A'+(i+1),X(o.x)-6,Y(o.y)+4)}});if(!o.semRotas)drawRoutes(g,X,Y,s);
 S.posts.forEach(b=>{circ(b.x,b.y,S.postR,b.ov?'#ef4444':'#10b981',[],b.ov?'rgba(239,68,68,.15)':'rgba(16,185,129,.13)');g.beginPath();g.arc(X(b.x),Y(b.y),5,0,7);g.fillStyle=b.ov?'#b91c1c':'#059669';g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke()});
 if(S.pin){circ(S.pin.x,S.pin.y,R,'#6366f1',[4,4]);g.strokeStyle='#818cf8';g.lineWidth=1.3;g.setLineDash([3,3]);
  for(const o of S.knn){g.beginPath();g.moveTo(X(S.pin.x),Y(S.pin.y));g.lineTo(X(o.p.x),Y(o.p.y));g.stroke()}g.setLineDash([]);
  for(const o of S.knn){g.beginPath();g.arc(X(o.p.x),Y(o.p.y),6,0,7);g.strokeStyle=cv('--fg');g.lineWidth=1.5;g.stroke()}
  g.beginPath();g.arc(X(S.pin.x),Y(S.pin.y),7,0,7);g.fillStyle='#6366f1';g.fill();g.strokeStyle='#fff';g.lineWidth=2.5;g.stroke()}
 if(S.selM){const m=S.selM;g.strokeStyle='#0ea5e9';g.lineWidth=2;g.setLineDash([6,3]);g.strokeRect(X(m.x0),Y(m.y1),(m.x1-m.x0)*s,(m.y1-m.y0)*s);g.setLineDash([])}
 if($('lr').checked)regLabels(g,X,Y,w,h);scaleBar(g,s,h);if(o.main)qcSync()}
function regLabels(g,X,Y,w,h){g.font='600 11px sans-serif';g.textAlign='center';g.lineJoin='round';RG.forEach((r,i)=>{const x=X(r.x),y=Y(r.y);if(x<0||y<0||x>w||y>h)return;const on=$('fr').value===String(i);g.globalAlpha=on?1:.75;g.lineWidth=3;g.strokeStyle=cv('--cv');g.strokeText(r.n,x,y);g.fillStyle=on?cv('--ac'):cv('--mu');g.fillText(r.n,x,y)});g.globalAlpha=1;g.textAlign='start'}
function scaleBar(g,s,h){const raw=90/s,pw=10**Math.floor(Math.log10(raw)),L=[1,2,5,10].map(v=>v*pw).reduce((a,b)=>Math.abs(b-raw)<Math.abs(a-raw)?b:a);
 g.strokeStyle=g.fillStyle=cv('--fg');g.lineWidth=2;g.beginPath();g.moveTo(14,h-14);g.lineTo(14+L*s,h-14);g.stroke();g.font='11px sans-serif';g.fillText(L>=1000?L/1000+' km':L+' m',14,h-20)}

function inspect(x,y){if(!S.qt)return;const k=+$('k').value,R=+$('R').value;S.pin={x,y};
 const near=S.qt.rng(x,y,R,[],{v:0});S.knn=S.qt.knn(x,y,k,[],{v:0});
 const sc=wsum(near),ra=S.mean?sc/(Math.PI*R*R)/S.mean:0,by={};near.forEach(p=>by[p.t]=(by[p.t]||0)+1);
 const md=S.knn.length?Math.round(S.knn.reduce((a,o)=>a+Math.sqrt(o.d),0)/S.knn.length):0;
 $('insp').innerHTML=`<b>Raio ${R} m:</b> ${near.length} ocorrências · gravidade ${sc}<br><b>${f1(ra)}×</b> a densidade média · risco <b>${ra>3?'CRÍTICO':ra>1.5?'ALTO':ra>.7?'MÉDIO':'BAIXO'}</b><br>`+
  (Object.entries(by).map(([t,n])=>`<span style="color:${T[t].c}">●</span> ${nm(t)} ${n}`).join(' · ')||'sem ocorrências')+
  `<div style="margin-top:6px"><b>${S.knn.length} vizinhos mais próximos</b> (dist. média ${md} m)<br>`+
  S.knn.map((o,i)=>`${i+1}. ${nm(o.p.t)} · ${Math.round(Math.sqrt(o.d))} m · ${o.p.b}<span id="kr${i}"></span>`).join('<br>')+'</div>';draw();knnRoutes()}

function coverOf(B,R){const cv=new Uint8Array(S.f.length);let n=0,w=0;for(const b of B)for(const p of S.qt.rng(b.x,b.y,R,[],{v:0}))if(!cv[p.j]){cv[p.j]=1;n++;w+=T[p.t].w}return[n/(S.f.length||1)*100,w/(S.W||1)*100]}


