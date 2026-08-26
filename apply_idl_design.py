#!/usr/bin/env python3
"""
Aplica o IDL Design System em todos os arquivos HTML do assessment.
Preserva a lógica JS. Faz substituições apenas em CSS/HTML.
"""
import re, os

BASE = "/Users/sergiomoura/Claude/idl-sistema/"

IDL_ROOT_VARS = """\n  /* ── IDL Design System ──────────────────────────── */
  --idl-magenta:#FF0060;
  --idl-purple:#391694;
  --idl-purple-dark:#261062;
  --idl-violet:#4D1DBF;
  --idl-violet-light:#5631B9;
  --idl-turquoise:#00D0C9;
  --idl-whatsapp:#168D53;
  --idl-text:#24153E;
  --idl-text-muted:#6F667E;
  --idl-background:#FBF9FF;
  --idl-background-soft:#F4F0FB;
  --idl-white:#FFFFFF;
  --idl-border:rgba(57,22,148,.13);
  --idl-gradient:linear-gradient(145deg,#261062,#391694 70%,#4D1DBF);
  --idl-gradient-circle:radial-gradient(circle at 35% 28%,#5631B9,#261062 75%);
  /* ────────────────────────────────────────────────── */
"""

# Substituições universais (todos os arquivos)
UNIVERSAL = [
    # Fonte: Syne → DM Sans
    ("'Syne',sans-serif",          "'DM Sans',sans-serif"),
    ('"Syne",sans-serif',          '"DM Sans",sans-serif'),
    ("'Syne', sans-serif",         "'DM Sans', sans-serif"),
    # Cormorant mantida para headings decorativos — não substituída
    # JetBrains Mono mantida para monospace — não substituída

    # Variáveis old → IDL (dark theme: ink=dark bg)
    ("--ink:#0A0806",              "--ink:#261062"),
    ("--ink: #0A0806",             "--ink:#261062"),
    ("--parch:#FAF6EE",            "--parch:#FBF9FF"),
    ("--parch:#EDE8DC",            "--parch:#FBF9FF"),
    ("--gold:#C9A84C",             "--gold:#FF0060"),
    ("--gold-lt:#E8D08A",          "--gold-lt:#00D0C9"),
    ("--gold-dk:#8A6520",          "--gold-dk:#391694"),
    ("--mid:#7A6E5A",              "--mid:#6F667E"),
    ("--mid:#6A6258",              "--mid:#6F667E"),
    ("--mid:#6A5A48",              "--mid:#6F667E"),
    ("--border:rgba(201,168,76,0.22)", "--border:rgba(57,22,148,.13)"),
    ("--border:rgba(201,168,76,0.2)",  "--border:rgba(57,22,148,.13)"),
    ("--border:rgba(201,168,76,.2)",   "--border:rgba(57,22,148,.13)"),
    ("--border:rgba(201,168,76,.22)",  "--border:rgba(57,22,148,.13)"),
    # --border:#E8E2DA (rh.html light)
    ("--border:#E8E2DA",           "--border:rgba(57,22,148,.15)"),

    # Cores raw gold em CSS
    ("#C9A84C",                    "#FF0060"),
    ("#8A6520",                    "#391694"),
    ("#E8D08A",                    "#00D0C9"),
    ("#6A4E18",                    "#261062"),

    # rgba gold → rgba magenta
    ("rgba(201,168,76,",           "rgba(255,0,96,"),

    # Cor ink raw
    ("#0A0806",                    "#261062"),
    ("#1A1612",                    "#261062"),
    ("#1a1208",                    "#261062"),
    ("#1a1410",                    "#261062"),
    ("#1A1410",                    "#261062"),
    ("rgba(10,8,6,",               "rgba(38,16,98,"),

    # Cream/parch raw
    ("#FAF6EE",                    "#FBF9FF"),
    ("#F3EDD8",                    "#F4F0FB"),
    ("#EDE8DC",                    "#F4F0FB"),

    # mid raw
    ("#7A6E5A",                    "#6F667E"),
    ("#6A5A48",                    "#6F667E"),
    ("#6A6258",                    "#6F667E"),

    # Blue accent (secundary visual) → IDL violet
    ("rgba(26,92,180,",            "rgba(77,29,191,"),
    ("#1A5CB4",                    "#4D1DBF"),
]

