#!/usr/bin/env python3
"""
Fix v3 — corrige logo (coordenadas absolutas) + admin (bloqueia fetch CSV privado).
"""
import re, os

BASE = "/Users/sergiomoura/Claude/idl-sistema/"

# ═══════════════════════════════════════════════════════════════════
# LOGO SVG — coordenadas absolutas (sem rotate, sem deformação)
# viewBox 0 0 260 90  |  ícone ocupa 0-90  |  texto 90-260
# Centro do ícone: (45, 45)
# ═══════════════════════════════════════════════════════════════════
ICON = """  <!-- Top: teal -->
  <ellipse cx="45" cy="26" rx="10" ry="15" fill="#00C5B2"/>
  <circle  cx="45" cy="10" r="7"  fill="#00C5B2"/>
  <!-- Right: magenta -->
  <ellipse cx="64" cy="45" rx="15" ry="10" fill="#FF1566"/>
  <circle  cx="80" cy="45" r="7"  fill="#FF1566"/>
  <!-- Bottom: purple -->
  <ellipse cx="45" cy="64" rx="10" ry="15" fill="#7C3AED"/>
  <circle  cx="45" cy="80" r="7"  fill="#7C3AED"/>
  <!-- Left: teal (lighter) -->
  <ellipse cx="26" cy="45" rx="15" ry="10" fill="#00C5B2" opacity="0.65"/>
  <circle  cx="10" cy="45" r="7"  fill="#00C5B2" opacity="0.65"/>
  <!-- Center -->
  <circle  cx="45" cy="45" r="6"  fill="#FF1566"/>"""


def logo_dark(h="120px"):
    """Para fundo escuro — 'DA LIDERANÇA' em branco."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" style="height:{h};width:auto;display:block" role="img" aria-label="Instituto da Liderança">
{ICON}
  <text x="95" y="39" font-family="'DM Sans',Arial,sans-serif" font-weight="800" font-size="30" fill="#FF1566" font-style="italic">Instituto</text>
  <text x="97" y="63" font-family="'DM Sans',Arial,sans-serif" font-weight="700" font-size="13" fill="#FFFFFF" letter-spacing="2.5">DA LIDERANÇA</text>
</svg>'''


def logo_light(h="80px"):
    """Para fundo claro — 'DA LIDERANÇA' em roxo escuro."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" style="height:{h};width:auto;display:block" role="img" aria-label="Instituto da Liderança">
{ICON}
  <text x="95" y="39" font-family="'DM Sans',Arial,sans-serif" font-weight="800" font-size="30" fill="#FF1566" font-style="italic">Instituto</text>
  <text x="97" y="63" font-family="'DM Sans',Arial,sans-serif" font-weight="700" font-size="13" fill="#391694" letter-spacing="2.5">DA LIDERANÇA</text>
