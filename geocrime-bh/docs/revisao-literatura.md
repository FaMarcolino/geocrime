# Revisão da literatura: previsão de incidência criminal

Documento de trabalho do GeoCrime BH. Objetivo: levantar os algoritmos de previsão criminal publicados em revistas e congressos, descrever suas características, escolher três para implementar e comparar (com e sem o recorte por células da QuadTree, proposta do projeto).

## Como esta revisão foi feita e o que ela ainda não é

- As referências foram localizadas por busca na web e **confirmadas em registros bibliográficos** (revista, volume, páginas e DOI) e nos resumos. Dos três algoritmos implementados, **dois tiveram o texto completo lido em 16/11/2026** (Mohler et al., 2011, e Chainey et al., 2008), em cópias abertas e **não nas versões finais das revistas**: a do Mohler é o manuscrito dos autores (hospedado em stat.ucla.edu), e a do Chainey é o *preprint* do repositório da UCL. Confira números e páginas na versão publicada antes de citar. **O texto de Bowers et al. (2004) não foi obtido** (acesso restrito, Oxford University Press): do que ele propõe, só há a descrição de terceiros (inclusive a de Mohler et al., 2011, que reproduz o núcleo dele). As demais descrições da seção 1 continuam vindo dos resumos.
- Itens marcados com **[conferir]** têm algum dado que não consegui verificar (iniciais de autores, autoria completa, situação de publicação).
- Preprints (arXiv) estão marcados como tal. Só trabalhos revisados por pares devem sustentar a comparação, como pediu o orientador.
- Não é uma revisão sistemática. Para isso, use as duas revisões sistemáticas listadas na seção 2 como ponto de partida.

## 1. Famílias de algoritmos

| Família | Ideia | Dados que usa | Pontos fortes | Limites | Referências |
|---|---|---|---|---|---|
| **Mapa de calor retrospectivo (KDE, grade, elipses)** | Pontos onde houve crime no passado tendem a ter crime no futuro; densidade de kernel sobre o histórico | Só coordenadas (e tipo/período) | Simples, rápido, difícil de superar como linha de base; o KDE foi o melhor entre quatro técnicas de mapeamento no estudo de Chainey et al. | Não usa o tempo: trata o passado distante como o recente; "retrospectivo" | Chainey et al. (2008) |
| **Near-repeat / prospective hot-spotting** | Cada crime recente é um sinal: eleva o risco nas redondezas por um tempo, e o efeito decai | Coordenadas + datas | Captura a vitimização repetida e o contágio de curto prazo; usável turno a turno | Depende dos parâmetros (raio, janela); não modela o fundo estável | Bowers, Johnson e Pease (2004) |
| **Processos pontuais auto-excitantes (ETAS)** | Intensidade = fundo + gatilhos: cada evento aumenta a intensidade futura ao redor, com decaimento exponencial no tempo e no espaço; parâmetros por máxima verossimilhança/EM | Coordenadas + tempo | Modelo estatístico explícito (separa fundo e contágio); teve ensaio controlado em campo | Pressupõe contágio; mais difícil de ajustar e explicar | Mohler et al. (2011, 2015) |
| **Terreno de risco (RTM)** | Camadas espaciais de fatores de risco (bares, pontos de ônibus, etc.) ponderadas e somadas | Coordenadas dos fatores de risco do ambiente | Incorpora causas e o ambiente; bom para crimes ligados ao entorno | Exige dados de ambiente (que o app não tem) e a escolha de camadas | Caplan, Kennedy e Miller (2011) |
| **Séries temporais por área** | Previsão da contagem por polígono (suavização exponencial, ARIMA) | Contagens por período e área | Boa para volume e sazonalidade; barata | Não localiza dentro da área; depende da contagem média | Gorr, Olligschlaeger e Thompson (2003) |
| **Aprendizado de máquina clássico** | Classificação/regressão sobre células (árvores, florestas aleatórias) com atributos do histórico e do contexto | Defasagens, demografia, contexto | Combina muitas variáveis; compara bem com RTM e near-repeat | Muitos atributos e ajuste; menos interpretável | Bogomolov et al. (2014); Rummens e Hardyns (2020) |
| **Aprendizado profundo** | Redes convolucionais/recorrentes/em grafo sobre uma grade ou grafo espaço-temporal (ST-ResNet, ConvLSTM, GNN) | Séries por célula, em geral grandes volumes | Pode capturar padrões espaço-temporais complexos | Exige muitos dados e treino; a grade é arbitrária; pouco interpretável | ver seção 2 |
| **Kernels/processos gaussianos (concurso NIJ)** | Aproximação de processo de Cox log-gaussiano com termos autorregressivos e suavização | Coordenadas + tempo | Venceu categorias do concurso de previsão do NIJ, superando o KDE em eventos esparsos de curto prazo | Mais complexo de implementar | Flaxman et al. (2019) |

## 2. Revisões sistemáticas (para a base da revisão)

- Kounadi et al. (2020): 32 estudos (2000 a 2018). Predomina a classificação binária de hotspots; o aprendizado de máquina tradicional é mais comum que o profundo; a validação mais usada é a divisão treino/teste; os autores pedem protocolos padronizados para permitir comparação.
- Butt et al. (2020): 49 estudos sobre detecção e previsão espaço-temporal, cobrindo agrupamento, séries temporais e aprendizado profundo.

## 3. Algoritmos escolhidos e implementados

Critérios: (a) publicados em revista revisada por pares; (b) cobrem famílias diferentes; (c) executáveis no navegador, sem servidor e sem dados externos; (d) comparáveis pela mesma métrica de células.