# Substituições específicas por arquivo
FILE_SPECIFIC = {
    "painel.html": [
        # painel é LIGHT theme — ink=claro, parch=escuro (invertido)
        ("--ink:#F5F0E8",          "--ink:#FBF9FF"),
        ("--parch:#1a1208",        "--parch:#24153E"),
        ("--gold:#8A6520",         "--gold:#FF0060"),
        ("--gold-lt:#C9A84C",      "--gold-lt:#00D0C9"),
        ("background:#F5F0E8",     "background:#FBF9FF"),
        ("#F5F0E8",                "#FBF9FF"),
        ("#F8F4EE",                "#F4F0FB"),
        ("#1a1208",                "#24153E"),
    ],
    "rh.html": [
        ("--ink:#0A0806; --parch:#FAFAFA", "--ink:#261062;--parch:#FBF9FF"),
        ("--gold:#C9A84C; --gold-dk:#8A6520; --gold-lt:#F0E8C8",
         "--gold:#FF0060;--gold-dk:#391694;--gold-lt:#00D0C9"),
        ("background:#F5F4F2",     "background:#FBF9FF"),
        ("#F5F4F2",                "#FBF9FF"),
        ("#F0E8C8",                "#F4F0FB"),
        ("#FAFAFA",                "#FBF9FF"),
    ],
}

def inject_idl_into_root(content):
    """Injeta variáveis IDL logo após :root{ """
    return re.sub(r':root\s*\{', ':root{' + IDL_ROOT_VARS, content, count=1)

def add_dm_sans_import(content):
    """Adiciona DM Sans ao import do Google Fonts já existente, ou cria novo."""
    # Se já tem DM+Sans, não faz nada
    if 'DM+Sans' in content or 'DM Sans' in content:
        return content
    # Insere antes do primeiro <style ou antes de </head>
    dm_import = "<link href=\"https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap\" rel=\"stylesheet\">\n"
    # Tenta inserir antes da tag <style
    if '<style>' in content:
        content = content.replace('<style>', dm_import + '<style>', 1)
    elif '<style ' in content:
        content = re.sub(r'<style ', dm_import + '<style ', content, count=1)
    return content

def update_body_background(content, fname):
    """Atualiza o background do body e do .bg para paleta IDL."""
    # Para páginas dark (index, admin, disc_v2): body usa gradient IDL
    dark_files = ['index.html', 'index_v2.html', 'admin.html', 'disc_v2.html']
    if fname in dark_files:
        # body background: var(--ink) → linear-gradient IDL
        content = re.sub(
            r'(body\{[^}]*background:)var\(--ink\)',
            r'\1var(--idl-gradient)',
            content
        )
        content = re.sub(
            r'(body\{[^}]*)background:#261062',
            r'\1background:var(--idl-gradient)',
            content
        )
        # .bg: substituir radial-gradient por gradient IDL
        content = re.sub(
            r'(\.bg\{[^}]*background:)radial-gradient[^;]+(?=;|})',
            r'\1var(--idl-gradient-circle)',
            content
        )
    return content

def apply_file(fname, extra_subs=None):
    path = BASE + fname
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Injetar DM Sans
    content = add_dm_sans_import(content)

    # 2. Injetar variáveis IDL no :root
    content = inject_idl_into_root(content)

    # 3. Substituições específicas do arquivo primeiro (mais específicas)
    if extra_subs:
        for old, new in extra_subs:
            content = content.replace(old, new)

    # 4. Substituições universais
    for old, new in UNIVERSAL:
        content = content.replace(old, new)

    # 5. Body/bg background
    content = update_body_background(content, fname)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ {fname} atualizado")

# Aplicar em todos os arquivos
files = ['index.html', 'index_v2.html', 'admin.html', 'painel.html', 'rh.html', 'disc_v2.html']
for fname in files:
    apply_file(fname, FILE_SPECIFIC.get(fname))

print("\n🎨 IDL Design System aplicado em todos os arquivos!")