</svg>'''


# ═══════════════════════════════════════════════════════════════════
# ADMIN OVERRIDE SCRIPT — bloqueia CSV privado + carrega via Apps Script
# ═══════════════════════════════════════════════════════════════════
ADMIN_OVERRIDE = r"""<script id="idl-data-override">
/* ═══ IDL Admin — override completo ════════════════════════════════
   1. Bloqueia fetch ao Google Sheets CSV (privado → retornaria HTML de login)
   2. Carrega respondentes via Apps Script JSON
   3. MutationObserver: re-renderiza se alguém limpar a tabela
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  var EP = 'https://script.google.com/macros/s/AKfycbyUFi-n1PaKBH119A0XiWZ_wMgN7jRbN176F1VLEUD0JyODhVVGooVRcQQ1D0MFZkS4ng/exec';
  var DISC = {D:'Dominante',I:'Influente',S:'Estável',C:'Conformidade'};

  /* ── 1. Bloqueia requests ao Sheets CSV (fundo) ── */
  var _origFetch = window.fetch;
  window.fetch = function(url, opts){
    if(typeof url==='string' && url.indexOf('docs.google.com/spreadsheets')>=0){
      /* retorna JSON vazio para não crashar o parser CSV */
      return Promise.resolve(new Response('',{status:200,headers:{'Content-Type':'text/csv'}}));
    }
    return _origFetch.apply(this, arguments);
  };

  /* ── helpers ── */
  function qs(id){ return document.getElementById(id); }

  function populateTurmas(data){
    var turmas=[];
    data.forEach(function(r){ if(r.turma && turmas.indexOf(r.turma)<0) turmas.push(r.turma); });
    turmas.sort();
    ['f-turma','dash-turma','pts-turma','rank-turma'].forEach(function(id){
      var sel=qs(id); if(!sel) return;
      var cur=sel.value;
      sel.innerHTML='<option value="">'+(id==='pts-turma'?'Selecione a turma':'Todas as turmas')+'</option>'
        +turmas.map(function(t){return '<option value="'+t+'">'+t+'</option>';}).join('');
      if(cur) sel.value=cur;
    });
  }

  function renderTable(data){
    var tbody=qs('table-body'), emp=qs('empty-resp');
    if(!tbody) return;
    var search=(qs('search')||{}).value||''; search=search.toLowerCase();
    var fT=(qs('f-turma')||{}).value||'';
    var fF=(qs('f-fase')||{}).value||'';
    var fD=(qs('f-disc')||{}).value||'';
    var filtered=data.filter(function(r){
      if(search && (r.nome||'').toLowerCase().indexOf(search)<0 && (r.email||'').toLowerCase().indexOf(search)<0) return false;
      if(fT && r.turma!==fT) return false;
      if(fF && r.fase!==fF)  return false;
      if(fD && DISC[r.disc_primario]!==fD) return false;
      return true;
    });
    window._filteredData=filtered;
    var sc=qs('sel-count'); if(sc) sc.textContent=filtered.length+' respondente(s)';
    if(!filtered.length){
      tbody.innerHTML='';
      if(emp) emp.style.display='flex';
      return;
    }
    if(emp) emp.style.display='none';
    tbody.innerHTML=filtered.map(function(r,i){
      var disc=(r.disc_primario||'')+(r.disc_secundario?'/'+r.disc_secundario:'');
      var dt=r.timestamp?new Date(r.timestamp).toLocaleDateString('pt-BR'):'—';
      return '<tr>'
        +'<td class="check-col"><input type="checkbox" class="row-check" data-id="'+r._id+'"></td>'
        +'<td>'+(i+1)+'</td>'
        +'<td><strong style="color:var(--parch)">'+(r.nome||'—')+'</strong><br>'
        +'<span style="font-size:11px;color:var(--mid)">'+(r.email||'')+'</span></td>'
        +'<td style="color:var(--parch)">'+(r.turma||'—')+'</td>'
        +'<td style="color:var(--parch)">'+(r.fase||'—')+'</td>'
        +'<td><strong style="color:var(--gold)">'+(disc||'—')+'</strong></td>'
        +'<td style="color:var(--parch)">'+(r.elem_primario||'—')+'</td>'
        +'<td style="color:var(--parch)">'+(r.ennea_nome||'—')+'</td>'
        +'<td style="color:var(--parch)">'+(r.arquetipos||'—')+'</td>'
        +'<td style="color:var(--parch)">'+(r.kolb_estilo||'—')+'</td>'
        +'<td style="color:var(--parch)">'+(r.need_1a||'—')+'</td>'
        +'<td style="color:var(--parch)">'+(r.holland_codigo||'—')+'</td>'
        +'<td style="font-size:11px;color:var(--mid)">'+dt+'</td>'
        +'<td><button class="btn btn-outline btn-sm" onclick="idlView('+r._id+')" style="font-size:11px;padding:3px 8px">📄 Ver</button></td>'
        +'</tr>';
    }).join('');
    var ca=qs('chk-all');
    if(ca){ ca.checked=false; ca.onchange=function(e){document.querySelectorAll('.row-check').forEach(function(c){c.checked=e.target.checked;}); }; }
  }

  /* ── 2. Carrega dados via Apps Script ── */
  function idlLoad(){
    var tbody=qs('table-body');
    if(tbody) tbody.innerHTML='<tr><td colspan="14" style="text-align:center;padding:32px;color:var(--mid)">⏳ Carregando respondentes…</td></tr>';
    fetch(EP+'?action=getData&t='+Date.now())
      .then(function(r){ return r.json(); })
      .then(function(json){
        if(!json || json.status!=='ok' || !json.data || !json.data.length){
          if(tbody) tbody.innerHTML='';
          var e=qs('empty-resp'); if(e) e.style.display='flex';
          return;
        }
        window._adminData = json.data;
        populateTurmas(json.data);
        renderTable(json.data);
        /* ── 3. MutationObserver: re-renderiza se alguém limpar a tabela ── */
        if(!window._idlObserver){
          window._idlObserver = new MutationObserver(function(){
            var tb=qs('table-body');
            if(tb && !tb.querySelector('tr') && window._adminData && window._adminData.length){
              renderTable(window._adminData);
            }
          });
          var tb=qs('table-body');
          if(tb) window._idlObserver.observe(tb,{childList:true});
        }
      })
      .catch(function(err){
        if(tbody) tbody.innerHTML='<tr><td colspan="14" style="text-align:center;padding:32px;color:#FF0060">'
          +'❌ Erro: '+err.message+'</td></tr>';
      });
  }

  /* ── globals ── */
  window.idlView = function(id){
    var r=(window._adminData||[]).find(function(x){return x._id===id;});
    if(!r) return;
    localStorage.setItem('idl_preview_user', JSON.stringify(r));
    window.open('painel.html','_blank');
  };
  window.loadData     = idlLoad;
  window.filterTable  = function(){ if(window._adminData) renderTable(window._adminData); };
  window.selectAll    = function(){ document.querySelectorAll('.row-check').forEach(function(c){c.checked=true;}); };
  window.clearSelection=function(){ document.querySelectorAll('.row-check').forEach(function(c){c.checked=false;}); };
  window.exportSelected=function(){
    var ids=Array.from(document.querySelectorAll('.row-check:checked')).map(function(c){return parseInt(c.dataset.id);});
    var rows=(window._adminData||[]).filter(function(r){return ids.indexOf(r._id)>=0;});
    if(!rows.length){alert('Selecione ao menos um respondente.');return;}
    var keys=Object.keys(rows[0]);
    var csv=[keys.join(',')].concat(rows.map(function(r){return keys.map(function(k){return JSON.stringify(r[k]!=null?r[k]:'');}).join(',');})).join('\n');
    var a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,﻿'+encodeURIComponent(csv);
    a.download='respondentes_'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
  };

  /* ── inicia ── */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(idlLoad, 800); });
  } else {
    setTimeout(idlLoad, 800);
  }
})();
</script>"""


# ═══════════════════════════════════════════════════════════════════
# HELPERS DE SUBSTITUIÇÃO
# ═══════════════════════════════════════════════════════════════════

def svg_pat():
    """Regex que captura qualquer SVG com aria-label=Instituto da Liderança."""
    return r'<svg[^>]*aria-label="Instituto da Liderança"[^>]*>.*?</svg>'


# ─── index.html ────────────────────────────────────────────────────
def fix_index():
    path = BASE + "index.html"
    with open(path, encoding="utf-8") as f: c = f.read()
    before = c

    # Substitui SVG dentro do container da logo
    c = re.sub(
        r'(<div style="display:flex;align-items:center;justify-content:center;margin-bottom:\d+px">)\s*'
        + svg_pat()
        + r'\s*(</div>)',
        r'\1\n      ' + logo_dark("140px") + r'\n    \2',
        c, flags=re.DOTALL
    )
    # Fallback: qualquer SVG IDL avulso
    if c == before:
        c = re.sub(svg_pat(), logo_dark("140px"), c, flags=re.DOTALL)

    if c != before:
        with open(path, "w", encoding="utf-8") as f: f.write(c)
        print("✅ index.html — logo")
    else:
        print("⚠️  index.html — padrão não encontrado")


# ─── admin.html ────────────────────────────────────────────────────
def fix_admin():
    path = BASE + "admin.html"
    with open(path, encoding="utf-8") as f: c = f.read()

    # 1. Substitui logo na sidebar
    c = re.sub(
        r'(<div class="sidebar-logo">)\s*' + svg_pat() + r'\s*(?=</div>)',
        r'\1\n      ' + logo_dark("48px") + r'\n    ',
        c, flags=re.DOTALL
    )

    # 2. Remove script override anterior (pode ter qualquer id ou sem id)
    c = re.sub(
        r'<script id="idl-data-override">.*?</script>',
        '',
        c, flags=re.DOTALL
    )

    # 3. Injeta novo override antes de </body>
    c = c.replace('</body>', ADMIN_OVERRIDE + '\n</body>', 1)

    with open(path, "w", encoding="utf-8") as f: f.write(c)
    print("✅ admin.html — logo + override")


# ─── painel.html ───────────────────────────────────────────────────
def fix_painel():
    path = BASE + "painel.html"
    if not os.path.exists(path):
        print("⚠️  painel.html não encontrado"); return
    with open(path, encoding="utf-8") as f: c = f.read()
    before = c

    c = re.sub(
        r'(<div class="site-logo"[^>]*>)\s*' + svg_pat() + r'\s*(</div>)',
        r'\1' + logo_light("44px") + r'\2',
        c, flags=re.DOTALL
    )
    # Fallback: qualquer SVG IDL
    if c == before:
        c = re.sub(svg_pat(), logo_light("44px"), c, count=1, flags=re.DOTALL)

    if c != before:
        with open(path, "w", encoding="utf-8") as f: f.write(c)
        print("✅ painel.html — logo")
    else:
        print("⚠️  painel.html — padrão não encontrado")


# ─── rh.html ───────────────────────────────────────────────────────
def fix_rh():
    path = BASE + "rh.html"
    if not os.path.exists(path):
        print("⚠️  rh.html não encontrado"); return
    with open(path, encoding="utf-8") as f: c = f.read()
    before = c

    # login-logo
    c = re.sub(
        r'(<div class="login-logo">)\s*' + svg_pat() + r'\s*(</div>)',
        r'\1\n      ' + logo_dark("72px") + r'\n    \2',
        c, flags=re.DOTALL
    )
    # sidebar-logo
    c = re.sub(
        r'(<div class="sidebar-logo">)\s*' + svg_pat() + r'\s*(?=</div>|<nav)',
        r'\1\n      ' + logo_dark("44px") + r'\n    ',
        c, flags=re.DOTALL
    )

    if c != before:
        with open(path, "w", encoding="utf-8") as f: f.write(c)
        print("✅ rh.html — logo")
    else:
        print("⚠️  rh.html — padrão não encontrado")


# ─── index_v2.html ─────────────────────────────────────────────────
def fix_index_v2():
    path = BASE + "index_v2.html"
    if not os.path.exists(path):
        print("⚠️  index_v2.html não encontrado"); return
    with open(path, encoding="utf-8") as f: c = f.read()
    before = c
    c = re.sub(svg_pat(), logo_dark("120px"), c, flags=re.DOTALL)
    if c != before:
        with open(path, "w", encoding="utf-8") as f: f.write(c)
        print("✅ index_v2.html — logo")
    else:
        print("⚠️  index_v2.html — padrão não encontrado")


# ═══════════════════════════════════════════════════════════════════
fix_index()
fix_admin()
fix_painel()
fix_rh()
fix_index_v2()
print("\n🎨 Fix v3 concluído!")