| # | Algoritmo | Referência | Situação no app |
|---|---|---|---|
| 1 | **KDE retrospectivo** | Chainey et al. (2008) | Já existe: é o método "Histórico completo" do backtest (kernel triangular de raio R sobre todo o histórico) |
| 2 | **Prospective hot-spotting** | Bowers et al. (2004) | **Novo** (`P`) |
| 3 | **Processo auto-excitante (tipo ETAS)** | Mohler et al. (2011) | **Novo** (`E`) |

Os três entram no backtest (*Análise → Prever*) e no relatório, lado a lado com os métodos próprios do app (últimos N dias, recência com meia-vida, mesmo período do ano anterior). **P e E são só para comparação**: aparecem na tabela com † e **não** mudam o mapa de predição, o seletor de método nem a escolha automática.

### Como foram implementados (e onde diferem do artigo)

**Prospective hot-spotting.** Cada registro dos últimos 60 dias, a até 400 m da célula, contribui com `1 / ((1 + faixa de distância de 100 m) · (1 + semana))`. Esta forma **bate com a descrição que Mohler et al. (2011) fazem do núcleo de Bowers et al. (2004)**: g(t, d) = 1/((1 + t)(1 + d)), com t em semanas e d em unidades de meia largura de célula, no domínio [0, 2 meses] × [0, 400 m]. Ainda assim é uma conferência de segunda mão: **o texto de Bowers et al. não foi lido**, e a faixa de 100 m aqui é fixa, enquanto no uso descrito por Mohler et al. ela é meia célula de 200 m.

**Processo auto-excitante.** Intensidade λ(x, t) = μ(x) + Σ θ·ω·e^(−ω·Δt)·g_σ(x − xᵢ):
- fundo μ(x) por KDE gaussiano (300 m) ponderado pela probabilidade de cada evento ser "de fundo";
- gatilho com decaimento exponencial no tempo (ω) e gaussiano no espaço (σ);
- θ, ω e σ estimados por EM (declustering estocástico), 12 iterações, com o tempo em dias e pais candidatos até 30 dias antes e 900 m;
- previsão de cada célula = integral da intensidade no horizonte;
- usa no máximo os 4.000 registros mais recentes (limite de custo).

Diferenças em relação a Mohler et al. (2011), confirmadas no texto (ver a subseção seguinte): **o artigo ajusta aos dados reais uma versão não paramétrica**, e a forma exponencial × gaussiana usada aqui é a do **processo simulado no apêndice** do artigo, não a do modelo ajustado aos dados de Los Angeles. Os resultados são, portanto, os desta implementação, e não uma reprodução do artigo.

### O que a leitura dos textos completos mostrou (16/11/2026)

**Mohler et al. (2011), manuscrito dos autores.**
- **Modelo:** λ(t, x, y) = ν(t)·μ(x, y) + Σ g(t − tₖ, x − xₖ, y − yₖ), com o fator temporal ν(t) global (sazonalidade, dia da semana) no fundo. **Nossa versão não tem ν(t)**: o fundo é só espacial.
- **Estimação:** declustering estocástico com as probabilidades pᵢᵢ = μ/λ (evento de fundo) e pⱼᵢ = g/λ (evento j gerou i), as mesmas equações que usamos no EM. A diferença é que o artigo estima μ e g **sem forma paramétrica**, por KDE de largura variável (k-ésimo vizinho mais próximo) sobre pontos amostrados por Monte Carlo a partir de P, e usa uma forma paramétrica (θ·ω·e^(−ωt) × gaussianas) só para **simular** dados e validar o método. Nossa implementação ajusta direto essa forma paramétrica: é um modelo mais simples e **não é a estimação não paramétrica do artigo**.
- **Fundo para previsão:** KDE gaussiano de largura fixa, escolhida por validação cruzada de 20 partes (cerca de 300 m); 130 m previu melhor nos dados deles. O nosso usa 300 m fixo, coerente com o valor por validação cruzada, **sem testar outras larguras**.
- **Dados e protocolo:** 5.376 arrombamentos residenciais em 18 × 18 km do Vale de San Fernando (Los Angeles), 2004 e 2005; a cada dia de 2005, treina-se com tudo desde o início de 2004 e marcam-se as N células de 200 m com maior risco para o dia seguinte; mede-se a % de crimes dentro delas. Com 10% das células marcadas, o processo pontual previu 660 de 2.627 crimes (cerca de 25%) e o *prospective hot-spotting* (400 m, 8 semanas) 547 (cerca de 21%). Com parâmetros otimizados para o hot-spotting (200 m, 39 semanas), ele se aproxima de uma estimativa de Poisson, e ainda perde para o processo pontual. **A direção bate com os nossos resultados (ETAS acima do hot-spotting), mas é o resultado dos próprios autores, em um crime (arrombamento) em que a repetição pesa.**
- **Limites declarados pelos autores:** o método precisa de pelo menos da ordem de 1.000 pontos em 3 dimensões para convergir, e o domínio deve ser várias vezes maior que o suporte do núcleo; pode convergir a um máximo local. Isso pesa para janelas curtas de treino e para bases pequenas.
- **Detalhes a conferir na versão publicada (JASA):** cada arrombamento tem uma janela de tempo em que pode ter ocorrido, e o artigo usa o ponto médio; o apêndice valida o método simulando um processo conhecido (5 execuções) e comparando as estimativas com os parâmetros verdadeiros. Esta cópia é um manuscrito: números, figuras e a tabela de parâmetros podem diferir do texto final.

