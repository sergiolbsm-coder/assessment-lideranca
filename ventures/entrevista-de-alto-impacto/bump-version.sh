#!/bin/bash
# Troca o número de versão dos arquivos compartilhados (app.js, app.css) em
# todas as páginas. Rode ANTES de cada publicação, para os navegadores
# baixarem a versão nova em vez de usar a cópia antiga guardada.
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M)
for f in *.html; do
  sed -i '' -E "s#(app\.(js|css))(\?v=[0-9]+)?\"#\1?v=$V\"#g" "$f"
done
echo "versão $V aplicada em $(ls *.html | wc -l) páginas"
