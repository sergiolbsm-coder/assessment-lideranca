#!/usr/bin/env python3
"""
Corrige o logo IDL em todos os arquivos.
Usa SVG com formas corretas e cores ajustadas por tema (dark/light).
"""
import re, os

BASE = "/Users/sergiomoura/Claude/idl-sistema/"

# ── Logo para fundo ESCURO (index, admin) ─────────────────────────────────
# "DA LIDERANÇA" em branco para ser visível no gradiente roxo
def logo_dark(h="120px"):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" style="height:{h};width:auto;display:block" role="img" aria-label="Instituto da Liderança">
  <g transform="translate(45,45)">
    <g transform="rotate(0)"><ellipse cx="0" cy="-19" rx="10" ry="15" fill="#00C5B2"/><circle cx="0" cy="-31" r="7" fill="#00C5B2"/></g>
    <g transform="rotate(90)"><ellipse cx="0" cy="-19" rx="10" ry="15" fill="#FF1566"/><circle cx="0" cy="-31" r="7" fill="#FF1566"/></g>
    <g transform="rotate(180)"><ellipse cx="0" cy="-19" rx="10" ry="15" fill="#7C3AED"/><circle cx="0" cy="-31" r="7" fill="#7C3AED"/></g>
    <g transform="rotate(270)"><ellipse cx="0" cy="-19" rx="10" ry="15" fill="#00C5B2" opacity="0.6"/><circle cx="0" cy="-31" r="7" fill="#00C5B2" opacity="0.6"/></g>
    <circle cx="0" cy="0" r="6" fill="#FF1566"/>
  </g>
  <text x="95" y="38" font-family="'DM Sans',Arial,sans-serif" font-weight="800" font-size="32" fill="#FF1566" font-style="italic">Instituto</text>
  <text x="97" y="64" font-family="'DM Sans',Arial,sans-serif" font-weight="700" font-size="14" fill="#FFFFFF" letter-spacing="2">DA LIDERANÇA</text>
</svg>'''

# ── Logo para fundo CLARO (painel, rh login) ──────────────────────────────
# "DA LIDERANÇA" em roxo escuro — legível sobre branco/claro
def logo_light(h="80px"):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" style="height:{h};width:auto;display:block" role="img" aria-label="Instituto da Liderança">
  <g transform="translate(45,45)">
    <g transform="rotate(0)"><ellipse cx="0" cy="-19" rx="10" ry="15" fill="#00C5B2"/><circle cx="0" cy="-31" r="7" fill="#00C5B2"/></g>
    <g transform="rotate(90)"><ellipse cx="0" cy="-19" rx="10" ry="15" fill="#FF1566"/><circle cx="0" cy="-31" r="7" fill="#FF1566"/></g>
    <g transform="rotate(180)"><ellipse cx="0" cy="-19" rx="10" ry="15" fill="#7C3AED"/><circle cx="0" cy="-31" r="7" fill="#7C3AED"/></g>
    <g transform="rotate(270)"><ellipse cx="0" cy="-19" rx="10" ry="15" fill="#00C5B2" opacity="0.6"/><circle cx="0" cy="-31" r="7" fill="#00C5B2" opacity="0.6"/></g>
    <circle cx="0" cy="0" r="6" fill="#FF1566"/>
  </g>
  <text x="95" y="38" font-family="'DM Sans',Arial,sans-serif" font-weight="800" font-size="32" fill="#FF1566" font-style="italic">Instituto</text>
  <text x="97" y="64" font-family="'DM Sans',Arial,sans-serif" font-weight="700" font-size="14" fill="#391694" letter-spacing="2">DA LIDERANÇA</text>
</svg>'''

# ═══════════════════════════════════════════════════════════
# index.html — capa (fundo escuro, logo grande)
# ═══════════════════════════════════════════════════════════
def fix_index():
    path = BASE + "index.html"
    with open(path, encoding="utf-8") as f:
        c = f.read()
    # Remove tudo dentro do container da logo (SVG antigo + hidden div com JPEG)
    c = re.sub(
        r'(<div style="display:flex;align-items:center;justify-content:center;margin-bottom:\d+px">)'
        r'.*?'
        r'(?=<h1 class="hero">)',
        r'\1\n      ' + logo_dark("140px") + '\n    </div>\n    ',
        c, flags=re.DOTALL
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print("✅ index.html")

# ═══════════════════════════════════════════════════════════
# admin.html — sidebar (fundo escuro)
# ═══════════════════════════════════════════════════════════
def fix_admin():
    path = BASE + "admin.html"
    with open(path, encoding="utf-8") as f:
        c = f.read()
    # Substitui todo conteúdo de sidebar-logo
    c = re.sub(
        r'(<div class="sidebar-logo">).*?(</div>\s*<div class="nav-section">)',
        r'\1\n      ' + logo_dark("48px") + r'\n    \2',
        c, flags=re.DOTALL
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print("✅ admin.html (logo)")

# ═══════════════════════════════════════════════════════════
# painel.html — header (fundo claro)
# ═══════════════════════════════════════════════════════════
def fix_painel():
    path = BASE + "painel.html"
    with open(path, encoding="utf-8") as f:
        c = f.read()
    # .site-logo pode ter SVG antigo ou texto
    c = re.sub(
        r'(<div class="site-logo"[^>]*>).*?(</div>)',
        r'\1' + logo_light("44px") + r'\2',
        c, flags=re.DOTALL
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print("✅ painel.html")

# ═══════════════════════════════════════════════════════════
# rh.html — login (fundo escuro) e sidebar (escuro)
# ═══════════════════════════════════════════════════════════
def fix_rh():
    path = BASE + "rh.html"
    with open(path, encoding="utf-8") as f:
        c = f.read()
    # Login logo
    c = re.sub(
        r'(<div class="login-logo">).*?(</div>)',
        r'\1\n      ' + logo_dark("72px") + r'\n    \2',
        c, flags=re.DOTALL
    )
    # Sidebar logo
    c = re.sub(
        r'(<div class="sidebar-logo">).*?(</div>\s*<nav)',
        r'\1\n      ' + logo_dark("44px") + r'\n    \2',
        c, flags=re.DOTALL
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print("✅ rh.html")

# ═══════════════════════════════════════════════════════════
# index_v2.html — capa (fundo escuro)
# ═══════════════════════════════════════════════════════════
def fix_index_v2():
    path = BASE + "index_v2.html"
    with open(path, encoding="utf-8") as f:
        c = f.read()
    c = re.sub(
        r'<img src="data:image/[^"]*" alt="Instituto da Liderança"[^>]*>',
        logo_dark("120px"),
        c
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print("✅ index_v2.html")

fix_index()
fix_admin()
fix_painel()
fix_rh()
fix_index_v2()
print("\n🎨 Logo IDL v2 aplicado!")