**Chainey et al. (2008), *preprint*.**
- **PAI:** definição confirmada: PAI = (n/N · 100) ÷ (a/A · 100), isto é, a taxa de acerto dividida pela fração da área; 100% de acerto em 100% da área dá 1. A mesma definição que o app usa.
- **O artigo não define PEI.** Ele define só a taxa de acerto e o PAI, e cita a "Search Efficiency Rate" de Bowers et al. (2004) (eventos por km²), que o app não usa. A origem do PEI é Hunt (2016) (ver a seção 5).
- **Resultado principal:** em quatro técnicas (elipses espaciais, mapa temático de áreas censitárias, mapa temático de grade e KDE), o **KDE foi a melhor** para prever onde os crimes ocorrerão, nas duas datas de corte testadas, e as elipses espaciais foram a pior. (A tabela 6 do *preprint* saiu desalinhada na extração do PDF: confira os valores de PAI por técnica no original antes de citar.)
- **Por tipo de crime:** os mapas de crime de rua tiveram PAI sempre mais alto que os de arrombamento residencial e de furto/roubo de veículos. Com 3% da área, o KDE de três meses de dados capturou 20% dos crimes de rua do mês seguinte (PAI 6,59) e 8% dos arrombamentos (PAI 2,77). Os autores atribuem isso à oportunidade criminal ser concentrada e estática nos locais de comércio e lazer.
- **Como o KDE foi ajustado:** núcleo **quártico**; largura de banda padrão do *Hotspot Detective* (cerca de 230 a 250 m) e célula de cerca de 46 a 49 m; "ponto quente" = a classe mais alta de 5 classes por quantis (a área **não é fixa**). O nosso "Histórico completo" usa **núcleo triangular de raio R = 500 m e orçamento fixo de 5% da área**, portanto é um KDE no espírito do artigo, não uma reprodução dele.
- **Protocolo:** dados de Camden e Islington (Londres), 2002 a 2003; duas datas de corte (1º/01/2003 e 13/03/2003); dados de treino e de teste fatiados de 1 dia a 12 meses. O app usa um protocolo mais parecido com o de Mohler et al. (janelas deslizantes) que com o de Chainey et al.

### Validação das implementações

- **ETAS em dados com resposta conhecida:** num processo de Hawkes simulado com θ = 0,5, vida média de 5 dias e σ = 100 m, a implementação estimou θ = 0,504, vida média = 4,86 dias e σ = 98,3 m (teste automático `literatura: ETAS...`).
- **Prospective hot-spotting:** teste automático de que o risco é positivo ao redor de um foco recente, cai com a distância e é zero para registros com mais de 60 dias ou a mais de 400 m.
- **Backtest:** na base sintética padrão (focos fixos, sem contágio), o ETAS estimou θ ≈ 0, ou seja, não encontrou auto-excitação e se reduziu a um KDE de fundo. Isso é coerente com a base e **não é evidência** a favor nem contra o algoritmo.

### Bases de teste (cenários sintéticos)

Para comparar os algoritmos em situações em que se sabe a resposta, o app gera cinco cenários fictícios (*Pesquisa → Bases de teste*), reproduzíveis por semente. Cada um registra a "verdade" plantada nos dados. Os dados não representam a criminalidade real.

| Cenário | Registros | O que foi plantado | Projetado para favorecer |
|---|---|---|---|
| Focos fixos (controle) | 4.000 em 24 meses | Mesmos focos o tempo todo, sem contágio nem sazonalidade | Histórico completo (KDE) |
| Foco que se desloca | 4.000 em 24 meses | 40% dos registros vêm de um foco que anda de Barreiro a Venda Nova (σ = 700 m) | Métodos de recência |
| Contágio | cerca de 4.000 em 24 meses | θ = 0,6, vida média 4 d, σ = 120 m, fundo de 2,2 por dia | Processo auto-excitante e prospective hot-spotting |
| Sazonal por estação | 5.000 em 36 meses | Dois focos por estação do ano, repetidos todo ano (60% dos registros) | Mesmo período do ano anterior |
| Carnaval em 5 anos | cerca de 7.200 em 5 anos | De sábado a terça de Carnaval, 3× mais registros em 4 zonas de festa, à noite; data móvel pela Páscoa | Algoritmos com memória histórica; testa a data móvel |

**Resultado medido (semente 1, acerto médio nos 5% de células; ver `testes/comparar-bases.mjs`):**

| Cenário | Últimos N dias | Histórico (KDE) | Melhor recência | Mesmo período do ano anterior | Prospective hot-spotting | ETAS |
|---|---|---|---|---|---|---|
| Focos fixos | 20,8 | 32,9 | 32,9 | 20,9 | 22,5 | 34,2 |
| Foco que se desloca | 41,1 | 23,8 | 45,3 | 13,0 | 41,9 | 48,6 |
| Contágio | 28,7 | 29,4 | 32,7 | 18,6 | 32,2 | 38,0 |
| Sazonal | 27,5 | 28,0 | 28,5 | 30,6 | 27,2 | 32,9 |
| Carnaval (4 janelas) | 8,5 | 69,4 | 63,5 | 10,4 | 34,4 | 74,6 |

Leituras que os números permitem, e limites:
- **Contágio:** o ETAS recuperou os parâmetros plantados (θ = 0,60; vida = 4,1 d; σ = 119 m) e teve o maior acerto, 38,0%.
- **Deriva:** a recência supera o histórico completo (45,3% contra 23,8%), como projetado. O ETAS ficou à frente (48,6%), em parte porque um foco que se desloca devagar parece "contágio" para o modelo (θ estimado = 0,46).
- **Sazonal:** o "mesmo período do ano anterior" foi o melhor entre os métodos do app (30,6%), mas a margem é pequena, e o ETAS (32,9%) o superou. No ETAS, o ganho vem sobretudo de um suavizador de fundo melhor, não da sazonalidade.
- **Carnaval:** o "mesmo período do ano anterior" (365 dias) cai fora da festa porque o Carnaval muda de data (acerto de 10,4% contra 69,4% do histórico). Isso mostra um **limite do método sazonal do app**: ele supõe data fixa. Um método alinhado ao evento móvel (calendário) não existe hoje e é uma lacuna a considerar. O alto acerto do histórico e do ETAS vem de as zonas de festa já serem pontos quentes no histórico, então este cenário mede *onde*, não *quando*.
- Tudo isso vale **para estes cenários e esta semente**; não generaliza sem repetir com outras sementes.

