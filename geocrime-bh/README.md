# GeoCrime BH 9.2

Análise espacial de ocorrências com QuadTree: pesquisa, policiamento (bases, rondas por viatura, redistribuição), predição validada por backtest e relatórios. Roda direto no navegador, sem servidor e sem instalação.

**Para abrir:** dê dois cliques em `index.html`.

## Novidades da 9.2

- **Formulários legíveis.** O efetivo por região virou um cartão por região (bases, VTR, PM e limite sempre visíveis, com totais), e os campos de bases/custo, ronda e predição passaram a ter o rótulo em cima e o campo embaixo.
- **Dashboard (aba própria).** As abas **Mapa | Dashboard | Relatório** ficam na barra superior; clicar em *Análise* no menu abre o dashboard: indicadores com variação de 30 dias, evolução mensal por natureza, natureza, dia da semana × hora, regiões, locais, variação por região, sazonalidade, previsão e policiamento. Segue os filtros do mapa ou a base inteira, e um período (tudo, 12, 6, 3 meses ou 30 dias). Clicar numa região, local ou zona leva ao mapa.
- **Predição conforme os meses da base.** O horizonte (7, 14 ou 30 dias) e as janelas do backtest se ajustam ao tamanho do histórico; com mais de 13 meses entra o método "mesmo período do ano anterior". Cada zona mostra a rua (via OSRM), o local, a chance de ao menos uma ocorrência, o intervalo, o horário e o dia da semana mais prováveis.
- **Comparação de algoritmos (aba *Comparação*).** Roda os algoritmos (os do app e os da literatura) nos cenários de teste, em várias sementes, ou na base carregada (por exemplo, dados reais, que ficam no seu computador). Cada algoritmo é avaliado em janelas de teste, treinando só com o que é anterior, de duas formas com o **mesmo orçamento de área**: a **grade uniforme** de sempre e o **recorte por células da QuadTree** (a proposta do projeto). Mostra acerto, PAI e PEI, a diferença para o KDE e o efeito do recorte, com intervalo de confiança por bootstrap e teste de Wilcoxon pareado corrigido por Holm. O resultado vai para o relatório (seção *Comparação de algoritmos*) e para CSV. A metodologia e os resultados medidos estão em [docs/revisao-literatura.md](docs/revisao-literatura.md); `node testes/comparar-bases.mjs 10` repete o experimento por linha de comando, e `node testes/comparar-bases.mjs --csv=dados.csv` o roda sobre um CSV (por exemplo, dados reais; a leitura é local, e a saída vai para `testes/saida/comparacao_real.md`). Opções: `--janelas=N` (nº de janelas de teste; o backtest do app segue com 6), `--desde=AAAA` (ignora registros anteriores ao ano, só com `--csv`) e `--dep=N` (profundidade da QuadTree). A comparação inclui também um **KDE adaptativo** (largura de banda pelos vizinhos mais próximos, medidos na QuadTree), só como referência. Bases que terminam antes de hoje funcionam: a idade dos registros passa a contar a partir do mais recente.
- **Validação de bases reais.** `node testes/validar-base.mjs geocrime-bh/dados/base_dados.csv` (a partir da raiz do repositório) gera `testes/saida/relatorio-qualidade.md`: quantos registros o importador descartaria e por quê, volume por ano, horário 00:00:00, coordenadas repetidas, duplicatas exatas e precisão das coordenadas. A base real usada na validação (furtos de cabos de cobre em BH, de Santos e Silva, 2026) **não vai para o repositório**; origem, limitações e como obtê-la estão em [dados/LEIAME.md](dados/LEIAME.md). Os resultados medidos nela, e a ressalva de que valem para um só tipo de crime, estão em [docs/revisao-literatura.md](docs/revisao-literatura.md).
- **Bases de teste com resposta conhecida.** Em *Pesquisa → Bases de teste* há cinco cenários fictícios, reproduzíveis por semente: focos fixos (controle), foco que se desloca, contágio (auto-excitação), sazonal por estação e Carnaval em 5 anos (com a data móvel calculada pela Páscoa). Cada um guarda o que foi plantado nos dados (a "verdade"), para comparar os algoritmos onde se sabe qual deveria ir melhor. A descrição e os resultados medidos estão em [docs/revisao-literatura.md](docs/revisao-literatura.md); `node testes/comparar-bases.mjs` gera a tabela completa.
- **Algoritmos da literatura no backtest.** Além dos métodos do app, o backtest de *Análise → Prever* compara o **Prospective hot-spotting** (Bowers et al., 2004) e um **processo auto-excitante tipo ETAS** (Mohler et al., 2011), ao lado do KDE retrospectivo (o *Histórico completo*), com acerto, PAI e **PEI**. Eles são só referência de comparação (marcados com †): não mudam o mapa nem a escolha automática. A revisão da literatura, as referências e os limites de cada implementação estão em [docs/revisao-literatura.md](docs/revisao-literatura.md).
- **Ronda por divisão, por células e no Maps/Waze.** A ronda agora é, por padrão, **por células da QuadTree** (*Dividir por → Células da QuadTree*): cada quadradinho do mapa de maior gravidade ganha uma viatura e uma rota com paradas só dentro dele. Há uma célula por viatura cadastrada (ou o número que você digitar em *Nº de células*), só entram células com 3 registros ou mais e lado de até 1,5 km (áreas esparsas ficam de fora), e uma rua na borda da célula, até 80 m, não conta como fora dela. Regiões, quadrantes importados e grades (agora até 8×8) continuam disponíveis. Com **Uma subdivisão para cada viatura** (ligada por padrão), cada divisão com mais de uma VTR é repartida em territórios, um por viatura (k-médias pelos registros), pintados no mapa com a cor da rota; as paradas de cada VTR ficam só no seu território e as rotas deixam de se misturar. O app mede quanto do trajeto pelas ruas cai fora do território (coluna *Fora da divisão*, sem contar a ida e a volta da base quando ela está fora) e refaz os trechos com trajetos alternativos quando passa de 10%. Clicar numa linha da tabela abre as paradas com **Rota no Google Maps** (até 10 pontos por link; rotas maiores viram partes encadeadas) e, para cada parada, links do **Waze** e do Maps. Latitude e longitude das paradas entram no relatório e no CSV.
- **Relatório em A4 no formato ABNT.** A prévia e o PDF saem em folhas A4 (21 × 29,7 cm), margens de 3 cm (superior e esquerda) e 2 cm (inferior e direita), texto justificado em Times New Roman (ou Arial) 12 com entrelinha 1,5, capa, sumário com páginas, seções numeradas (1, 1.1…), legendas "Tabela N – …" e "Figura N – …" com "Fonte:", tabelas com traços horizontais, numeração no canto superior direito a partir da primeira folha de texto e referências no fim. Tabelas longas continuam na folha seguinte ("continua") e os blocos não ficam cortados. Fonte, tamanho, entrelinha, capa, sumário, instituição, local, ano e referências são editáveis em **Formato ABNT (A4)**. Ao imprimir, escolha "Salvar como PDF", papel A4, margens "Nenhuma/Padrão" (o `@page` já define as margens) e desmarque "Cabeçalhos e rodapés".
- **Editor de relatório (aba própria).** Título, unidade, responsável, logotipo, quais registros e período; seções que se ligam/desligam, mudam de ordem e recebem comentário; resumo executivo editável; blocos de texto livres; modelos salvos; prévia em papel. Exporta PDF (impressão), CSV das tabelas e arquivo HTML. Mapas entram como imagem sem mapa base (por isso aparecem no PDF).

