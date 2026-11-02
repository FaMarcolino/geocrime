/* ===== editor de relatório =====
   O usuário escolhe título, dados, seções (ligar/desligar, ordem, comentário por seção), escreve o resumo e blocos de texto,
   vê a prévia em papel e exporta em PDF (imprimir), CSV ou HTML. A configuração e os modelos ficam salvos no navegador. */
const REL_PADRAO=()=>({titulo:'Relatório de análise criminal',sub:'',inst:'',unidade:'',autor:'',data:'',local:'Belo Horizonte',ano:'',capa:1,sumario:1,fonte:'Times New Roman',tam:12,esp:1.5,refs:'',escopo:'filtros',dias:0,logo:'',resumoTxt:'',
 ordem:['resumo','kpis','evolucao','natureza','horario','regioes','manchas','locais','mapa','sazonal','cobertura','ronda','mapaRonda','previsao','mapaPred','comparacao','aglomerados','rotaArea','fontes','etica'],
 on:{resumo:1,kpis:1,evolucao:1,natureza:1,horario:1,regioes:1,manchas:1,locais:0,mapa:1,sazonal:0,cobertura:1,ronda:1,mapaRonda:0,previsao:1,mapaPred:1,comparacao:1,aglomerados:1,rotaArea:1,fontes:1,etica:1},notas:{},abertas:{},extras:[]});
let REL=REL_PADRAO();
try{const s=JSON.parse(store.get('gc_rel')||'null');if(s)REL={...REL_PADRAO(),...s,on:{...REL_PADRAO().on,...s.on}}}catch(e){}
const relSalvar=(()=>{let t;return()=>{clearTimeout(t);t=setTimeout(()=>store.set('gc_rel',JSON.stringify(REL)),300)}})();