### Validação e comparação com o recorte por células da QuadTree

**Pergunta.** O recorte do espaço por células da QuadTree (a proposta do projeto: células pequenas onde há muitos registros, grandes onde há poucos) melhora a previsão em relação a uma grade uniforme, para os mesmos algoritmos?

**Procedimento (aba *Comparação*, ou `node testes/comparar-bases.mjs 10`).**
- **Validação temporal:** em cada janela, o algoritmo é treinado só com o que é anterior ao corte e avaliado nos dias seguintes (30 dias nos quatro primeiros cenários; no Carnaval, os 4 dias da festa de cada ano, treinando com os anos anteriores).
- **Mesmo orçamento de área:** nos dois recortes, escolhem-se áreas somando 5% da área de estudo. *Grade uniforme:* as 5% das células de grade com maior pontuação (o que o backtest já fazia). *Recorte QuadTree:* as folhas da QuadTree construída **só com o treino**, em ordem de pontuação por área, até completar o mesmo orçamento. A pontuação de cada folha é a média das pontuações das células de grade que ela cobre; o algoritmo é o mesmo nos dois casos, só muda o recorte.
- **Estatística:** diferença média por janela em pontos percentuais com intervalo de confiança de 95% por bootstrap; teste de Wilcoxon de postos sinalizados pareado (exato até 25 janelas sem empates); correção de Holm dentro de cada cenário.
- **Amostra:** 5 cenários × 10 sementes (60 janelas por cenário; 40 no Carnaval), R = 500 m, profundidade máxima da QuadTree 9, capacidades por região como no app, sem ajuste fino.

**Resultado (acerto médio %, grade → recorte QuadTree).** `*` = o recorte mudou o acerto de forma significativa (Holm, p < 0,05); a direção está em **+** (melhorou) ou **−** (piorou).

| Método | Focos fixos | Foco que se desloca | Contágio | Sazonal | Carnaval |
|---|---|---|---|---|---|
| Últimos N dias | 19,6 → 24,6 **+*** | 41,9 → 45,2 **+*** | 29,7 → 27,0 **−*** | 28,1 → 32,5 **+*** | 12,8 → 17,1 **+*** |
| KDE (histórico completo) | 32,4 → 32,1 | 25,1 → 21,2 **−*** | 29,4 → 30,5 | 29,5 → 29,2 | 75,1 → 76,0 |
| Recência (meia-vida 45 d) | 26,9 → 29,7 **+*** | 44,2 → 44,9 | 30,4 → 30,3 | 27,8 → 29,6 **+*** | 56,5 → 64,5 **+*** |
| Mesmo período do ano anterior | 19,2 → 24,5 **+*** | 13,6 → 17,8 **+*** | 17,4 → 18,5 | 32,3 → **37,2** **+*** | 12,2 → 16,4 **+*** |
| Prospective hot-spotting † | 20,3 → 24,6 **+*** | 42,4 → 45,2 **+*** | 30,0 → 27,9 | 28,8 → 32,0 **+*** | 40,3 → 46,6 **+*** |
| ETAS † | **33,3** → 32,5 **−*** | **49,5** → 46,7 **−*** | **38,4** → 34,8 **−*** | 33,6 → 33,5 | **76,8** → 76,4 |
| KDE adaptativo (QuadTree) † | 27,8 → 28,9 **+*** | 46,8 → 45,1 **−*** | 29,4 → 29,0 | 26,4 → 28,0 **+*** | 52,8 → 57,9 **+*** |

Em negrito, o melhor resultado de cada cenário (considerando grade e recorte). No conjunto (11 métodos × 5 cenários), o recorte melhorou o acerto de forma significativa em 31 das 55 combinações, piorou em 8 e não mostrou diferença em 16. A tabela completa (PAI, PEI, diferenças, intervalos e p-valores) está em `testes/saida/comparacao_bases.md` ao rodar o comando acima, e na própria aba. A linha *KDE adaptativo* é descrita mais abaixo.

**O que os resultados permitem dizer, e o que não.**
- O recorte por QuadTree **melhora de forma consistente os métodos simples ou ruidosos** (últimos N dias, meias-vidas curtas, prospective hot-spotting, mesmo período do ano anterior): de cerca de +2 a +9 pontos percentuais em quatro dos cinco cenários (a exceção é o contágio). Uma explicação plausível, **não testada aqui**, é que as folhas agregam registros esparsos e recentes em áreas maiores, o que age como um suavizador espacial.
- Para os **melhores algoritmos** (KDE com longo histórico e ETAS), o recorte não ajuda ou piora (de −0,1 a −3,6 pontos no ETAS, significativo em três cenários). **O melhor resultado em cada cenário é do ETAS na grade, em quatro dos cinco cenários.** A exceção é o cenário sazonal, em que "mesmo período do ano anterior" com o recorte (37,2%) superou o melhor resultado da grade (ETAS, 33,6%).
- No **contágio**, o recorte prejudica os métodos de curto prazo. Uma hipótese, também não testada, é que o contágio é um fenômeno local (cerca de 120 m) que células grandes borram.
- Portanto, nestes cenários a hipótese "o recorte por QuadTree melhora a previsão" **é apoiada em parte**: vale para os métodos mais simples, mas **não supera o melhor algoritmo da literatura**. Isso é um resultado negativo parcial e deve ser reportado como tal.
- **Cuidado com a generalização:** os cenários sintéticos foram construídos para exibir fenômenos específicos (por exemplo, o contágio é gerado por um processo auto-excitante, que o ETAS modela). A vantagem do ETAS aqui é esperada e **não se repetiu na base real** (ver abaixo).

