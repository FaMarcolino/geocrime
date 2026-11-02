/* ===== v3: eventos ===== */
$('fr').onchange=()=>{rebuild();fit(S.f.length>2&&$('fr').value!==''?bboxOf(S.f):null,1);hourChart()};
document.querySelectorAll('.wt').forEach(e=>e.onchange=()=>{T[e.dataset.t].w=Math.max(0,+e.value);rebuild()});
$('rr').onchange=()=>{if(S.pin)inspect(S.pin.x,S.pin.y)};
$('rd0').onclick=redistrib;$('db').onclick=dbscan;$('bsc').onclick=scale;$('sel').onclick=()=>{S.sm=!S.sm;if(!S.sm){S.selM=null;draw()}$('sel').classList.toggle('on',S.sm)};$('et').innerHTML=ETICA.map(t=>`• ${t}`).join('<br>');$('cmp').onclick=cmpRun;$('cmpx').onclick=()=>{S.cmp=null;draw()};$('pd').onclick=()=>predRun();$('rb').onclick=()=>ronda();
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.tp').forEach(t=>t.classList.toggle('on',t.id===b.dataset.p))});

/* Interação */
const cn=$('c');let dr=null;
let FL=0;
/* área livre do canvas (descontando painel lateral/inferior e indicadores): centro e tamanho */
function fc(c=cn){const w=c.clientWidth,h=c.clientHeight;let r=0;
 if(c===cn){const u=document.querySelector('.hud');
  if(u&&w>820&&getComputedStyle(u).display!=='none'){const cr=c.getBoundingClientRect(),q=u.getBoundingClientRect();r=Math.max(0,cr.right-q.left+12)}
  if(w-r<w*.55)r=0}
 return{cx:(w-r)/2,cy:h/2,aw:Math.max(200,w-r),ah:Math.max(200,h)}}
function fit(bb,an){const[a,b,e,f]=bb||S.bb,F=fc(),s=Math.min(F.aw/Math.max(e-a,500),F.ah/Math.max(f-b,500))*.9,V={s,ox:F.cx-(a+e)/2*s,oy:F.cy+(b+f)/2*s};if(an)fly(V);else{FL++;S.V=V}}
/* transição animada entre visões (centro linear, escala geométrica) */
/* H = objeto que guarda a visão (S ou PH), dw = redesenho, c = canvas */
function fly(V,H=S,dw=draw,c=cn){const A={...H.V},t0=performance.now(),id=++FL,w=c.clientWidth,h=c.clientHeight,ct=v=>[(w/2-v.ox)/v.s,(v.oy-h/2)/v.s],c0=ct(A),c1=ct(V);
 const st=t=>{if(id!==FL)return;const k=Math.min(1,(t-t0)/450),e=k<.5?2*k*k:1-(-2*k+2)**2/2,s=A.s*(V.s/A.s)**e,cx=c0[0]+(c1[0]-c0[0])*e,cy=c0[1]+(c1[1]-c0[1])*e;H.V={s,ox:w/2-cx*s,oy:h/2+cy*s};dw();if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)}
const flyTo=(x,y,m,H=S,dw=draw,c=cn)=>{const F=fc(c),s=Math.min(F.aw,F.ah)/(2*m);fly({s,ox:F.cx-x*s,oy:F.cy+y*s},H,dw,c)};
const zoomA=(f,H=S,dw=draw,c=cn)=>{const V=H.V,F=fc(c),x=(F.cx-V.ox)/V.s,y=(V.oy-F.cy)/V.s,s=V.s*f;fly({s,ox:F.cx-x*s,oy:F.cy+y*s},H,dw,c)};
const zoom=(f,cx,cy)=>{const V=S.V,x=(cx-V.ox)/V.s,y=(V.oy-cy)/V.s;V.s*=f;V.ox=cx-x*V.s;V.oy=cy+y*V.s;draw()};
cn.onpointerdown=e=>{FL++;cn.setPointerCapture(e.pointerId);dr={x:e.offsetX,y:e.offsetY,mv:0,sel:e.shiftKey||S.sm};if(dr.sel){S.sr=null;S.st=(S.st||0)+1}};
cn.onpointermove=e=>{if(!dr)return;if(dr.sel){const V=S.V,m=(a,b)=>[(a-V.ox)/V.s,(V.oy-b)/V.s],A=m(dr.x,dr.y),B=m(e.offsetX,e.offsetY);S.selM={x0:Math.min(A[0],B[0]),x1:Math.max(A[0],B[0]),y0:Math.min(A[1],B[1]),y1:Math.max(A[1],B[1])};draw();return}const dx=e.offsetX-dr.x,dy=e.offsetY-dr.y;dr.mv+=Math.abs(dx)+Math.abs(dy);S.V.ox+=dx;S.V.oy+=dy;dr.x=e.offsetX;dr.y=e.offsetY;draw()};
cn.onpointerup=e=>{if(dr&&dr.sel){selStats();dr=null;return}if(dr&&dr.mv<5)inspect((e.offsetX-S.V.ox)/S.V.s,(S.V.oy-e.offsetY)/S.V.s);dr=null};
cn.addEventListener('wheel',e=>{e.preventDefault();FL++;zoom(e.deltaY<0?1.2:1/1.2,e.offsetX,e.offsetY)},{passive:false});
$('zi').onclick=()=>zoomA(1.4);$('zo').onclick=()=>zoomA(1/1.4);$('zf').onclick=()=>fit(null,1);

function load(all,label){S.all=all;S.rep={};S.pin=null;S.pm=null;S.sr=null;$('pm').hidden=true;S.knn=[];$('insp').textContent='Clique no mapa: k-NN + risco na vizinhança.';$('src').textContent=label;setBox();fit();buildMonths();rebuild();hourChart()}
document.querySelectorAll('#nb button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#nb button').forEach(x=>x.classList.toggle('on',x===b));NSEL=+b.dataset.n;load(gen(NSEL),'· sintético')});
$('regen').onclick=()=>load(gen(NSEL),'· sintético');
$('ft').onchange=$('fp').onchange=$('fm').onchange=$('fe').onchange=()=>{rebuild();hourChart()};
$('cap').oninput=e=>{$('capv').textContent=e.target.value;RG.forEach(r=>r.c=+e.target.value);rebuild()};
$('dep').oninput=e=>{$('depv').textContent=e.target.value;rebuild()};
$('lp').onchange=$('lq').onchange=$('lh').onchange=$('lk').onchange=draw;
$('k').oninput=e=>{$('kv').textContent=e.target.value;if(S.pin)inspect(S.pin.x,S.pin.y)};
$('R').oninput=()=>{S.kde=null;hotspots();if(S.pin)inspect(S.pin.x,S.pin.y);else draw()};
$('bs').onchange=e=>{BASE=e.target.value;draw()};
$('go').onclick=alloc;$('bm').onclick=benchAll;