## Interface em painel (9.1)

A tela foi reorganizada como um painel administrativo: **barra lateral fixa** com os módulos (Pesquisa, Policiamento, Análise, Relatórios; cada um abre logo abaixo do seu item), **barra superior** com menu, **busca** (Ctrl+K ou /: regiões, locais, manchas, coordenadas e ações como "gerar rondas" ou "prever"), origem dos dados (destaque amarelo para dados sintéticos), tela cheia e **alertas** (dados sintéticos, células saturadas, bases sobrecarregadas, paradas fora do turno, filtro sem registros). Os indicadores viraram cartões com a variação dos últimos 30 dias contra os 30 anteriores. No celular a barra lateral vira uma gaveta aberta pelo menu.

As cores vêm de variáveis no topo de `css/tema-painel.css` (`--ac` e `--ac2` definem o destaque; `--bg`, `--pn` e `--bd` as superfícies).

## O que há de novo na 9.0

1. **Dados reais.** O botão *Importar CSV* abre um assistente: detecta codificação (UTF-8 ou Windows-1252) e separador, sugere as colunas (inclusive pelos valores, quando os nomes não ajudam), deixa você mapear cada valor da coluna de natureza (ou ignorar) e mostra uma prévia com o que será importado e o que será descartado. O mapeamento é lembrado para o mesmo cabeçalho, e a base fica salva no navegador (IndexedDB) com botão *Restaurar*.
2. **Regiões e quadrantes de verdade.** As 9 regionais de Belo Horizonte (Prefeitura de BH, dados abertos, CC-BY) vêm embutidas; cada registro pertence ao polígono que o contém. Também dá para importar regiões ou quadrantes de patrulha em GeoJSON (WGS84 ou SIRGAS 2000 / UTM 23S, com detecção de lat,lon invertidos), que ficam salvos e podem ser usados na ronda.
3. **Ronda por viatura.** Divide cada região/quadrante entre as VTR, ordena cada percurso pelo tempo real de viagem (matriz OSRM + 2-opt), sai e volta da base e retira as paradas de menor IG que não cabem no turno. A seleção de área também gera as rotas por viatura, com o número de VTR necessário para cobrir tudo no turno.
4. **Predição que prova valor.** Cada método (mês anterior, histórico completo, recência com várias meias-vidas) é testado em até 6 janelas de 30 dias, treinando só com o que é anterior à janela. O automático escolhe o método mais simples, a menos que outro ganhe de forma consistente. O volume por região também é validado (último mês, média de 3 meses ou tendência) e as zonas mostram intervalo de 80%.