### KDE adaptativo com a QuadTree

**Pergunta.** Em vez de usar a QuadTree só para recortar, usá-la para ajustar a largura do kernel à densidade local (como no KDE de largura variável de Mohler et al., 2011, e na discussão de Chainey et al., 2008) melhora o KDE de largura fixa?

**Método (só para comparação, não entra no seletor do app).** Cada registro de treino espalha seu peso (mesma recência do método "Recência, meia-vida 45 d") num kernel triangular de raio igual à distância ao 15º vizinho mais próximo (busca na QuadTree), limitado a [R/2, 2R]; o kernel é normalizado pela área. Onde há muitos registros o foco fica estreito; onde há poucos, suave. O número de vizinhos (15) e os limites **não foram ajustados**, para não ajustar parâmetros olhando os dados de teste. Como o peso temporal é o mesmo, a diferença para o método de largura fixa vem só da largura de banda (teste de Wilcoxon pareado; p sem correção de Holm, comparação única planejada).

**Resultado (diferença de acerto em pontos percentuais, adaptativo menos largura fixa, intervalo de 95%).**

| Base | Δ (IC 95%) | p |
|---|---|---|
| Focos fixos | +0,9 (0,5 a 1,4) | 0,001 |
| Foco que se desloca | +2,6 (2,1 a 3,2) | <0,001 |
| Contágio | −1,0 (−1,9 a −0,2) | 0,035 |
| Sazonal | −1,4 (−2,3 a −0,5) | 0,007 |
| Carnaval | −3,7 (−6,0 a −1,3) | 0,005 |
| **Base real (2022 em diante, 24 janelas)** | **−1,5 (−3,2 a +0,3)** | 0,021 |

**Conclusão.** A largura de banda adaptativa **não melhorou o acerto de forma consistente**: ajudou em dois cenários sintéticos, piorou em três e, na base real, ficou igual ou pior que a largura fixa. Em nenhuma base superou o ETAS. Como os p-valores são otimistas (janelas que compartilham treino) e não há correção entre as seis comparações, a leitura segura é "sem ganho geral".

### Validação na base real (furtos de cabos de cobre em BH)

**Dados.** `dados/base_dados.csv`: 19.146 registros de furtos de cabos de cobre em BH (mar/2018 a dez/2025), de registros operacionais da Prefeitura, da Guarda Municipal, da BHTrans e de operadoras (não são Boletins de Ocorrência policiais). Origem, tratamento e limitações estão em [dados/LEIAME.md](../dados/LEIAME.md); a fonte é Santos e Silva (2026, CSBC/LASDiGov). **Os resultados valem para esse tipo de crime, não para criminalidade em geral.** A base não tem coluna de natureza. O relatório de qualidade (`node testes/validar-base.mjs`) achou: 4 registros fora da caixa de BH usada pelo app, 493 duplicatas exatas (apesar de o artigo dizer que foram removidas), coordenadas arredondadas a ~11 m em 14,3% dos registros de 2024, e horário 00:00:00 em 1.903 registros, com proporção muito diferente por ano. **A série mensal tem quebras de nível:** cerca de 30 a 50 registros por mês em jul–dez/2022 e em jun–dez/2025, contra 300 a 700 nos demais meses de 2022 a 2025 (queda de cerca de 90%). O mais provável é mudança ou interrupção na coleta, e não no fenômeno; **a confirmar com os autores da base**. Isso atinge o protocolo (o teste de 2025 tem cerca de 2.600 dos 2.877 registros em jan–mai) e as janelas de teste mais recentes da nossa comparação.

**Procedimento.** `node testes/comparar-bases.mjs --csv=dados/base_dados.csv --janelas=24 [--desde=2022]`: 24 janelas de 30 dias (os últimos 24 meses da base), treinando só com o que é anterior ao corte. Com `--desde=2022` a base é restringida a 2022 em diante, como no protocolo do artigo (que treina com 2022–2024, testa em 2025 e descarta 2018–2021 por deriva conceitual e pandemia). Nota técnica: o app contava a idade dos registros a partir de hoje; como a base termina em 2025, as janelas de teste ficavam vazias. Passou-se a contar a partir do registro mais recente (`btRebase`).

**Resultado (acerto médio %, grade uniforme; o recorte por QuadTree não teve diferença significativa em nenhum método).**

| Método | Todos os dados (19.142) | Só 2022 em diante (16.383) | Δ vs histórico completo (2022+) | p (Holm) |
|---|---|---|---|---|
| Recência, meia-vida 60 d | 35,6 | 36,5 | +1,0 | 1,0 |
| Recência, meia-vida 120 d | 36,0 | 36,2 | +0,7 | 1,0 |
| Histórico completo (KDE) | 34,6 | 35,5 | — | — |
| ETAS † | 35,1 | 35,5 | 0,0 | 1,0 |
| KDE adaptativo † | 32,6 | 33,9 | −1,6 | 0,32 |
| Prospective hot-spotting † | 30,2 | 30,6 | −4,9 | 0,003 |
| Últimos 30 dias | 28,8 | 29,1 | −6,4 | <0,001 |
| Mesmo período do ano anterior | 24,8 | 25,1 | −10,4 | <0,001 |

