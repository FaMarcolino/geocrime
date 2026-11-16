# Dados reais usados na validação

Os arquivos desta pasta **não são versionados** (ver `.gitignore`). Aqui fica só a descrição de onde vêm e como obtê-los.

## base_dados.csv

| Item | Valor |
|---|---|
| Origem | Repositório `danieliasantos/lasdigov` (GitHub), arquivo `cluster_analytics/data/base_dados.tsv` |
| Link do repositório | https://github.com/danieliasantos/lasdigov |
| Conteúdo | Ocorrências georreferenciadas de **furtos de cabos de cobre em Belo Horizonte** (segundo o README do repositório de origem) |
| Registros | 19.146 (o README do repositório de origem cita 18.590; a diferença não foi reconciliada) |
| Período | 2018-03-08 a 2025-12-12 |
| Colunas | `data_hora`, colunas de semana/mês/bimestre/trimestre/ano, `latitude`, `longitude`, `geometry` |
| Natureza do crime | **Não há coluna**: a base é de um único tipo de ocorrência |
| Coordenadas únicas | 9.254 (o mesmo ponto se repete, no máximo 44 vezes) |
| Conversão | O arquivo de origem é TSV; este é o mesmo conteúdo separado por vírgula (as 19.146 linhas conferem uma a uma) |
| Licença | O repositório de origem é GPL-3.0. **A fonte primária dos registros e a licença dos dados não são declaradas no README**: confirmar com os autores antes de redistribuir |

Como obter: baixe o arquivo no repositório de origem e salve aqui como `base_dados.csv` (troque as tabulações por vírgulas, ou importe o TSV direto: o app detecta o separador).

## Como usar

```
cd testes
node comparar-bases.mjs --csv=../geocrime-bh/dados/base_dados.csv
```

## Limitações a citar nos resultados

- Os resultados valem para **um tipo de crime** (furto de cabos de cobre), não para criminalidade em geral.
- Sem coluna de natureza, o app trata todos os registros como um único tipo.
- A base foi construída por terceiros; as regras de coleta e filtragem seguem o artigo do repositório de origem.

## Citação

Dados e métodos: repositório `danieliasantos/lasdigov` e o artigo "Avaliando Métodos de Agrupamento Baseados em Densidade para Detecção Dinâmica de Zonas de Criminalidade em Ambientes Urbanos" (submetido ao SBBD, segundo o README). Completar a referência com autores e ano quando confirmados.