/* ---- seções disponíveis ---- */
const tbx=(h,r)=>({h,r});
const SEC={
 resumo:{n:'Resumo executivo',d:'Texto de abertura (editável).',ok:()=>true,html:c=>`<div class="rtx">${esc(relResumo(c.A)).replace(/\n/g,'<br>')}</div>`,tab:()=>[]},
 kpis:{n:'Indicadores',d:'Registros, gravidade, variação de 30 dias, região, natureza, horário e dia de pico.',ok:()=>true,
  html:c=>`<div class="kpg">${kpiRel(c.A).map(k=>`<div class="kpc"><small>${k[0]}</small><b>${k[1]}</b><em>${k[2]}</em></div>`).join('')}</div>`,tab:c=>[{t:'Indicadores',...tbx(['Indicador','Valor','Observação'],kpiRel(c.A).map(k=>[k[0],k[1],k[2]]))}]},
 evolucao:{n:'Evolução mensal',d:'Barras empilhadas por natureza.',ok:c=>!c.A.semData,html:c=>svgEvolucao(c.A,TH_CLARO),
  tab:c=>[{t:'Evolução mensal',...tbx(['Mês',...NAT.map(nm),'Total','IG'],c.A.meses.map(m=>[m.k,...NAT.map(k=>m.v[k]),m.tot,m.ig]))}]},
 natureza:{n:'Natureza dos registros',d:'Distribuição por tipo de ocorrência.',ok:c=>c.A.n>0,html:c=>svgDonut(c.A,TH_CLARO),tab:c=>[{t:'Natureza',...tbx(['Natureza','Registros','%','IG'],NAT.map(k=>[nm(k),c.A.nat[k],c.A.n?(c.A.nat[k]/c.A.n*100).toFixed(1).replace('.',','):'0',c.A.natIG[k]]))}]},
 horario:{n:'Quando ocorre (dia × hora)',d:'Mapa de calor por dia da semana e hora.',ok:c=>c.A.n>0,html:c=>svgHeat(c.A,TH_CLARO)+svgHoras(c.A,TH_CLARO),tab:c=>[{t:'Registros por hora',...tbx(['Hora','Registros'],c.A.hora.map((v,h)=>[h+'h',v]))}]},
 regioes:{n:'Regiões',d:'Registros, gravidade e efetivo cadastrado por região.',ok:c=>c.A.n>0,html:c=>tbl(['Região','Registros','IG','IG %','Bases','VTR','PM'],regRel(c.A)),tab:c=>[{t:'Regiões',...tbx(['Região','Registros','IG','IG %','Bases','VTR','PM'],regRel(c.A))}]},
 manchas:{n:'Manchas criminais',d:'As 5 áreas de maior concentração.',ok:()=>S.hs.length>0,html:()=>tbl(['#','Local','Registros','Vezes a média'],S.hs.map((o,i)=>[i+1,o.b,o.n,f1(o.r)+'×'])),tab:()=>[{t:'Manchas criminais',...tbx(['#','Local','Registros','Vezes a média'],S.hs.map((o,i)=>[i+1,o.b,o.n,f1(o.r)+'x']))}]},
 locais:{n:'Locais com mais ocorrências',d:'Os 10 locais (bairros) de maior gravidade.',ok:c=>c.A.locs.length>0,html:c=>tbl(['Local','Registros','IG'],c.A.locs.slice(0,10).map(l=>[l.n,l.c,l.ig])),tab:c=>[{t:'Locais',...tbx(['Local','Registros','IG'],c.A.locs.slice(0,10).map(l=>[l.n,l.c,l.ig]))}]},
 mapa:{n:'Mapa de ocorrências',d:'Imagem do mapa atual (sem mapa base), com as camadas ligadas.',ok:()=>S.f.length>0,html:()=>`<img class="rim" alt="Mapa de ocorrências" src="${snapImg('occ')}">`,tab:()=>[]},
 sazonal:{n:'Sazonalidade região × mês',d:'Gravidade por região e mês.',ok:c=>!c.A.semData&&c.A.meses.length>1,html:c=>htmlSazon(c.A,TH_CLARO),tab:()=>S.rep.sazon?[{t:'Sazonalidade',...S.rep.sazon}]:[]},
 cobertura:{n:'Bases, cobertura e custo',d:'Resultado de "Distribuir bases".',ok:()=>!!S.rep.cobertura,pede:'Distribuir bases e calcular cobertura',run:()=>$('go').click(),html:()=>tbl(S.rep.cobertura.h,S.rep.cobertura.r)+(S.rep.bases?tbl(S.rep.bases.h,S.rep.bases.r):''),tab:()=>[{t:'Cobertura',...S.rep.cobertura},...(S.rep.bases?[{t:'Capacidade das bases',...S.rep.bases}]:[])]},
 ronda:{n:'Ronda preventiva por viatura',d:'Rotas por viatura, bases, tempos e paradas.',ok:()=>!!S.rep.ronda,pede:'Gerar rondas',run:()=>$('rb').click(),html:()=>tbl(S.rep.ronda.h,S.rep.ronda.r),tab:()=>[{t:'Ronda preventiva',...S.rep.ronda},...(S.rep.rondaParadas?[{t:'Ronda preventiva: paradas',...S.rep.rondaParadas}]:[])]},
 mapaRonda:{n:'Mapa das rondas',d:'Imagem do mapa com as rotas.',ok:()=>!!S.rt,pede:'Gerar rondas',run:()=>$('rb').click(),html:()=>`<img class="rim" alt="Mapa das rondas" src="${snapImg('ronda')}">`,tab:()=>[]},
 previsao:{n:'Previsão e validação',d:'Zonas prováveis, chance de ocorrência, horário provável e backtest.',ok:()=>!!S.pm,pede:'Prever',run:()=>$('pd').click(),
  html:()=>{const M=S.pm;return`<p>Horizonte de <b>${M.W} dias</b>, base de ${f1(M.bt.meses)} meses; método: <b>${esc(M.metodo.nome)}</b>${M.auto?' (escolhido pelo backtest)':''}. Total previsto: ≈ ${f1(M.total)}.</p>`+`<h3>Zonas previstas</h3>`+tbl(S.rep.zonasPrev.h,S.rep.zonasPrev.r)+(S.rep.backtest?`<h3>Validação (backtest)</h3>`+tbl(S.rep.backtest.h,S.rep.backtest.r):'')+(S.rep.backtestVolume?`<h3>Validação do volume por região</h3>`+tbl(S.rep.backtestVolume.h,S.rep.backtestVolume.r):'')+(S.rep.previsao?`<h3>Previsão por região</h3>`+tbl(S.rep.previsao.h,S.rep.previsao.r):'')},
  tab:()=>['zonasPrev','backtest','backtestVolume','previsao'].filter(k=>S.rep[k]).map(k=>({t:TT[k],...S.rep[k]}))},
 mapaPred:{n:'Mapa de predição',d:'Imagem do mapa de predição.',ok:()=>!!S.pm,pede:'Prever',run:()=>$('pd').click(),html:()=>`<img class="rim" alt="Mapa de predição" src="${snapImg('pred')}">`,tab:()=>[]},
 comparacao:{n:'Comparação de períodos',d:'Resultado de "Comparar períodos".',ok:()=>!!S.rep.comparacao,pede:'Comparar períodos (aba Análise)',run:()=>{setView('mapa');mostrarModulo('t3');reveal('cr')},html:()=>tbl(S.rep.comparacao.h,S.rep.comparacao.r),tab:()=>[{t:'Comparação de períodos',...S.rep.comparacao}]},
 aglomerados:{n:'Aglomerados (DBSCAN)',d:'Resultado de "Detectar aglomerados".',ok:()=>!!S.rep.clusters,pede:'Detectar aglomerados',run:()=>$('db').click(),html:()=>tbl(S.rep.clusters.h,S.rep.clusters.r),tab:()=>[{t:'Aglomerados',...S.rep.clusters}]},
 rotaArea:{n:'Rota da área selecionada',d:'Rotas geradas ao selecionar uma área no mapa.',ok:()=>!!S.rep.rotaArea,pede:'Selecionar uma área no mapa',run:()=>{setView('mapa');toggleSel()},html:()=>tbl(S.rep.rotaArea.h,S.rep.rotaArea.r),tab:()=>[{t:'Rota da área selecionada',...S.rep.rotaArea}]},
 fontes:{n:'Fontes e metodologia',d:'De onde vêm os dados e como cada número é calculado.',ok:()=>true,html:()=>`<ul>${FONTES().map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`,tab:()=>[]},
 etica:{n:'Limitações e uso responsável',d:'Avisos sobre o uso dos resultados.',ok:()=>true,html:()=>`<ul>${ETICA.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`,tab:()=>[]}};