**Teste de robustez: sem os meses de baixo volume.** Como a série mensal despenca a partir de jun/2025, repetiu-se a comparação só com 2022-01 a 2025-05 (`--desde=2022 --ate=2025-06`, 16.059 registros; as 24 janelas passam a cobrir jun/2023 a mai/2025).

| Método | Acerto % (grade) | Δ vs histórico completo | p (Holm) |
|---|---|---|---|
| Recência, meia-vida 120 d | 37,9 | +0,4 | 1,0 |
| ETAS † | 37,7 | +0,2 | 1,0 |
| Histórico completo (KDE) | 37,5 | — | — |
| Recência, meia-vida 60 d | 37,1 | −0,5 | 1,0 |
| KDE adaptativo † | 34,9 | −2,6 | 0,017 |
| Últimos 30 dias | 31,8 | −5,8 | <0,001 |
| Prospective hot-spotting † | 31,7 | −5,8 | <0,001 |
| Mesmo período do ano anterior | 22,9 | −14,7 | <0,001 |

As conclusões se mantêm: os métodos com muito histórico empatam (37,1% a 37,9%), usar pouco histórico perde de forma significativa, e o KDE adaptativo fica abaixo do de largura fixa (−1,8 ponto; intervalo −2,9 a −0,9; p < 0,001). O acerto médio sobe cerca de 2 pontos, como esperado de uma série menos ruidosa.

**O que os resultados permitem dizer.**
- **Usar pouco histórico é pior.** Últimos 30 dias, meia-vida de 15 dias, mesmo período do ano anterior e Bowers perdem de forma significativa para o histórico completo.
- **Os melhores métodos empatam.** Recência de 45 a 120 dias, ETAS e histórico completo ficam entre 35,4% e 36,5% (PAI ≈ 7). Com todos os dados, a recência de 120 dias aparecia como significativamente melhor (+1,4; p = 0,037); com a base restrita a 2022 em diante, deixa de ser (+0,7; p = 1,0). **Esse ganho é frágil e não deve ser apresentado como vitória.**
- **O recorte por QuadTree praticamente não mudou o acerto** nas duas rodadas acima (diferenças próximas de zero, intervalos que incluem o zero). Só no teste de robustez abaixo apareceu um ganho pequeno (+1,7 ponto) para o método mais ruidoso (últimos 30 dias), no mesmo sentido do que se viu nos dados sintéticos, mas muito menor.
- **O ETAS não superou o histórico completo**, ao contrário do que ocorreu nos cenários sintéticos.

**Limites (base real).** Um só tipo de crime e uma só cidade; quebras de nível na coleta (jul–dez/2022 e jun–dez/2025, ~90% menos registros); p-valores otimistas (janelas consecutivas compartilham dados de treino); 24 janelas; fonte operacional, com subnotificação e viés de registro; qualidade heterogênea entre anos (ver relatório de qualidade).

**Limites (gerais do experimento).**
- Os cenários sintéticos valem para estes cenários, parâmetros e sementes; a base real, para um só tipo de crime (ver acima). Os dois conjuntos de resultados **divergem em pontos importantes** (ETAS e recorte por QuadTree), e isso deve ser dito.
- As janelas de uma mesma semente compartilham dados de treino, então os p-valores são **aproximados e tendem a ser otimistas**.
- A QuadTree usa os parâmetros do app (profundidade máxima 9, capacidades por região) sem ajuste; outros valores podem mudar o resultado. Só foi testado o orçamento de 5% da área.
- A pontuação das folhas é a média das células da grade (o algoritmo não é reexecutado na escala de cada folha), e o número de áreas patrulháveis difere entre os recortes (algumas centenas de folhas contra milhares de células).
- **O PEI não é comparável entre recortes**: cada um é normalizado pelo máximo possível *no seu próprio recorte*, e o máximo da QuadTree é menor, o que infla seu PEI. Compare o acerto e o PAI (com a mesma área), não o PEI entre colunas.
- O recorte por QuadTree tem outra vantagem, **operacional**, que esta comparação não mede: define unidades naturais de patrulha, usadas na ronda por células.

## 4. O que não foi implementado, e por quê

- **Terreno de risco (RTM):** exige camadas de fatores do ambiente que o app não tem. Pode entrar se houver dados de pontos de interesse.
- **Aprendizado profundo:** precisaria de treino e de muito mais dados que o navegador comporta; a grade arbitrária também é um limite apontado na literatura. Fica como trabalho futuro.
- **Floresta aleatória / aprendizado de máquina clássico:** candidato forte para uma quarta comparação (Rummens e Hardyns, 2020, comparam near-repeat, aprendizado de máquina e RTM). Implementação em JavaScript é viável, mas exige definir atributos e validar com cuidado.
- **Séries temporais (Gorr et al., 2003):** o artigo indica a suavização exponencial de Holt com sazonalidade mensal como melhor. Cabe como método de **volume por região**, não de localização; sugestão de próximo passo.

## 5. Métricas usadas

