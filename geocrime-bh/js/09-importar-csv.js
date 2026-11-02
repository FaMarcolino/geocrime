/* ===== v9: importação de CSV com assistente de mapeamento =====
   Detecta codificação (UTF-8 ou Windows-1252), separador (; , tab) e colunas; o usuário confere o mapeamento
   (inclusive os valores da coluna de natureza) antes de importar. O mapeamento e a base ficam salvos no navegador. */
function csvRows(tx,sep){const rows=[];let r=[],c='',q=false;
 for(let i=0;i<tx.length;i++){const ch=tx[i];
  if(q){if(ch==='"'){if(tx[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
  else if(ch==='"')q=true;else if(ch===sep){r.push(c);c=''}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&tx[i+1]==='\n')i++;r.push(c);c='';if(r.some(x=>x.trim()!==''))rows.push(r);r=[]}else c+=ch}
 r.push(c);if(r.some(x=>x.trim()!==''))rows.push(r);return rows}
const csvNum=s=>{s=String(s==null?'':s).trim();if(/^-?\d+,\d+$/.test(s))s=s.replace(',','.');return/^-?\d+(\.\d+)?$/.test(s)?parseFloat(s):NaN};
const csvHora=s=>{s=String(s||'');const m=/(?:^|[T\s])(\d{1,2}):\d{2}/.exec(s)||/^\s*(\d{1,2})\s*(?:h|hs|horas?)?\s*$/i.exec(s);return m&&+m[1]<=23?+m[1]:null};
const csvData=s=>{s=String(s||'').trim();let m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s),y,mo,d;if(m)[y,mo,d]=[+m[1],+m[2],+m[3]];else if(m=/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/.exec(s))[d,mo,y]=[+m[1],+m[2],+m[3]];else return null;
 const dt=new Date(y,mo-1,d);return dt.getMonth()===mo-1&&dt.getDate()===d?dt:null};

const CSV_NOMES={lat:['lat','latitude','y','coord_y','lat_fato','latitude_fato','coordenada_y','ycoord'],lng:['lng','lon','long','longitude','x','coord_x','lon_fato','longitude_fato','coordenada_x','xcoord'],
 tipo:['tipo','natureza','delito','natureza_principal','descricao_natureza','natureza_descricao','nat','ds_natureza'],hora:['hora','hora_fato','hora_ocorrencia','hr_fato','horario','hora_do_fato'],
 data:['data','data_fato','data_hora','data_ocorrencia','dt_fato','data_do_fato','data_hora_fato','datahora']};
const CSV_CATS=[['Roubo','Roubo (CVP)'],['Furto','Furto'],['CVLI','CVLI (homicídio)'],['Veiculos','Roubo/Furto de veículo'],['','Ignorar']];
const csvCategoria=s=>{s=geoNorm(s);if(!s)return'';if(/veic|automov|motoc|\bmoto\b|carro|caminh/.test(s))return'Veiculos';if(/homic|cvli|latroc|feminic|morte/.test(s))return'CVLI';if(/furto/.test(s))return'Furto';if(/roub|assalt|extors/.test(s))return'Roubo';return''};

async function csvLer(f){const buf=await f.arrayBuffer();let tx,enc='UTF-8';
 try{tx=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(e){tx=new TextDecoder('windows-1252').decode(buf);enc='Windows-1252'}
 return{tx:tx.replace(/^﻿/,''),enc}}
function csvSep(tx){const first=tx.split(/\r?\n/).find(l=>l.trim());if(!first)return null;const cnt=ch=>first.split(ch).length-1;return cnt(';')>0&&cnt(';')>=cnt(',')?';':cnt('\t')>cnt(',')?'\t':','}
function csvAdivinhar(H,rows){const norm=H.map(h=>geoNorm(h).replace(/ /g,'_')),m={};
 for(const k in CSV_NOMES)m[k]=norm.findIndex(h=>CSV_NOMES[k].includes(h));
 if(m.lat<0||m.lng<0){const am=rows.slice(1,300);H.forEach((h,i)=>{const v=am.map(r=>csvNum(r[i])).filter(x=>!isNaN(x));if(!am.length||v.length<am.length*.6)return;const mu=v.reduce((a,b)=>a+b,0)/v.length;
  if(m.lat<0&&mu>=BB.la[0]&&mu<=BB.la[1])m.lat=i;else if(m.lng<0&&mu>=BB.ln[0]&&mu<=BB.ln[1])m.lng=i})}
 return m}
function csvValores(rows,col,max=40){const c=new Map();for(const r of rows.slice(1)){const v=(r[col]||'').trim();c.set(v,(c.get(v)||0)+1)}
 const l=[...c].sort((a,b)=>b[1]-a[1]);return{top:l.slice(0,max),outros:l.slice(max),total:l.length}}

/* percorre as linhas: com commit=false só conta; com commit=true devolve os pontos */
function csvAplicar(rows,m,nat,commit){
 const out=[],c={ok:0,foraBH:0,semCoord:0,natIgn:0,semHora:0,semData:0};
 for(let k=1;k<rows.length;k++){const r=rows[k],la=csvNum(r[m.lat]),ln=csvNum(r[m.lng]);
  if(isNaN(la)||isNaN(ln)){c.semCoord++;continue}if(!(la>=BB.la[0]&&la<=BB.la[1]&&ln>=BB.ln[0]&&ln<=BB.ln[1])){c.foraBH++;continue}
  let ty;if(m.tipo>=0){const v=(r[m.tipo]||'').trim();ty=v in nat?nat[v]:csvCategoria(v);if(!ty){c.natIgn++;continue}}else ty=nat['']||'Roubo';
  const dv=m.data>=0?r[m.data]||'':'';let h=m.hora>=0?csvHora(r[m.hora]):null;if(h==null)h=csvHora(dv.slice(10));if(h==null){h=12;c.semHora++}
  const d=csvData(dv);if(!d)c.semData++;c.ok++;
  if(commit){const p=mk(la,ln,ty,h,'Ponto importado',d?Math.max(0,Math.round((Date.now()-d)/864e5)):0);p.ts=d?d.getTime():0;out.push(p)}}
 return{out,c}}
const csvAvisos=c=>[c.foraBH&&`${c.foraBH} fora de BH`,c.semCoord&&`${c.semCoord} sem coordenada válida`,c.natIgn&&`${c.natIgn} de natureza ignorada`,c.semHora&&`${c.semHora} sem hora (assumido 12h)`,c.semData&&`${c.semData} sem data válida (assumido hoje)`].filter(Boolean);

/* ---- persistência ---- */
const TCOD=['Roubo','Furto','Veiculos','CVLI'];
async function baseSalvar(nome,pts){
 const n=pts.length,o={nome,quando:Date.now(),n,x:new Float64Array(n),y:new Float64Array(n),t:new Uint8Array(n),h:new Uint8Array(n),ts:new Float64Array(n)};
 pts.forEach((p,i)=>{o.x[i]=p.x;o.y[i]=p.y;o.t[i]=TCOD.indexOf(p.t);o.h[i]=p.h;o.ts[i]=p.ts||0});
 await idbSet('base',o);await idbSet('base_meta',{nome,quando:o.quando,n});await baseCartao()}
async function baseRestaurar(){const o=await idbGet('base');if(!o)return toast('Nenhuma base salva.','er');
 const pts=Array.from({length:o.n},(_,i)=>{const ts=o.ts[i],p=mk(LAT0+o.y[i]/KY,LNG0+o.x[i]/KX,TCOD[o.t[i]],o.h[i],'Ponto importado',ts?Math.max(0,Math.round((Date.now()-ts)/864e5)):0);p.ts=ts;return p});
 load(pts,`· ${o.nome} (${o.n}, salva)`);toast(`Base restaurada: ${o.n.toLocaleString('pt-BR')} registros`)}
async function baseApagar(){try{await idbDel('base');await idbDel('base_meta')}catch(e){}await baseCartao();toast('Base salva apagada')}
async function baseCartao(){let m=null;try{m=await idbGet('base_meta')}catch(e){}
 const el=$('svd');if(!m){el.hidden=true;return}
 el.hidden=false;el.innerHTML=`<b>Base salva neste navegador:</b> ${m.nome} · ${m.n.toLocaleString('pt-BR')} registros · ${new Date(m.quando).toLocaleString('pt-BR')}<div class="row"><button id="svr" class="pri">Restaurar</button><button id="svx">Apagar</button></div>`;
 $('svr').onclick=()=>baseRestaurar().catch(e=>toast('Erro: '+e.message,'er'));$('svx').onclick=baseApagar}
const csvChave=H=>'gc_cmap:'+H.map(h=>geoNorm(h)).join('|').slice(0,300);

/* ---- importação ---- */
async function importCSV(f,{auto=false}={}){
 const fail=m=>{$('insp').textContent=m;toast(m,'er')};
 let L;try{L=await csvLer(f)}catch(e){return fail('Não foi possível ler o arquivo: '+(e.message||e))}
 const sep=csvSep(L.tx);if(!sep)return fail('Arquivo vazio: nenhuma linha encontrada.');
 const rows=csvRows(L.tx,sep),H=rows[0].map(s=>s.trim());
 if(rows.length<2)return fail('O arquivo tem só o cabeçalho, sem registros.');
 let m=csvAdivinhar(H,rows),nat=Object.create(null),lembrado=false;
 try{const p=JSON.parse(localStorage.getItem(csvChave(H))||'null');if(p){for(const k of['lat','lng','tipo','hora','data']){const i=H.indexOf(p.cols[k]);if(i>=0||p.cols[k]===null)m[k]=i}nat=Object.assign(Object.create(null),p.nat);lembrado=true}}catch(e){}
 if(m.lat<0||m.lng<0)if(auto)return fail('Colunas lat e lng não encontradas. Cabeçalho lido: '+H.slice(0,6).join(', '));
 const finalizar=async(m,nat)=>{
  const{out,c}=csvAplicar(rows,m,nat,true);
  if(!out.length)throw new Error(`Nenhum ponto válido: ${rows.length-1} linha(s), ${c.semCoord} sem coordenada numérica, ${c.foraBH} fora de Belo Horizonte, ${c.natIgn} de natureza ignorada.`);
  try{localStorage.setItem(csvChave(H),JSON.stringify({cols:Object.fromEntries(Object.entries(m).map(([k,i])=>[k,i>=0?H[i]:null])),nat}))}catch(e){}
  load(out,`· ${f.name} (${out.length})`);const av=csvAvisos(c);
  toast(`${out.length.toLocaleString('pt-BR')} de ${(rows.length-1).toLocaleString('pt-BR')} linhas importadas`+(av.length?' · '+av.join(' · '):''));
  baseSalvar(f.name,out).catch(()=>toast('Não foi possível salvar a base neste navegador (limite de armazenamento?).','er'))};
 if(auto){const nt=Object.create(null);if(m.tipo>=0)for(const[v]of csvValores(rows,m.tipo,100000).top)nt[v]=csvCategoria(v);else nt['']='Roubo';try{await finalizar(m,nt)}catch(e){fail(e.message)}return}
 const opt=(sel)=>'<option value="-1">(nenhuma)</option>'+H.map((h,i)=>`<option value="${i}"${i===sel?' selected':''}>${h||'(coluna '+(i+1)+')'}</option>`).join('');
 const val=m.tipo>=0?csvValores(rows,m.tipo):null,catSel=(v,c)=>`<select class="cw-n" data-v="${encodeURIComponent(v)}">${CSV_CATS.map(([k,n])=>`<option value="${k}"${k===c?' selected':''}>${n}</option>`).join('')}</select>`;
 abrirModal({titulo:`Importar registros: ${f.name}`,okTxt:'Importar',
  html:`<div class="hint">${(rows.length-1).toLocaleString('pt-BR')} linhas · separador "${sep==='\t'?'tab':sep}" · codificação ${L.enc}${lembrado?' · mapeamento anterior reaplicado':''}</div>
   <div class="cw-g"><label>Latitude<select id="cw-lat">${opt(m.lat)}</select></label><label>Longitude<select id="cw-lng">${opt(m.lng)}</select></label>
   <label>Natureza<select id="cw-tipo">${opt(m.tipo)}</select></label><label>Hora<select id="cw-hora">${opt(m.hora)}</select></label><label>Data<select id="cw-data">${opt(m.data)}</select></label></div>
   <div id="cw-nat"></div><div class="res" id="cw-prev"></div>`,
  onMount(){
   const lerM=()=>({lat:+$('cw-lat').value,lng:+$('cw-lng').value,tipo:+$('cw-tipo').value,hora:+$('cw-hora').value,data:+$('cw-data').value});
   const lerN=()=>{const n=Object.create(null);document.querySelectorAll('.cw-n').forEach(s=>{n[decodeURIComponent(s.dataset.v)]=s.value});return n};
   const natUI=()=>{const mm=lerM(),el=$('cw-nat');if(mm.tipo<0){el.innerHTML='<label style="display:block;margin:6px 0">Sem coluna de natureza: tratar tudo como '+catSel('','Roubo')+'</label>';return}
    const v=csvValores(rows,mm.tipo);el.innerHTML=`<div class="cw-h">Valores da coluna de natureza (${v.total} distintos${v.outros.length?`; os ${v.outros.length} menos frequentes seguem a regra automática`:''})</div><div class="cw-t"><table>${v.top.map(([x,n])=>`<tr><td>${x||'(vazio)'}</td><td>${n.toLocaleString('pt-BR')}</td><td>${catSel(x,(nat&&x in nat)?nat[x]:csvCategoria(x))}</td></tr>`).join('')}</table></div>`;el.querySelectorAll('select').forEach(s=>s.onchange=prev)};
   const prev=()=>{const mm=lerM();if(mm.lat<0||mm.lng<0){$('cw-prev').innerHTML='<b>Escolha as colunas de latitude e longitude.</b>';$('mdo').disabled=true;return}
    const{c}=csvAplicar(rows,mm,lerN(),false),av=csvAvisos(c);$('mdo').disabled=!c.ok;
    $('cw-prev').innerHTML=`<b>${c.ok.toLocaleString('pt-BR')}</b> de ${(rows.length-1).toLocaleString('pt-BR')} linhas serão importadas`+(av.length?`<br><small>${av.join(' · ')}</small>`:'')+
     `<div style="overflow-x:auto;margin-top:6px"><table style="font-size:11px"><tr><th>Lat</th><th>Lng</th><th>Natureza</th><th>Hora</th><th>Data</th></tr>${rows.slice(1,6).map(r=>`<tr><td>${r[mm.lat]??''}</td><td>${r[mm.lng]??''}</td><td>${mm.tipo>=0?(r[mm.tipo]||''):'—'}</td><td>${mm.hora>=0?(r[mm.hora]||''):'—'}</td><td>${mm.data>=0?(r[mm.data]||''):'—'}</td></tr>`).join('')}</table></div>`};
   ['cw-lat','cw-lng','cw-hora','cw-data'].forEach(id=>$(id).onchange=prev);$('cw-tipo').onchange=()=>{natUI();prev()};natUI();prev();
   $('mdo').onclick=async()=>{const mm=lerM(),nn=lerN();$('mdo').disabled=true;try{await finalizar(mm,nn);fecharModal()}catch(e){toast(e.message||String(e),'er');$('mdo').disabled=false}}}})}
$('file').onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)importCSV(f).catch(err=>{$('insp').textContent='Erro ao importar: '+err.message;toast('Erro ao importar: '+err.message,'er')});if(e.target.tagName)e.target.value=''};
