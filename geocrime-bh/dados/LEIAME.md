# Dados reais usados na validação

Os arquivos desta pasta **não são versionados** (ver `.gitignore`). Aqui fica só a descrição de onde vêm e como obtê-los.

## base_dados.csv

| Item | Valor |
|---|---|
| Origem | Repositório `danieliasantos/lasdigov` (GitHub), arquivo `cluster_analytics/data/base_dados.tsv` |
| Artigo | SANTOS, D. E.; SILVA, C. A. *Avaliação Comparativa de Métodos de Agrupamento para Detecção de Zonas de Criminalidade: Subsídios à Segurança Pública em Belo Horizonte*. 46º CSBC / 14º LASDiGov 2026, Gramado/RS (IFMG). https://sol.sbc.org.br/index.php/wcge/article/view/43606 |
| Conteúdo | Ocorrências georreferenciadas de **furtos de cabos de cobre** (Art. 155 do Código Penal) em Belo Horizonte |
| Fonte primária (segundo o artigo, seção 3) | **Registros operacionais integrados** do Centro de Operações da Prefeitura, Guarda Civil Municipal, BHTrans e operadoras de telefonia. **Não são Boletins de Ocorrência das polícias estaduais** |
| Registros | 19.146, conforme o artigo e o arquivo (o README do repositório cita 18.590, valor divergente do artigo) |
| Período | 2018-03-08 a 2025-12-12 |
| Colunas | `data_hora`, colunas de semana/mês/bimestre/trimestre/ano, `latitude`, `longitude`, `geometry` (WGS 84, EPSG:4326) |
| Natureza do crime | **Não há coluna**: a base é de um único tipo de ocorrência |
| Tratamento feito pelos autores | Remoção de dados faltantes, de duplicatas exatas (mesma coordenada e mesmo carimbo de tempo) e de coordenadas anômalas; filtro espacial para os limites de BH. Sem agregação nem suavização espacial |
| Protocolo dos autores | Treino 2022–2024 e teste 2025. Justificativa: deriva conceitual e anomalias do biênio 2020–2021 (pandemia) |
| Ética | O artigo afirma que os registros não identificam vítimas nem suspeitos |
| Licença | Scripts e resultados do repositório de origem estão sob **GNU GPL v3.0** (declarado no artigo). O artigo **não declara licença específica para os registros originais**; citar a origem e não redistribuir o arquivo |
| Conversão | O arquivo de origem é TSV; este é o mesmo conteúdo separado por vírgula (as 19.146 linhas conferem uma a uma) |

Como obter: baixe o arquivo no repositório de origem e salve aqui como `base_dados.csv` (o app também aceita o TSV direto, pois detecta o separador).

## Como usar

```
cd testes
node comparar-bases.mjs --csv=../geocrime-bh/dados/base_dados.csv --janelas=24
```

## Limitações a citar nos resultados

- Os resultados valem para **um tipo de crime** (furto de cabos de cobre), não para criminalidade em geral.
- A fonte é operacional (prefeitura, guarda municipal, BHTrans, operadoras), não policial: reflete o que esses órgãos registram, com subnotificação e viés de registro.
- Sem coluna de natureza, o app trata todos os registros como um único tipo.
- Observações próprias, geradas por `testes/validar-base.mjs` (não vêm do artigo):
  - 1.903 registros têm horário exatamente 00:00:00 (possível "hora desconhecida"), e a proporção varia muito por ano: 23,5% em 2022, 0,1% em 2023, 13,6% em 2024 e 22,1% em 2025. Isso sugere fontes ou formatos diferentes ao longo do tempo.
  - O volume anual cresce muito a partir de 2022 (523 em 2018, 980 em 2021, 5.594 em 2023, 6.076 em 2024); os autores justificam o recorte 2022–2025 por deriva conceitual e pandemia.
  - **493 registros extras são duplicatas exatas** (mesma latitude, longitude e data/hora em texto), apesar de o artigo dizer que duplicatas exatas foram removidas. Confirmar com os autores.
  - **Precisão das coordenadas varia**: 866 registros de 2024 (14,3%) têm 4 casas decimais ou menos (~11 m), o que cria pontos repetidos artificialmente.
  - 4 registros ficam a 145–297 m da borda da caixa de BH usada pelo app e são descartados na importação (19.142 de 19.146 importados).
  - Coordenadas únicas: 9.252 (texto exato) ou 8.803 (arredondando a ~1 cm), entre 19.142 registros importáveis.

Para refazer o relatório: `cd testes; node validar-base.mjs ../geocrime-bh/dados/base_dados.csv`.

## Citação

Citar o artigo acima e o repositório https://github.com/danieliasantos/lasdigov. Conferir a referência completa (anais, páginas) na página do artigo.