## Estrutura

```
geocrime-bh/
├── index.html                  estrutura da página (painel, mapa, cartões, janela modal)
├── css/
│   ├── base.css                variáveis, layout base, tabelas, impressão
│   ├── interface.css           acordeões, cartões, chips, barra de ferramentas, toasts, modal
│   └── tema-painel.css         shell em painel: barra lateral, barra superior, indicadores, tema e tela pequena
├── js/                         scripts clássicos, carregados NESTA ordem
│   ├── 00-dados-regionais-bh.js   polígonos das 9 regionais de BH (PBH, CC-BY)
│   ├── 01-base.js                 constantes, utilitários, armazenamento local (IndexedDB)
│   ├── 02-quadtree.js             classe QT (inserção, raio, retângulo, k-NN)
│   ├── 03-nucleo.js               estado, dados sintéticos, filtros→QuadTree, manchas, mapa base, desenho, consulta de ponto
│   ├── 04-policiamento.js         bases e cobertura, regiões, efetivo, redistribuição, comparação de períodos
│   ├── 05-rotas-osrm.js           rotas e matriz de tempos (OSRM), controle de taxa
│   ├── 06-relatorios.js           exportação CSV e PDF
│   ├── 07-estruturas-e-analise.js k-d tree, grade, benchmark, DBSCAN, calor (KDE), seleção de área
│   ├── 08-eventos-e-interacao.js  eventos da tela, zoom/arrasto animado, carga de dados
│   ├── 09-importar-csv.js         assistente de importação, mapeamento de natureza, base salva
│   ├── 10-interface.js            navegação, barra superior, busca, alertas, indicadores, atalhos, dica do mouse, avisos
│   ├── 11-regioes-geojson.js      polígonos: leitura GeoJSON/UTM, ponto-em-polígono, regiões, quadrantes, janela modal
│   ├── 12-planejador-de-rondas.js quadrantes, k-médias, rotas por viatura, turno, rota da área
│   ├── 13-backtest-predicao.js    janelas de 30 dias, métodos, volume por região, texto do backtest
│   ├── 13b-comparacao.js          comparação de algoritmos (grade × recorte QuadTree), KDE adaptativo, aba Comparação
│   ├── 14-mapa-de-predicao.js     mapa de predição, lugares prováveis (rua, chance, horário, dia)
│   ├── 15-graficos.js             agregações e gráficos SVG (dashboard e relatório), imagem do mapa
│   ├── 16-dashboard.js            vistas (Mapa/Dashboard/Relatório) e dashboard
│   ├── 17-relatorio.js            editor de relatório (seções, resumo, modelos), CSV
│   ├── 17b-relatorio-abnt.js      documento A4/ABNT: blocos, paginador, capa, sumário, prévia, PDF e HTML
│   ├── 17c-bases-de-teste.js      cenários sintéticos com resposta conhecida (focos, deslocamento, contágio, sazonal, Carnaval)
│   ├── 18-ponte-powerapps.js      ponte opcional por postMessage (pode ser removida)
│   └── 19-inicializacao.js        regionais de BH, base inicial (3.000 registros), restauração do que foi salvo; roda por último
├── build.mjs                   gera dist/geocrime_bh.html (arquivo único)
└── README.md
```