const FONTES=()=>[`Registros: ${$('src').textContent.replace(/^·\s*/,'')||'base carregada no app'}${/sint/i.test($('src').textContent)?' (DADOS FICTÍCIOS gerados pelo aplicativo; não representam a criminalidade real)':''}.`,
 'Índice de gravidade (IG): soma dos pesos por natureza definidos no app (Roubo 3, Furto 1, CVLI 5, Veículos 2, salvo alteração).',
 'Regiões: '+(GEO.R?GEO.R.fonte:'aproximadas pelo ponto mais próximo de uma semente')+'.','Consultas espaciais por QuadTree; manchas = áreas de maior IG em raio fixo, sem sobreposição.',
 'Previsão: densidade com peso do método vencedor no backtest (janelas do tamanho do horizonte, treino só com dados anteriores); volume por região validado separadamente; intervalo de 80% por Poisson.',
 'Rotas e tempos: OSRM (router.project-osrm.org), sem trânsito; mapa base: Esri.'];
function regRel(A){return RG.map((r,i)=>[r.n,A.reg[i].n,A.reg[i].ig,A.ig?Math.round(A.reg[i].ig/A.ig*100)+'%':'0%',r.b,r.v,r.p])}
function kpiRel(A){return[['Registros',nfmt(A.n),dtxt(A.dRec)],['Gravidade (IG)',nfmt(A.ig),dtxt(A.dIG)],['Região mais crítica',A.regTop.nome,A.regTop.pct+'% do IG'],['Natureza predominante',A.natTop.nome,A.natTop.pct+'% dos registros'],['Horário de pico',A.pico.txt,A.pico.pct+'% dos registros'],['Dia de pico',A.semData?'—':A.dia.nome,A.semData?'sem datas':A.dia.pct+'% dos registros']]}
function relResumo(A){if(REL.resumoTxt.trim())return REL.resumoTxt;return resumoAuto(A)}
function resumoAuto(A){
 if(!A.n)return'Não há registros no recorte escolhido.';
 const dl=A.dRec==null?'':` Nos últimos 30 dias houve ${A.rec} registros, ${A.dRec>.5?'um aumento':A.dRec<-.5?'uma redução':'estabilidade'}${Math.abs(A.dRec)>=.5?' de '+Math.abs(A.dRec).toFixed(1).replace('.',',')+'%':''} em relação aos 30 dias anteriores.`;
 let t=`Foram analisados ${nfmt(A.n)} registros (${REL.escopo==='base'?'toda a base':'filtros do mapa: '+filtrosTxt()}), com índice de gravidade (IG) de ${nfmt(A.ig)}.${dl}\nA natureza predominante é ${A.natTop.nome} (${A.natTop.pct}% dos registros). A região de maior gravidade é ${A.regTop.nome} (${A.regTop.pct}% do IG). O horário de maior incidência é ${A.pico.txt}${A.semData?'':', com pico às '+A.dia.nome+'s'}.`;
 if(S.hs.length)t+=`\nAs 5 manchas criminais concentram ${$('s4').textContent} dos registros; a mais intensa fica em ${S.hs[0].b} (${f1(S.hs[0].r)}× a densidade média).`;
 if(S.pm){const z=S.pm.zs[0];t+=`\nPara os próximos ${S.pm.W} dias (base de ${f1(S.pm.bt.meses)} meses; método: ${S.pm.metodo.nome}), a previsão indica ≈ ${f1(S.pm.total)} ocorrências. A zona de maior probabilidade é ${z.rua||z.b||z.r} (${z.r}), com chance de ${Math.round(z.prob*100)}% de ao menos uma ocorrência em ${S.pm.R} m, mais provável entre ${z.perfil.hora}.`}
 if(S.last)t+=`\nCom as bases posicionadas, a cobertura ponderada é de ${f1(S.last.cw)}%${S.last.ov?` e ${S.last.ov} base(s) operam acima da capacidade`:''}.`;
 if(S.rt)t+=`\nForam planejadas ${S.rt.q.length} rotas de ronda${S.rt.q.some(r=>r.drop.length)?', com paradas de menor IG fora do turno':''}.`;
 return t}

