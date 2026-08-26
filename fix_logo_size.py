#!/usr/bin/env python3
"""
Ajusta tamanho + adiciona sombra branca no logo PNG em cada página.
Só mexe nos <img> que contêm nosso PNG (começa com iVBORw0KGgo).
"""
import re, os

BASE = "/Users/sergiomoura/Claude/idl-sistema/"

# ── estilo por página/contexto ─────────────────────────────────────
# sombra branca (drop-shadow) para fundo escuro → destaca "DA LIDERANÇA" roxo
GLOW = (
    "filter:drop-shadow(0 0 10px rgba(255,255,255,.85)) "
    "drop-shadow(0 0 20px rgba(255,255,255,.45));"
)

def img_style(h, glow=False):
    s = f"height:{h};width:auto;display:block;"
    if glow:
        s += GLOW
    return s

def replace_our_logo(content, old_h, new_h, glow=False):
    """
    Encontra <img src="data:image/png;base64,iVBORw0..." height:OLD e troca pelo novo estilo.
    """
    # Padrão: img tag com nosso PNG e height específico
    pat = (
        r'(<img src="data:image/png;base64,iVBORw0[^"]*"'
        r'\s+alt="Instituto da Liderança"\s+style=")([^"]*height:' + re.escape(old_h) + r'[^"]*)(")'
    )
    new_style = img_style(new_h, glow)
    return re.sub(pat, r'\g<1>' + new_style + r'\g<3>', content)

def replace_all_our_logos(content, new_h, glow=False):
    """Troca TODOS os nossos logos independente do tamanho anterior."""
    pat = (
        r'(<img src="data:image/png;base64,iVBORw0[^"]*"'
        r'\s+alt="Instituto da Liderança"\s+style=")([^"]*)(")'
    )
    new_style = img_style(new_h, glow)
    return re.sub(pat, r'\g<1>' + new_style + r'\g<3>', content)


# ── index.html — capa escura, logo grande ─────────────────────────
def fix_index():
    path = BASE + "index.html"
    with open(path, encoding="utf-8") as f: c = f.read()
    # Nosso PNG (iVBORw0) → 110px com sombra branca
    c = replace_all_our_logos(c, "110px", glow=True)
    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ index.html — 110px + sombra branca")

# ── admin.html — sidebar escura, logo pequeno ─────────────────────
def fix_admin():
    path = BASE + "admin.html"
    with open(path, encoding="utf-8") as f: c = f.read()
    c = replace_all_our_logos(c, "50px", glow=True)
    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ admin.html — 50px + sombra branca")

# ── painel.html — header claro, sem sombra ────────────────────────
def fix_painel():
    path = BASE + "painel.html"
    if not os.path.exists(path): print("⚠️  painel.html não encontrado"); return
    with open(path, encoding="utf-8") as f: c = f.read()
    c = replace_all_our_logos(c, "52px", glow=False)
    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ painel.html — 52px (sem sombra, fundo claro)")

# ── rh.html — login escuro + sidebar escura, ambos com sombra ─────
def fix_rh():
    path = BASE + "rh.html"
    if not os.path.exists(path): print("⚠️  rh.html não encontrado"); return
    with open(path, encoding="utf-8") as f: c = f.read()

    # Substitui primeiro logo (login-logo) → 80px
    def replace_first(content, new_h, glow):
        pat = (
            r'(<img src="data:image/png;base64,iVBORw0[^"]*"'
            r'\s+alt="Instituto da Liderança"\s+style=")([^"]*)(")'
        )
        new_style = img_style(new_h, glow)
        return re.sub(pat, r'\g<1>' + new_style + r'\g<3>', content, count=1)

    c = replace_first(c, "80px", glow=True)   # login card
    # Segundo logo (sidebar) → 48px
    c = replace_first(c, "48px", glow=True)   # sidebar

    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ rh.html — 80px login + 48px sidebar + sombra branca")

# ── index_v2.html ─────────────────────────────────────────────────
def fix_index_v2():
    path = BASE + "index_v2.html"
    if not os.path.exists(path): print("⚠️  index_v2.html não encontrado"); return
    with open(path, encoding="utf-8") as f: c = f.read()
    c = replace_all_our_logos(c, "110px", glow=True)
    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ index_v2.html — 110px + sombra branca")


fix_index()
fix_admin()
fix_painel()
fix_rh()
fix_index_v2()
print("\n🎨 Tamanhos e sombra aplicados!")
