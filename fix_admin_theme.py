#!/usr/bin/env python3
"""
Aplica o tema do painel.html no admin.html:
- Troca variáveis CSS (:root) pelo padrão IDL roxo/magenta
- Atualiza body background, .bg, fontes e cores de acento
"""
import re

path = "/Users/sergiomoura/Claude/idl-sistema/admin.html"
with open(path, encoding="utf-8") as f:
    c = f.read()

# ── 1. Substitui bloco :root inteiro ──────────────────────────────
OLD_ROOT = re.compile(
    r':root\{[^}]*--ink:#0A0806[^}]*\}',
    re.DOTALL
)
NEW_ROOT = """:root{
  --idl-magenta:#FF0060;
  --idl-purple:#391694;
  --idl-purple-dark:#261062;
  --idl-violet:#4D1DBF;
  --idl-turquoise:#00D0C9;
  --idl-text:#24153E;
  --idl-text-muted:#6F667E;
  --idl-background:#FBF9FF;
  --idl-border:rgba(57,22,148,.13);
  --idl-gradient:linear-gradient(145deg,#261062,#391694 70%,#4D1DBF);

  --ink:#FBF9FF;--parch:#24153E;--gold:#FF0060;--gold-lt:#00D0C9;--gold-dk:#261062;
  --fire:#D4401A;--flame:#F07030;--water:#4D1DBF;--sky:#4A90D4;
  --mid:#6F667E;--border:rgba(57,22,148,.13);--r:12px;--r-sm:8px;
  --danger:#EF4444;
}"""
c, n = OLD_ROOT.subn(NEW_ROOT, c, count=1)
print(f"{'✅' if n else '❌'} :root substituído")

# ── 2. body — fundo branco, fonte DM Sans ─────────────────────────
c = re.sub(
    r"body\{font-family:'Syne'[^}]*\}",
    "body{font-family:'DM Sans',sans-serif;background:#FBF9FF;color:#24153E;min-height:100vh}",
    c
)

# ── 3. .bg — gradiente sutil sobre branco ─────────────────────────
c = re.sub(
    r'\.bg\{[^}]*background:[^}]*var\(--ink\)[^}]*\}',
    '.bg{position:fixed;inset:0;z-index:0;background:radial-gradient(ellipse 60% 40% at 15% 20%,rgba(255,0,96,.06) 0%,transparent 60%),radial-gradient(ellipse 50% 50% at 85% 75%,rgba(77,29,191,.04) 0%,transparent 55%),#FBF9FF}',
    c
)

# ── 4. Botões e nav — cores de acento ────────────────────────────
# nav.active — troca dourado por magenta
c = c.replace(
    'background:rgba(201,168,76,.06)',
    'background:rgba(255,0,96,.06)'
)
c = c.replace(
    "border-color:rgba(201,168,76,.4);color:var(--parch)",
    "border-color:rgba(255,0,96,.4);color:var(--parch)"
)

# ── 5. Fontes: Syne → DM Sans em BTNs e outros elementos ─────────
c = c.replace("font-family:'Syne',sans-serif", "font-family:'DM Sans',sans-serif")
c = c.replace("font-family:'Syne'", "font-family:'DM Sans',sans-serif")

# ── 6. Google Fonts — troca import Syne por DM Sans ──────────────
c = re.sub(
    r"https://fonts\.googleapis\.com/css2\?[^'\"]*Syne[^'\"]*",
    "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,300..800&family=Cormorant+Garamond:wght@400;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
    c
)

# ── 7. sidebar — fundo levemente diferenciado sobre branco ────────
# O sidebar fica bem com border-right sutil, sem precisar mudar mais

with open(path, "w", encoding="utf-8") as f:
    f.write(c)

print("✅ Tema do painel.html aplicado no admin.html")
print("   Fundo: #FBF9FF (branco) | Acento: #FF0060 (magenta) | Fonte: DM Sans")
