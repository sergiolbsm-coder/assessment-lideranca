#!/usr/bin/env python3
"""
Substitui SVG IDL pelo PNG real com transparência em todas as páginas.
Usa <img> com data URI base64 — funciona em fundo escuro e claro.
"""
import re, base64, os

BASE = "/Users/sergiomoura/Claude/idl-sistema/"

# Carrega base64 do PNG
with open(BASE + "logo.png", "rb") as f:
    B64 = base64.b64encode(f.read()).decode()
DATA_URI = f"data:image/png;base64,{B64}"

def img_tag(h="120px", extra_style=""):
    style = f"height:{h};width:auto;display:block;{extra_style}"
    return f'<img src="{DATA_URI}" alt="Instituto da Liderança" style="{style}">'

# Regex que captura qualquer SVG IDL já inserido
SVG_PAT = r'<svg[^>]*aria-label="Instituto da Liderança"[^>]*>.*?</svg>'

# ── index.html ─────────────────────────────────────────────────────
def fix_index():
    path = BASE + "index.html"
    with open(path, encoding="utf-8") as f: c = f.read()
    c = re.sub(SVG_PAT, img_tag("140px"), c, flags=re.DOTALL)
    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ index.html")

# ── admin.html ─────────────────────────────────────────────────────
def fix_admin():
    path = BASE + "admin.html"
    with open(path, encoding="utf-8") as f: c = f.read()
    c = re.sub(SVG_PAT, img_tag("44px"), c, flags=re.DOTALL)
    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ admin.html")

# ── painel.html ────────────────────────────────────────────────────
def fix_painel():
    path = BASE + "painel.html"
    if not os.path.exists(path): print("⚠️  painel.html não encontrado"); return
    with open(path, encoding="utf-8") as f: c = f.read()
    c = re.sub(SVG_PAT, img_tag("44px"), c, flags=re.DOTALL)
    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ painel.html")

# ── rh.html ────────────────────────────────────────────────────────
def fix_rh():
    path = BASE + "rh.html"
    if not os.path.exists(path): print("⚠️  rh.html não encontrado"); return
    with open(path, encoding="utf-8") as f: c = f.read()
    # login-logo (maior)
    c = re.sub(SVG_PAT, img_tag("72px"), c, count=1, flags=re.DOTALL)
    # sidebar-logo (menor) — segunda ocorrência
    c = re.sub(SVG_PAT, img_tag("44px"), c, count=1, flags=re.DOTALL)
    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ rh.html")

# ── index_v2.html ──────────────────────────────────────────────────
def fix_index_v2():
    path = BASE + "index_v2.html"
    if not os.path.exists(path): print("⚠️  index_v2.html não encontrado"); return
    with open(path, encoding="utf-8") as f: c = f.read()
    c = re.sub(SVG_PAT, img_tag("120px"), c, flags=re.DOTALL)
    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ index_v2.html")

fix_index()
fix_admin()
fix_painel()
fix_rh()
fix_index_v2()
print("\n🖼️  Logo PNG aplicado em todas as páginas!")