- **Acerto (hit rate):** % dos registros do período seguinte que caem nos 5% de células mais pontuadas.
- **PAI** (*predictive accuracy index*, Chainey et al., 2008, definição conferida no texto): acerto ÷ fração da área coberta (aqui 5%). O acaso dá cerca de 1.
- **PEI** (*predictive efficiency index*): acertos ÷ máximo de acertos possível com o mesmo número de células (0 a 1). Para comparar recortes diferentes, o app usa o mesmo orçamento de área e normaliza o PEI pelo máximo de cada recorte (não é comparável entre recortes). Foi usado no concurso do NIJ. **Chainey et al. (2008) não definem o PEI** (conferido no texto). A métrica vem de **Hunt (2016)** (tese de doutorado, American University; **não lida**): PEI = c_a / c_a*, em que c_a é o número de crimes nas áreas marcadas pelo modelo, com área total a, e c_a* é o máximo de crimes que poderia ser capturado com uma área do mesmo tamanho. A fórmula foi conferida em **Povala, Virtanen e Girolami (2020)**, que a atribui a Hunt (2016) e a distingue do PAI de Chainey et al. (2008); a implementação do app segue essa definição (acertos ÷ máximo possível com o mesmo número de células). **Existe uma versão revisada, o PEI\*,** proposta por White, Hunt e Green (2023, *Security Journal*), que a apresentam como mais realista operacionalmente; **não foi implementada**, e só o resumo desse artigo foi conferido (título, autoria, DOI), pois o texto completo exige acesso ao periódico.
- **WAPE** para o volume por região (já existia).
- A validação é **temporal**: treina só com o que é anterior à janela e avalia nos dias seguintes, em até 6 janelas.

## 6. Referências (ABNT) [conferir iniciais e dados antes de citar]

BOGOMOLOV, A. et al. Once upon a crime: towards crime prediction from demographics and mobile data. In: INTERNATIONAL CONFERENCE ON MULTIMODAL INTERACTION (ICMI), 2014, Istambul. **Proceedings** [...]. New York: ACM, 2014. p. 427-434. [conferir]

BOWERS, K. J.; JOHNSON, S. D.; PEASE, K. Prospective hot-spotting: the future of crime mapping? **British Journal of Criminology**, v. 44, n. 5, p. 641-658, 2004. DOI 10.1093/bjc/azh036.

BUTT, U. M. et al. Spatio-temporal crime hotspot detection and prediction: a systematic literature review. **IEEE Access**, v. 8, p. 166553-166574, 2020. DOI 10.1109/ACCESS.2020.3022808. [conferir iniciais]

CAPLAN, J. M.; KENNEDY, L. W.; MILLER, J. Risk terrain modeling: brokering criminological theory and GIS methods for crime forecasting. **Justice Quarterly**, v. 28, n. 2, p. 360-381, 2011. DOI 10.1080/07418825.2010.486037.

CHAINEY, S.; TOMPSON, L.; UHLIG, S. The utility of hotspot mapping for predicting spatial patterns of crime. **Security Journal**, v. 21, n. 1-2, p. 4-28, 2008. DOI 10.1057/palgrave.sj.8350066.

FLAXMAN, S.; CHIRICO, M.; PEREIRA, P.; LOEFFLER, C. Scalable high-resolution forecasting of sparse spatiotemporal events with kernel methods: a winning solution to the NIJ "Real-Time Crime Forecasting Challenge". **Annals of Applied Statistics**, v. 13, n. 4, p. 2564-2585, 2019. DOI 10.1214/19-AOAS1284.

HUNT, J. M. **Do crime hot spots move? Exploring the effects of the modifiable areal unit problem and modifiable temporal unit problem on crime hot spot stability.** 2016. Tese (Doutorado) – American University, Washington, D.C., 2016. [não lida; citada por Povala et al. (2020) como origem do PEI]

GORR, W. L.; OLLIGSCHLAEGER, A.; THOMPSON, Y. Short-term forecasting of crime. **International Journal of Forecasting**, v. 19, n. 4, p. 579-594, 2003. DOI 10.1016/S0169-2070(03)00092-X.

KOUNADI, O. et al. A systematic review on spatial crime forecasting. **Crime Science**, v. 9, 2020. DOI 10.1186/s40163-020-00116-7. [conferir iniciais e número do artigo]

MOHLER, G. O.; SHORT, M. B.; BRANTINGHAM, P. J.; SCHOENBERG, F. P.; TITA, G. E. Self-exciting point process modeling of crime. **Journal of the American Statistical Association**, v. 106, n. 493, p. 100-108, 2011. DOI 10.1198/jasa.2011.ap09546. [autoria conferida no manuscrito; volume, número e páginas conferidos em registro bibliográfico, não na versão final]

MOHLER, G. O. et al. Randomized controlled field trials of predictive policing. **Journal of the American Statistical Association**, v. 110, n. 512, p. 1399-1411, 2015. DOI 10.1080/01621459.2015.1077710. [conferir iniciais e coautores]

POVALA, J.; VIRTANEN, S.; GIROLAMI, M. Burglary in London: insights from statistical heterogeneous spatial point processes. **arXiv:1910.05212** [stat.AP], v. 3, 2020. [fonte secundária da fórmula do PEI; conferir se há versão publicada]

RUMMENS, A.; HARDYNS, W. Comparison of near-repeat, machine learning and risk terrain modeling for making spatiotemporal predictions of crime. **Applied Spatial Analysis and Policy**, v. 13, p. 1035-1053, 2020. DOI 10.1007/s12061-020-09339-2.

RUMMENS, A.; HARDYNS, W. The effect of spatiotemporal resolution on predictive policing model performance. **International Journal of Forecasting**, v. 37, n. 1, p. 125-133, 2021. [conferir]

RUMMENS, A.; HARDYNS, W.; PAUWELS, L. The use of predictive analysis in spatiotemporal crime forecasting: building and testing a model in an urban context. **Applied Geography**, v. 86, p. 255-261, 2017. DOI 10.1016/j.apgeog.2017.06.011.

WHITE, V. M.; HUNT, J.; GREEN, B. A discussion of current crime forecasting indices and an improvement to the prediction efficiency index for applications. **Security Journal**, 2023. DOI 10.1057/s41284-023-00367-4. [só o resumo foi lido; conferir volume e páginas]