/* ---- montagem do documento ---- */
function relContexto(){return{A:agregar(REL)}}
function relCSV(){const c=relContexto(),out=[];
 for(const id of REL.ordem){const s=SEC[id];if(!s||!REL.on[id]||!s.ok(c))continue;try{for(const t of s.tab(c))out.push(t.t+'\n'+[t.h,...t.r].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\n'))}catch(e){}}
 for(const x of REL.extras)if(REL.on[x.id]!==0&&x.texto.trim())out.push(x.titulo+'\n'+[['Texto'],[x.texto]].map(r=>r.map(y=>`"${String(y).replace(/"/g,'""')}"`).join(';')).join('\n'));
 if(!out.length)return toast('Nenhuma seção com tabela está ativa.','er');dlf('relatorio_geocrime.csv','﻿'+out.join('\n\n'),'text/csv')}
$('xp').onclick=()=>imprimirRel();$('xc').onclick=relCSV;

/* ---- tela do editor ---- */
let _rp=0;const relPrever=()=>{relSalvar();clearTimeout(_rp);_rp=setTimeout(()=>{if(VISTA==='rel')relRender()},120)};
function renderRel(){if(VISTA!=='rel')return;relConfig();relRender()}
function relConfig(){
 const c=relContexto(),f=(id,l,v,ph='')=>`<label class="nf"><small>${l}</small><input id="${id}" value="${esc(v)}" placeholder="${esc(ph)}"></label>`;
 const itens=REL.ordem.map((id,i)=>{const x=REL.extras.find(e=>e.id===id),s=SEC[id];if(!x&&!s)return'';
  const ok=x?true:s.ok(c),nome=x?('Bloco: '+(x.titulo||'texto')):s.n;
  return`<div class="si${ok?'':' off'}" data-id="${id}"><label class="sl"><input type="checkbox" data-t="${id}"${REL.on[id]!==0&&REL.on[id]!==undefined?' checked':''}><span><b>${esc(nome)}</b><small>${x?'Bloco de texto livre.':esc(s.d)}</small></span></label><span class="sb2"><button data-m="up" title="Subir"${i?'':' disabled'}>↑</button><button data-m="dn" title="Descer"${i<REL.ordem.length-1?'':' disabled'}>↓</button><button data-m="nt" title="Comentário"${REL.abertas[id]?' class="on"':''}>✎</button>${x?'<button data-m="rm" title="Remover bloco">✕</button>':''}</span>${!ok&&s&&s.pede?`<div class="pd">Ainda sem dados. <button data-m="run" class="lk">${esc(s.pede)}</button></div>`:''}${!ok&&s&&!s.pede?`<div class="pd">Indisponível para estes dados.</div>`:''}
   ${x?`<div class="xb">${f('xt_'+id,'Título do bloco',x.titulo)}<label class="nf"><small>Texto</small><textarea data-x="${id}" rows="4">${esc(x.texto)}</textarea></label></div>`:''}${REL.abertas[id]?`<label class="nf"><small>Comentário nesta seção (aparece no relatório)</small><textarea data-n="${id}" rows="3">${esc(REL.notas[id]||'')}</textarea></label>`:''}</div>`}).join('');
 const modelos=JSON.parse(store.get('gc_rel_modelos')||'{}');
 $('rcfg').innerHTML=`<details class="sec" open><summary>Identificação</summary><div class="sb"><div class="fg">${f('r_titulo','Título',REL.titulo).replace('class="nf"','class="nf full"')}${f('r_sub','Subtítulo',REL.sub,'ex.: Região Centro-Sul, setembro').replace('class="nf"','class="nf full"')}${f('r_unidade','Unidade',REL.unidade,'ex.: 1º BPM')}${f('r_autor','Responsável',REL.autor,'nome e posto')}${f('r_data','Data do relatório',REL.data,'vazio = data de hoje').replace('class="nf"','class="nf full"')}</div>
  <label class="nf" style="margin-top:6px"><small>Logotipo (imagem opcional)</small><input id="r_logo" type="file" accept="image/*"></label>${REL.logo?'<button id="r_logox" style="margin-top:6px">Remover logotipo</button>':''}</div></details>
  <details class="sec"><summary>Formato ABNT (A4)</summary><div class="sb"><div class="fg">${f('r_inst','Instituição (capa)',REL.inst,'ex.: Polícia Militar de Minas Gerais').replace('class="nf"','class="nf full"')}${f('r_local','Local (capa)',REL.local)}${f('r_ano','Ano',REL.ano,String(new Date().getFullYear()))}
  <label class="nf"><small>Fonte</small><select id="r_fonte">${['Times New Roman','Arial'].map(v=>`<option${REL.fonte===v?' selected':''}>${v}</option>`).join('')}</select></label><label class="nf"><small>Tamanho</small><select id="r_tam">${[10,11,12].map(v=>`<option${REL.tam===v?' selected':''}>${v}</option>`).join('')}</select></label>
  <label class="nf"><small>Entrelinha</small><select id="r_esp">${[1,1.15,1.5].map(v=>`<option value="${v}"${REL.esp===v?' selected':''}>${String(v).replace('.',',')}</option>`).join('')}</select></label></div>
  <label class="sl" style="margin-top:6px"><input type="checkbox" id="r_capa"${REL.capa!==0?' checked':''}><span><b>Capa</b></span></label><label class="sl"><input type="checkbox" id="r_sumario"${REL.sumario!==0?' checked':''}><span><b>Sumário</b></span></label>
  <label class="nf" style="margin-top:6px"><small>Referências (uma por linha; vazio = automáticas)</small><textarea id="r_refs" rows="4">${esc(REL.refs)}</textarea></label>
  <small class="mu">Folha A4, margens 3 cm (superior e esquerda) e 2 cm (inferior e direita), numeração no canto superior direito. Ao imprimir, desmarque "Cabeçalhos e rodapés".</small></div></details>
  <details class="sec" open><summary>Dados do relatório</summary><div class="sb"><div class="fg"><label class="nf full"><small>Quais registros</small><select id="r_escopo"><option value="filtros"${REL.escopo==='filtros'?' selected':''}>Os filtros atuais do mapa</option><option value="base"${REL.escopo==='base'?' selected':''}>Toda a base</option></select></label>
  <label class="nf full"><small>Período</small><select id="r_dias">${[[0,'Todo o período'],[365,'Últimos 12 meses'],[180,'Últimos 6 meses'],[90,'Últimos 3 meses'],[30,'Últimos 30 dias']].map(([v,l])=>`<option value="${v}"${REL.dias===v?' selected':''}>${l}</option>`).join('')}</select></label></div></div></details>
  <details class="sec" open><summary>Seções (marque, ordene e comente)</summary><div class="sb" id="rsecs">${itens}<button id="r_addx" style="width:100%;margin-top:8px">+ Adicionar bloco de texto</button></div></details>
  <details class="sec"><summary>Resumo executivo (texto)</summary><div class="sb"><label class="nf"><small>Edite à vontade; vazio usa o texto automático</small><textarea id="r_resumo" rows="9">${esc(REL.resumoTxt||resumoAuto(c.A))}</textarea></label><div class="row"><button id="r_gerar">Gerar de novo</button><button id="r_limpar">Usar automático</button></div></div></details>
  <details class="sec"><summary>Modelos salvos</summary><div class="sb"><div class="row"><input id="r_mnome" placeholder="Nome do modelo"><button id="r_msalvar">Salvar</button></div>${Object.keys(modelos).length?`<div class="row"><select id="r_mlista">${Object.keys(modelos).map(n=>`<option>${esc(n)}</option>`).join('')}</select></div><div class="row"><button id="r_mcarregar">Carregar</button><button id="r_mexcluir">Excluir</button></div>`:'<small class="mu">Nenhum modelo salvo ainda.</small>'}<button id="r_padrao" style="width:100%;margin-top:6px">Restaurar padrão</button></div></details>`;
}
/* eventos do editor (delegação: o painel é refeito quando a estrutura muda) */
const relTxt={r_titulo:'titulo',r_sub:'sub',r_inst:'inst',r_unidade:'unidade',r_autor:'autor',r_data:'data',r_local:'local',r_ano:'ano',r_refs:'refs'};
$('rcfg').addEventListener('input',e=>{const t=e.target;
 if(relTxt[t.id]){REL[relTxt[t.id]]=t.value;relPrever()}else if(t.id==='r_resumo'){REL.resumoTxt=t.value;relPrever()}
 else if(t.dataset.n){REL.notas[t.dataset.n]=t.value;relPrever()}else if(t.dataset.x){const x=REL.extras.find(y=>y.id===t.dataset.x);if(x){x.texto=t.value;relPrever()}}
 else if(t.id&&t.id.startsWith('xt_')){const x=REL.extras.find(y=>y.id===t.id.slice(3));if(x){x.titulo=t.value;relPrever()}}});
$('rcfg').addEventListener('change',e=>{const t=e.target;
 if(t.dataset.t){REL.on[t.dataset.t]=t.checked?1:0;relSalvar();relRender()}
 else if(t.id==='r_capa'||t.id==='r_sumario'){REL[t.id.slice(2)]=t.checked?1:0;relSalvar();relRender()}
 else if(t.id==='r_fonte'){REL.fonte=t.value;relSalvar();relRender()}else if(t.id==='r_tam'||t.id==='r_esp'){REL[t.id.slice(2)]=+t.value;relSalvar();relRender()}
 else if(t.id==='r_escopo'||t.id==='r_dias'){REL.escopo=$('r_escopo').value;REL.dias=+$('r_dias').value;relSalvar();renderRel()}
 else if(t.id==='r_logo'&&t.files[0]){const fr=new FileReader();fr.onload=()=>{REL.logo=fr.result;relSalvar();renderRel()};fr.readAsDataURL(t.files[0])}});
$('rcfg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const it=b.closest('.si'),id=it&&it.dataset.id,i=id?REL.ordem.indexOf(id):-1;
 if(b.dataset.m==='up'&&i>0){[REL.ordem[i-1],REL.ordem[i]]=[REL.ordem[i],REL.ordem[i-1]];relSalvar();renderRel()}
 else if(b.dataset.m==='dn'&&i<REL.ordem.length-1){[REL.ordem[i+1],REL.ordem[i]]=[REL.ordem[i],REL.ordem[i+1]];relSalvar();renderRel()}
 else if(b.dataset.m==='nt'){REL.abertas[id]=!REL.abertas[id];relSalvar();relConfig()}
 else if(b.dataset.m==='rm'){REL.ordem.splice(i,1);REL.extras=REL.extras.filter(x=>x.id!==id);delete REL.on[id];relSalvar();renderRel()}
 else if(b.dataset.m==='run'){setView('mapa');SEC[id].run()}
 else if(b.id==='r_addx'){const id='x'+Date.now().toString(36);REL.extras.push({id,titulo:'Observações',texto:''});REL.ordem.splice(Math.max(0,REL.ordem.indexOf('fontes')),0,id);REL.on[id]=1;relSalvar();renderRel()}
 else if(b.id==='r_gerar'){REL.resumoTxt='';$('r_resumo').value=resumoAuto(agregar(REL));relPrever()}
 else if(b.id==='r_limpar'){REL.resumoTxt='';relSalvar();renderRel()}
 else if(b.id==='r_logox'){REL.logo='';relSalvar();renderRel()}
 else if(b.id==='r_msalvar'){const n=$('r_mnome').value.trim();if(!n)return toast('Dê um nome ao modelo.','er');const m=JSON.parse(store.get('gc_rel_modelos')||'{}');m[n]={...REL,logo:REL.logo};store.set('gc_rel_modelos',JSON.stringify(m));toast('Modelo "'+n+'" salvo');relConfig()}
 else if(b.id==='r_mcarregar'){const m=JSON.parse(store.get('gc_rel_modelos')||'{}'),x=m[$('r_mlista').value];if(x){REL={...REL_PADRAO(),...x,on:{...REL_PADRAO().on,...x.on}};relSalvar();renderRel();toast('Modelo carregado')}}
 else if(b.id==='r_mexcluir'){const m=JSON.parse(store.get('gc_rel_modelos')||'{}');delete m[$('r_mlista').value];store.set('gc_rel_modelos',JSON.stringify(m));relConfig()}
 else if(b.id==='r_padrao'){REL=REL_PADRAO();relSalvar();renderRel();toast('Padrão restaurado')}});
$('rPdf').onclick=()=>imprimirRel();$('rCsv').onclick=relCSV;$('rHtml').onclick=()=>relHTMLArquivo();
/* abrir o editor pelo painel lateral */
$('rabrir').onclick=()=>setView('rel');$('dabrir').onclick=()=>setView('dash');
