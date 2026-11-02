const $=id=>document.getElementById(id);
const T={Roubo:{c:'#ef4444',w:3,mu:20,pr:.40},Furto:{c:'#f59e0b',w:1,mu:14,pr:.38},Veiculos:{c:'#38bdf8',w:2,mu:22,pr:.17},CVLI:{c:'#e879f9',w:5,mu:1,pr:.05}};
const NM={Roubo:'Roubo (CVP)',CVLI:'CVLI (homicídio)',Veiculos:'Roubo/Furto de Veículo'},nm=t=>NM[t]||t;
const LAT0=-19.92,LNG0=-43.94,KY=110574,KX=111320*Math.cos(LAT0*Math.PI/180);
const BB={la:[-20.06,-19.75],ln:[-44.06,-43.85]};
const CEN=[['Centro',-19.919,-43.938,10,1200],['Savassi',-19.938,-43.935,5,900],['Barro Preto',-19.932,-43.953,4,900],['Venda Nova',-19.818,-43.949,6,1800],['Barreiro',-19.975,-44.015,6,1800],['Buritis',-19.968,-43.968,3,1200],['Pampulha',-19.851,-43.972,3,1600],['Floramar',-19.845,-43.905,4,1600],['Sagrada Família',-19.888,-43.918,4,1200],['Goiânia / Nazaré',-19.878,-43.885,3,1400],['Carlos Prates',-19.905,-43.965,4,1000],['Taquaril',-19.915,-43.882,3,1400],['Padre Eustáquio',-19.898,-43.985,3,1200]];
const f1=v=>v.toFixed(1).replace('.',','),wsum=a=>a.reduce((s,p)=>s+T[p.t].w,0);
const cv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const gs=()=>Math.sqrt(-2*Math.log(Math.random()||1e-9))*Math.cos(2*Math.PI*Math.random());
const mkDate=a=>{const d=new Date(Date.now()-a*864e5);return{ago:a,ym:d.getFullYear()*12+d.getMonth(),dm:d.getDate()}};
const mk=(la,ln,t,h,b,a=0)=>{const x=(ln-LNG0)*KX,y=(la-LAT0)*KY;return{x,y,t,h,b,r:reg(x,y),...mkDate(a)}};
const mlb=y=>new Date(Math.floor(y/12),y%12,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','');


/* armazenamento local (IndexedDB): bases importadas e polígonos salvos */
const idbAbrir=()=>new Promise((ok,er)=>{const r=indexedDB.open('geocrime',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>er(r.error)});
const idbOp=(modo,fn)=>idbAbrir().then(db=>new Promise((ok,er)=>{const tx=db.transaction('kv',modo),rq=fn(tx.objectStore('kv'));tx.oncomplete=()=>{db.close();ok(rq&&rq.result)};tx.onerror=tx.onabort=()=>{db.close();er(tx.error)}}));
const idbGet=k=>idbOp('readonly',s=>s.get(k)),idbSet=(k,v)=>idbOp('readwrite',s=>s.put(v,k)),idbDel=k=>idbOp('readwrite',s=>s.delete(k));