### Por que a ordem importa

Os arquivos de `js/` compartilham as mesmas variáveis globais (`S`, `RG`, `GEO`, `T`, `draw`…), como se fossem um único script. Por isso são `<script src>` comuns, não módulos (módulos não funcionam ao abrir o arquivo com dois cliques). Não reordene as tags em `index.html`.

Cada arquivo só **define** funções; quem **executa** a carga dos dados é o `16-inicializacao.js`, por último. Em scripts separados, uma função declarada num arquivo posterior ainda não existe quando um anterior roda; por isso, no topo de cada arquivo, ligue eventos com funções anônimas (`()=>f()`) quando `f` mora num arquivo mais adiante. A ponte do Power Apps (15) embrulha funções de vários arquivos e precisa vir depois de todos.

## Arquivo único

```
node build.mjs
```

Cria `dist/geocrime_bh.html` com tudo embutido, para enviar por e-mail ou abrir em outro computador.

## Dados e privacidade

- Os registros importados ficam só no navegador (IndexedDB e localStorage). Use *Apagar* no cartão da base salva para removê-los.
- Em tempo de execução a página consulta serviços de terceiros: mapa base da Esri (`server.arcgisonline.com`), rotas e tempos do OSRM (`router.project-osrm.org`, que recebe as coordenadas das rotas) e fontes do Google (`fonts.googleapis.com`). Sem internet, o mapa base some, as rotas viram linha reta, os tempos passam a ser estimados (25 km/h) e as fontes caem para a padrão do sistema.
- Regionais de BH: Prefeitura de Belo Horizonte, Dados Abertos (dados.pbh.gov.br), licença CC-BY; geometria simplificada a 15 m.

## Limites conhecidos

- O backtest usa até 6 janelas do tamanho do horizonte (7, 14 ou 30 dias, conforme os meses da base); com menos de 2 janelas válidas (100+ registros de treino e 12+ de teste) o app avisa que não há validação.
- A sazonalidade anual só entra com mais de 13 meses de histórico; o nome da rua das zonas previstas depende do serviço OSRM (internet).
- As rotas seguem as ruas, e as ruas atravessam os limites das divisões. Por isso o app mede e tenta reduzir o trecho fora do território, mas não o garante em zero, sobretudo em territórios e células pequenos (as colunas e o resumo mostram o que sobrou). Divisões maiores, como regiões ou grades 2×2 e 3×3, saem menos.
- O Waze só aceita um destino por vez; por isso a lista de paradas traz um link por parada. Abrir um link do Maps ou do Waze envia as coordenadas a esses serviços.
- Os tempos de viagem do OSRM são sem trânsito. O servidor público tem limite de taxa; a ronda limita as requisições em paralelo e cai para linha reta se ele recusar.
- Efetivo, viaturas e custos continuam sendo valores ilustrativos até serem trocados por dados oficiais.
- Os resultados da comparação de algoritmos na base real valem para furtos de cabos de cobre em BH, não para criminalidade em geral, e os p-valores tendem a ser otimistas (janelas consecutivas compartilham dados de treino). Nos cenários sintéticos o ETAS e o recorte por QuadTree se saem melhor do que na base real; ver [docs/revisao-literatura.md](docs/revisao-literatura.md).
- A caixa de BH usada na importação (`BB` em `js/01-base.js`) descarta alguns registros a poucas centenas de metros da borda oeste.

## Testes

A bateria automática (Edge + Node 22 ou superior) está em `../testes`:

```
cd ../testes
node run.mjs                                          # tudo (testa ../geocrime-bh/index.html)
node run.mjs ../geocrime-bh/index.html csv geo painel # só alguns grupos
node run.mjs ../geocrime-bh/dist/geocrime_bh.html     # o arquivo único gerado por build.mjs
node pdf.mjs                                          # PDF A4/ABNT do relatório em saida/
```

As capturas e PDFs gerados ficam em `../testes/saida/`, que não vai para o git.

Grupos: `boot`, `bases`, `filtros`, `quadtree`, `pesos`, `mapa`, `policiamento`, `analise`, `exportar`, `csv`, `bridge`, `layout`, `estresse`, `geo`, `decisao`, `painel`, `formularios`, `previsao`, `dashboard`, `relatorio`, `cenarios`, `comparacao`.
