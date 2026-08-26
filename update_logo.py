#!/usr/bin/env python3
"""
Substitui todos os logos do IDL (JPEG/PNG antigos e texto) pelo SVG colorido oficial.
Aplica em: index.html, index_v2.html, admin.html, painel.html, rh.html, disc_v2.html
"""
import re, os

BASE = "/Users/sergiomoura/Claude/idl-sistema/"

# ── SVG do logo Instituto da Liderança ──────────────────────────────────────
# Versão horizontal: ícone circular + texto "Instituto / DA LIDERANÇA"
IDL_LOGO_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 88" role="img" aria-label="Instituto da Liderança" style="height:{h};width:auto;display:block">
  <!-- Ícone circular IDL -->
  <g transform="translate(44,44)">
    <!-- Figura teal (esquerda-cima) -->
    <circle cx="-12" cy="-26" r="5.5" fill="#00C5B2"/>
    <path d="M-22,-20 C-32,-8 -28,8 -16,14 C-6,18 4,14 8,4 C12,-8 6,-20 -12,-20 Z" fill="#00C5B2"/>
    <!-- Figura magenta (direita-cima) -->
    <circle cx="26" cy="-12" r="5.5" fill="#FF1566"/>
    <path d="M20,-22 C32,-12 32,4 20,12 C10,18 -2,14 -4,4 C-8,-8 2,-22 20,-22 Z" fill="#FF1566"/>
    <!-- Figura roxa (direita-baixo) -->
    <circle cx="12" cy="26" r="5.5" fill="#5C19C4"/>
    <path d="M22,20 C32,8 28,-8 16,-14 C6,-18 -4,-14 -8,-4 C-12,8 -6,20 12,20 Z" fill="#5C19C4"/>
    <!-- Figura teal (esquerda-baixo) -->
    <circle cx="-26" cy="12" r="5.5" fill="#00C5B2"/>
    <path d="M-20,22 C-32,12 -32,-4 -20,-12 C-10,-18 2,-14 4,-4 C8,8 -2,22 -20,22 Z" fill="#00C5B2"/>
    <!-- Ponto central -->
    <circle cx="0" cy="0" r="5" fill="#FF1566"/>
  </g>
  <!-- Texto Instituto (bold magenta, levemente italic) -->
  <text x="92" y="38" font-family="'DM Sans','Nunito',Arial,sans-serif" font-weight="800" font-size="30" fill="#FF1566" font-style="italic" letter-spacing="-0.5">Instituto</text>
  <!-- Texto DA LIDERANÇA (bold purple, uppercase) -->
  <text x="93" y="62" font-family="'DM Sans','Nunito',Arial,sans-serif" font-weight="700" font-size="15" fill="#391694" letter-spacing="2.5">DA LIDERANÇA</text>
</svg>'''

# Versão pequena para sidebar/header (só ícone + texto compacto)
IDL_LOGO_SMALL = IDL_LOGO_SVG.replace('style="height:{h};', 'style="height:{h};')

def logo_svg(height="56px"):
    return IDL_LOGO_SVG.replace("{h}", height)

def logo_svg_small(height="40px"):
    # Versão mais compacta
    return IDL_LOGO_SVG.replace("{h}", height)

# ── Padrões de busca e substituição por arquivo ─────────────────────────────

def fix_index(content):
    """index.html — capa: substitui o bloco da logo (SVG atual ou JPEG antigo)"""
    # Substitui o bloco inteiro do container da logo na capa
    # Padrão: <div style="...flex...margin-bottom..."> ... </div> antes do h1.hero
    content = re.sub(
        r'<div style="display:flex;align-items:center;justify-content:center;margin-bottom:\d+px">\s*(?:<svg[^>]*>.*?</svg>|<img[^>]*>)\s*</div>\s*(?:<div style="display:none">.*?</div>\s*)?',
        '<div style="display:flex;align-items:center;justify-content:center;margin-bottom:32px">\n      ' + logo_svg("150px") + '\n    </div>\n    ',
        content, flags=re.DOTALL
    )
    return content

def fix_admin(content):
    """admin.html — sidebar: substitui img + texto do logo na sidebar"""
    # O admin tem .sidebar-logo com img JPEG + título texto
    # Substituir tudo dentro de .sidebar-logo
    content = re.sub(
        r'(<div class="sidebar-logo">)\s*(?:<img[^>]*>\s*)?(?:<div[^>]*>.*?</div>\s*)*\s*(</div>)',
        r'\1\n      ' + logo_svg("52px") + r'\n    \2',
        content, flags=re.DOTALL
    )
    return content

def fix_painel(content):
    """painel.html — header: substitui .site-logo texto por SVG"""
    content = re.sub(
        r'<div class="site-logo">[^<]*</div>',
        '<div class="site-logo" style="background:none;-webkit-text-fill-color:unset">' + logo_svg("44px") + '</div>',
        content
    )
    return content

def fix_rh(content):
    """rh.html — login-logo e sidebar-logo"""
    # Login logo (tem img com filter:brightness(0) invert(1))
    content = re.sub(
        r'(<div class="login-logo">)\s*<img[^>]*>\s*(</div>)',
        r'\1\n      ' + logo_svg("64px") + r'\n    \2',
        content, flags=re.DOTALL
    )
    # Sidebar logo
    content = re.sub(
        r'(<div class="sidebar-logo">)\s*<img[^>]*>\s*(</div>)',
        r'\1\n      ' + logo_svg("48px") + r'\n    \2',
        content, flags=re.DOTALL
    )
    return content

def fix_generic(content, fname):
    """Para index_v2.html e disc_v2.html — busca padrão genérico"""
    # Substitui qualquer img com base64 JPEG que tenha Instituto da Liderança no alt
    content = re.sub(
        r'<img src="data:image/(?:png|jpeg|jpg);base64,[^"]*" alt="Instituto da Liderança"[^>]*>',
        logo_svg("120px"),
        content
    )
    return content

# ── Aplicar em cada arquivo ─────────────────────────────────────────────────

files_config = {
    "index.html":    fix_index,
    "admin.html":    fix_admin,
    "painel.html":   fix_painel,
    "rh.html":       fix_rh,
    "index_v2.html": fix_generic,
    "disc_v2.html":  fix_generic,
}

for fname, fix_fn in files_config.items():
    path = BASE + fname
    if not os.path.exists(path):
        print(f"⚠️  {fname} não encontrado, pulando")
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    before = content
    if fname in ("index_v2.html", "disc_v2.html"):
        content = fix_fn(content, fname)
    else:
        content = fix_fn(content)
    if content != before:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅  {fname} — logo atualizado")
    else:
        print(f"⚠️  {fname} — nenhuma substituição (padrão não encontrado)")

print("\n🎨 Logo IDL aplicado em todos os arquivos!")
