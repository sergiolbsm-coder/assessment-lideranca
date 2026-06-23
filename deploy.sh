#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# deploy.sh — Instituto da Liderança
# Uso: bash deploy.sh [mensagem de commit]
# Ofusca index.html e admin.html e publica no GitHub
# ═══════════════════════════════════════════════════════════════

set -e

REPO="sergiolbsm-coder/assessment-lideranca"
TOKEN_FILE=".gh_token"
COMMIT_MSG="${1:-deploy: atualização $(date '+%Y-%m-%d %H:%M')}"

# ── Cores ────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════╗"
echo "║   Instituto da Liderança — Deploy Tool   ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── Verifica dependências ────────────────────────────────────────
log "Verificando dependências..."
command -v node >/dev/null 2>&1            || fail "Node.js não encontrado. Instale em nodejs.org"
command -v javascript-obfuscator >/dev/null 2>&1 || {
  warn "javascript-obfuscator não encontrado. Instalando..."
  npm install -g javascript-obfuscator --silent || fail "Falha ao instalar javascript-obfuscator"
}
command -v python3 >/dev/null 2>&1         || fail "Python3 não encontrado."
ok "Dependências OK"

# ── Token GitHub ─────────────────────────────────────────────────
if [ -f "$TOKEN_FILE" ]; then
  GH_TOKEN=$(cat "$TOKEN_FILE" | tr -d '[:space:]')
else
  echo -e "${YELLOW}Cole seu GitHub Token (ficará salvo em .gh_token):${NC}"
  read -r GH_TOKEN
  echo "$GH_TOKEN" > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
fi
[ -z "$GH_TOKEN" ] && fail "Token GitHub não informado."
ok "Token carregado"

# ── Verifica arquivos fonte ──────────────────────────────────────
log "Verificando arquivos fonte..."
[ -f "index.html" ] || fail "index.html não encontrado na pasta atual."
[ -f "admin.html" ] || fail "admin.html não encontrado na pasta atual."
ok "Arquivos fonte encontrados"

# ── Cria pasta de trabalho ───────────────────────────────────────
mkdir -p .deploy_tmp

# ── Função de ofuscação ──────────────────────────────────────────
obfuscate_file() {
  local FILE=$1
  local BASE="${FILE%.html}"
  log "Ofuscando ${FILE}..."

  python3 - "$FILE" ".deploy_tmp/${BASE}_main.js" << 'PYEOF'
import sys, re
fname, out = sys.argv[1], sys.argv[2]
with open(fname, 'r', encoding='utf-8') as f:
    html = f.read()
scripts = list(re.finditer(r'(<script(?![^>]*src)[^>]*>)(.*?)(</script>)', html, re.DOTALL))
if not scripts:
    print(f"  AVISO: nenhum bloco JS encontrado em {fname}")
    sys.exit(1)
biggest = max(scripts, key=lambda s: len(s.group(2)))
with open(out, 'w', encoding='utf-8') as f:
    f.write(biggest.group(2))
print(f"  JS extraído: {len(biggest.group(2))} chars")
PYEOF

  javascript-obfuscator ".deploy_tmp/${BASE}_main.js" \
    --output ".deploy_tmp/${BASE}_main.obf.js" \
    --compact true \
    --self-defending true \
    --control-flow-flattening true \
    --control-flow-flattening-threshold 0.5 \
    --dead-code-injection false \
    --identifier-names-generator hexadecimal \
    --rename-globals false \
    --string-array true \
    --string-array-encoding 'base64' \
    --string-array-threshold 0.75 \
    --unicode-escape-sequence false \
    --transform-object-keys true \
    --disable-console-output false \
    2>/dev/null

  python3 - "$FILE" ".deploy_tmp/${BASE}_main.obf.js" ".deploy_tmp/${BASE}_obf.html" << 'PYEOF'
import sys, re
fname, obf_js, out = sys.argv[1], sys.argv[2], sys.argv[3]
with open(fname, 'r', encoding='utf-8') as f:
    html = f.read()
with open(obf_js, 'r', encoding='utf-8') as f:
    obf = f.read()
scripts = list(re.finditer(r'(<script(?![^>]*src)[^>]*>)(.*?)(</script>)', html, re.DOTALL))
biggest = max(scripts, key=lambda s: len(s.group(2)))
new_html = html[:biggest.start(2)] + '\n' + obf + '\n' + html[biggest.end(2):]
with open(out, 'w', encoding='utf-8') as f:
    f.write(new_html)
markers = obf.count('_0x')
print(f"  Ofuscado: {markers} marcadores | {len(new_html)} chars total")
PYEOF

  ok "${FILE} ofuscado"
}

obfuscate_file "index.html"
obfuscate_file "admin.html"

# ── Publica no GitHub ────────────────────────────────────────────
log "Publicando no GitHub..."

python3 - "$REPO" "$GH_TOKEN" "$COMMIT_MSG" << 'PYEOF'
import sys, urllib.request, json, base64, os

repo, token, msg = sys.argv[1], sys.argv[2], sys.argv[3]
hdr = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}

def publish(path, local):
    api = f"https://api.github.com/repos/{repo}/contents/{path}"
    req = urllib.request.Request(api, headers=hdr)
    with urllib.request.urlopen(req) as r:
        sha = json.loads(r.read())["sha"]
    with open(local, "rb") as f:
        content = base64.b64encode(f.read()).decode()
    payload = json.dumps({"message": msg, "content": content, "sha": sha}).encode()
    req2 = urllib.request.Request(api, data=payload,
        headers={**hdr, "Content-Type": "application/json"}, method="PUT")
    with urllib.request.urlopen(req2) as r:
        res = json.loads(r.read())
        print(f"  {path} → commit {res['commit']['sha'][:10]}")

publish("index.html", ".deploy_tmp/index_obf.html")
publish("admin.html", ".deploy_tmp/admin_obf.html")

# Publica APPS_SCRIPT.gs se existir
if os.path.exists("APPS_SCRIPT.gs"):
    publish("APPS_SCRIPT.gs", "APPS_SCRIPT.gs")
    print("  APPS_SCRIPT.gs publicado")
PYEOF

# ── Limpeza ──────────────────────────────────────────────────────
rm -rf .deploy_tmp
ok "Arquivos temporários removidos"

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗"
echo "║         Deploy concluído com sucesso!    ║"
echo -e "╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🌐 Site: ${CYAN}https://sergiolbsm-coder.github.io/assessment-lideranca/${NC}"
echo -e "  ⏱  CDN GitHub Pages: aguarde ~10 min para propagar"
echo ""
