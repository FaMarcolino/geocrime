# GeoCrime BH

Análise criminal de Belo Horizonte no navegador, sem servidor, com QuadTree.

- [`geocrime-bh/`](geocrime-bh/): o aplicativo. Abra `index.html` ou gere o arquivo único com `node build.mjs` (sai em `dist/geocrime_bh.html`). Veja o [README do app](geocrime-bh/README.md).
- [`testes/`](testes/): bateria automática (Node 22+ e Edge): `node run.mjs` roda tudo e `node pdf.mjs` gera o PDF A4/ABNT do relatório para conferência. As capturas e PDFs ficam em `testes/saida/` (não versionada).