**Aprendizado profundo (para a seção de trabalhos relacionados):** o trabalho inicial com ST-ResNet em previsão de crimes em tempo real é um *preprint* (arXiv:1707.03340) [conferir autoria e se há versão publicada]. Há trabalhos revisados por pares que usam ST-ResNet com LSTM (Scientific Reports, 2025, DOI 10.1038/s41598-025-24559-7) e ST-ResNet com resolução adaptativa em Suzhou (ISPRS International Journal of Geo-Information, v. 10, n. 5, art. 314, 2021) [conferir ambos].

SANTOS, D. E.; SILVA, C. A. **Avaliação comparativa de métodos de agrupamento para detecção de zonas de criminalidade: subsídios à segurança pública em Belo Horizonte.** In: CONGRESSO DA SOCIEDADE BRASILEIRA DE COMPUTAÇÃO (CSBC), 46., 2026, Gramado; LATIN AMERICAN SYMPOSIUM ON DIGITAL GOVERNMENT (LASDiGov), 14., 2026. Porto Alegre: SBC, 2026. Disponível em: <https://sol.sbc.org.br/index.php/wcge/article/view/43606>. **[lido em 16/11/2026; conferir anais e páginas]** Fonte da base real usada na validação.

**Trabalho brasileiro a obter (título e autoria a confirmar na fonte):** dissertação da UFC (2020) sobre hotspots em redes de ruas (PHAR, SHAR, Expansive Network) comparados ao KDE em grade.

## 7. Limitações do estudo

**Dados.**
- A base real é de **um só tipo de crime** (furto de cabos de cobre) e **uma só cidade**; os resultados não se generalizam a criminalidade em geral.
- A fonte é **operacional** (Prefeitura, Guarda Municipal, BHTrans, operadoras), não policial: reflete o que esses órgãos registram, com subnotificação e viés de registro. A licença dos registros originais não é declarada pelos autores.
- A base **não tem coluna de natureza**; o app trata tudo como um único tipo (é preciso escolher "Furto" no assistente de importação, senão o relatório rotula os registros como "Roubo").
- Qualidade: 493 duplicatas exatas, coordenadas arredondadas a ~11 m em parte de 2024, horário 00:00:00 em 9,9% dos registros (provável "hora desconhecida", que distorce análises por hora do dia) e **quebras de nível na coleta** (jul–dez/2022 e jun–dez/2025, ~90% menos registros). Um teste de robustez sem os meses de baixo volume manteve as conclusões.

**Validação.**
- As janelas de teste de uma mesma série **compartilham dados de treino**, então os p-valores são aproximados e tendem a ser **otimistas**. A correção de Holm vale dentro de cada cenário, não entre cenários nem entre rodadas.
- Poucas janelas: 6 no backtest do app e 24 na comparação com a base real; só se testou o orçamento de 5% da área.
- Os parâmetros da QuadTree (profundidade 9, capacidades por região) e do KDE adaptativo (15 vizinhos, raio entre R/2 e 2R) **não foram ajustados**; outros valores podem mudar o resultado.
- A pontuação de cada folha da QuadTree é a média das células da grade (o algoritmo não é reexecutado na escala da folha), e o **PEI não é comparável entre recortes**.
- Os **cenários sintéticos foram construídos** para exibir fenômenos específicos (por exemplo, o contágio é gerado por um processo auto-excitante); a vantagem do ETAS neles é esperada e **não se repetiu na base real**. Os resultados sintéticos e o real divergem, e isso deve ser dito.

**Implementações.**
- O ETAS não tem o fator temporal global ν(t) nem a largura do fundo escolhida por validação cruzada; o Prospective hot-spotting é uma implementação própria da ideia, conferida só de segunda mão (via Mohler et al., 2011); os números de Mohler e de Chainey vêm de manuscrito e *preprint*.
- O PEI segue Hunt (2016) conforme descrito em fonte secundária; o PEI\* não foi implementado.

**Uso.**
- Previsão de incidência **não é causalidade** nem recomendação operacional. Concentrar policiamento onde há mais registros pode reforçar o próprio padrão (ciclo de retroalimentação); o app marca isso no relatório.
- A comparação não mede a vantagem **operacional** do recorte por QuadTree (unidades naturais de patrulha, usadas na ronda por células).

## 8. Próximos passos desta frente

1. **Feito em parte (16/11/2026):** textos completos de Mohler et al. (2011, manuscrito) e Chainey et al. (2008, *preprint*) lidos e a seção 3 corrigida. **Falta ler Bowers et al. (2004)** (acesso restrito: pedir pela biblioteca da universidade/Portal CAPES ou aos autores) e conferir os números na versão publicada de cada artigo. Falta também decidir se o ETAS passa a ter ν(t) e fundo com largura escolhida por validação cruzada, para ficar mais próximo do artigo. Falta ler a tese de Hunt (2016), origem do PEI (a fórmula foi conferida só em fonte secundária), e o texto completo de White, Hunt e Green (2023), sobre o PEI\*.
2. **Feito (16/11/2026): base real.** Validação em 19.146 registros de furtos de cabos de cobre em BH (ver seção 3). Pendente: confirmar com os autores da base as 493 duplicatas exatas, a precisão das coordenadas, o horário 00:00:00 e as quedas de volume em jul–dez/2022 e jun–dez/2025; repetir com outros parâmetros da QuadTree (profundidade, capacidade) e outros orçamentos de área; e obter uma base de **outro tipo de crime** para ver se os resultados generalizam.
3. Reexecutar o algoritmo na escala de cada folha em vez de agregar a grade, e testar um método sazonal alinhado a datas móveis (Carnaval), que não existe hoje.
4. Decidir se entram Holt (volume) e floresta aleatória como quarto método.
