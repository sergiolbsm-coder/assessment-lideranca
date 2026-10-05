// ============================================================
// Entrevista de Alto Impacto · lógica compartilhada (4 páginas)
// Idealizadora: Franciane Novais · Venture em parceria com o IDL
// ============================================================
"use strict";

const API_URL = "https://script.google.com/macros/s/AKfycbxq-j5BSn9_TTmyiF_Hm-262B3MA9pTMj8qdBOA81WGyJnBn5rE5cN4K7w3c8bTMTi-PQ/exec";

const TIPO_META = {
  direta:    { label:"Resposta Direta",    short:"Direta",    desc:"Objetiva e factual" },
  reflexiva: { label:"Resposta Reflexiva", short:"Reflexiva", desc:"Autoconhecimento e opinião fundamentada" },
  star:      { label:"Método STAR",        short:"STAR",      desc:"Situação · Tarefa · Ação · Resultado" }
};

const TEMPLATES = {
  direta: {
    orientacao: "Responda de forma objetiva e direta, com fatos concretos e relevantes para a vaga. Evite respostas genéricas ou longas demais: vá direto ao ponto.",
    aiGuidance: "Avalie se a resposta é objetiva, específica e relevante para a vaga (não genérica ou evasiva), e se tem duração adequada (nem curta demais nem prolixa)."
  },
  reflexiva: {
    orientacao: "Mostre autoconhecimento: fundamente sua resposta com exemplos reais e conecte-a ao que você busca profissionalmente. Seja honesto, específico e evite respostas de manual (clichês).",
    aiGuidance: "Avalie se a resposta demonstra autoconhecimento genuíno, se é sustentada por exemplos ou raciocínio concreto (não apenas clichês) e se está alinhada a uma postura profissional madura."
  },
  star: {
    orientacao: "Estruture sua resposta com o método STAR: descreva a Situação e o contexto, a Tarefa/objetivo que você tinha, as Ações específicas que você tomou e o Resultado alcançado (idealmente com dados/impacto).",
    aiGuidance: "Verifique se a resposta cobre as quatro etapas do método STAR (Situação, Tarefa, Ação, Resultado), aponte qual etapa está fraca ou ausente, e avalie se o resultado apresentado é concreto e mensurável."
  }
};

// Recursos ainda não liberados ao público. Recrutadora fica desligada por enquanto.
const FEATURES = { recrutadora: false };

const JOB_STATUS = {
  em_analise: "Em análise",
  proxima_etapa: "Avançou para a próxima etapa",
  banco_talentos: "Banco de talentos",
  nao_seguiu: "Não seguiu neste processo",
  contratado: "Contratação"
};

const STATUS_META = {
  aguardando_transcricao: { label:"Aguardando transcrição", cls:"muted" },
  em_andamento: { label:"Em andamento", cls:"muted" },
  submetido:    { label:"Aguardando especialista", cls:"purple" },
  avaliado:     { label:"Avaliado", cls:"" }
};

function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function nl2br(s){ return esc(s); } // white-space:pre-wrap no CSS cuida das quebras de linha
function fmtDate(iso){
  if(!iso) return "-";
  try{
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) + " às " +
           d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }catch(e){ return iso; }
}
function toast(msg){
  var host = document.getElementById('toast-host');
  if(!host) return;
  var t = document.createElement('div');
  t.className='toast'; t.textContent=msg;
  host.appendChild(t);
  setTimeout(function(){ t.remove(); }, 3800);
}
function uid(){
  return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2,9);
}
function qs(name){
  return new URLSearchParams(location.search).get(name);
}
function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

// ---------- localStorage ----------
function lsGet(key, fallback){
  try{ var v = localStorage.getItem(key); return v?JSON.parse(v):fallback; }catch(e){ return fallback; }
}
function lsSet(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
}
function myInterviews(){ return lsGet('eai_meus_ids', []); }
function addMyInterview(entry){
  var list = myInterviews().filter(function(x){ return x.id!==entry.id; });
  list.unshift(entry);
  lsSet('eai_meus_ids', list.slice(0,30));
}
function specialistName(){ return lsGet('eai_especialista_nome', ''); }
function setSpecialistName(n){ lsSet('eai_especialista_nome', n); }

// ---------- API client ----------
// GET é lido normalmente (o Apps Script permite leitura cross-origin).
// POST usa mode:'no-cors' (contorna a falta de suporte a preflight do Apps
// Script), a resposta fica opaca, então toda escrita é "dispara e confirma
// via um novo GET" (padrão já usado no carreira-rh.html).
// ---------- sessão (login da especialista e do admin) ----------
const AUTH_KEY = 'eai_auth';
function getAuth(){
  var a = lsGet(AUTH_KEY, null);
  return (a && a.token && a.exp > Date.now()) ? a : null;
}
function clearAuth(){ try{ localStorage.removeItem(AUTH_KEY); }catch(e){} }
function logout(){ clearAuth(); location.href = 'index.html'; }

const Api = {
  _check(){
    if(!API_URL || API_URL.indexOf('COLE_AQUI') === 0) throw new Error('CONFIG');
  },
  async get(params){
    this._check();
    var auth = getAuth();
    var q = Object.assign({t:Date.now()}, params);
    if(auth) q.token = auth.token;
    // Nunca deixa a tela "carregando" para sempre: avisa se demorar e desiste em 60 s.
    var ctl = new AbortController();
    var aviso = setTimeout(function(){ toast('O servidor do Google está demorando para responder. Aguarde um pouco…'); }, 8000);
    var limite = setTimeout(function(){ ctl.abort(); }, 60000);
    try{
      var r = await fetch(API_URL + '?' + new URLSearchParams(q).toString(), {signal: ctl.signal});
      var json = await r.json();
    }catch(e){
      if(e && e.name === 'AbortError') throw new Error('O servidor demorou demais para responder. Tente de novo em instantes.');
      throw e;
    }finally{ clearTimeout(aviso); clearTimeout(limite); }
    if(json.status !== 'ok') throw new Error(json.mensagem || 'erro');
    return json;
  },
  async post(action, payload){
    this._check();
    var auth = getAuth();
    await fetch(API_URL, {
      method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(Object.assign({action:action, token: auth ? auth.token : ''}, payload))
    });
  },
  async login(role, user, password){
    var j = await this.get({action:'login', role:role, user:user, password:password});
    this._saveSession(j);
    return j;
  },
  _saveSession(j){
    lsSet(AUTH_KEY, {token:j.token, role:j.role, name: (j.profile && j.profile.name) || '', exp: Date.now() + 11*3600*1000});
  },
  // Contas de participantes
  async register(d){ var j = await this.get(Object.assign({action:'register'}, d)); this._saveSession(j); return j; },
  async forgot(email){ return this.get({action:'forgot', email:email}); },
  async resetPassword(email, code, password){ var j = await this.get({action:'resetPassword', email:email, code:code, password:password}); this._saveSession(j); return j; },
  async me(){ return this.get({action:'me'}); },
  async listBlocks(){ var j = await this.get({action:'list', resource:'blocks'}); return j.rows||[]; },
  async whoami(){ return (await this.get({action:'whoami'})).role; },
  async listQuestions(){
    var j = await this.get({action:'list', resource:'questions'});
    var rows = j.rows||[];
    lsSet('eai_q_cache', {t:Date.now(), rows:rows});
    return rows;
  },
  // Devolve na hora a cópia guardada no navegador (se tiver menos de 24 h) e
  // confere no servidor em segundo plano; onUpdate recebe a lista nova se mudou.
  async listQuestionsFast(onUpdate){
    var c = lsGet('eai_q_cache', null);
    var fresh = this.listQuestions();
    if(c && c.rows && Date.now() - c.t < 24*3600*1000){
      fresh.then(function(rows){ if(onUpdate && JSON.stringify(rows) !== JSON.stringify(c.rows)) onUpdate(rows); }).catch(function(){});
      return c.rows;
    }
    return fresh;
  },
  // Lista leve (só o resumo de cada simulação). Backend antigo ignora o parâmetro e manda tudo.
  async listInterviews(){ var j = await this.get({action:'list', resource:'interviews', summary:'1'}); return j.rows||[]; },
  async listInterviewsFull(){ var j = await this.get({action:'list', resource:'interviews'}); return j.rows||[]; },
  async getInterview(id){
    try{
      var j = await this.get({action:'list', resource:'interview', id:id});
      return j.row || null;
    }catch(err){
      // Backend antigo (antes do login) não tem o endpoint individual:
      // cai para a lista completa, que ele ainda serve sem token.
      if(err.message !== 'resource inválido') throw err;
      var rows = await this.listInterviewsFull();
      return rows.find(function(r){ return r.id===id; }) || null;
    }
  }
};

// Exige login antes de mostrar a página. `allowed` = perfis aceitos
// (o primeiro é o que a tela de login pede). Valida o token no servidor.
async function requireRole(allowed, titulo){
  var auth = getAuth();
  if(auth && allowed.indexOf(auth.role) > -1){
    // Mostra a página já; a conferência no servidor roda em paralelo (cada
    // chamada ao Apps Script custa ~2 s) e só interrompe se a sessão caiu.
    Api.whoami().catch(function(err){ if(err.message === 'AUTH'){ clearAuth(); location.reload(); } });
    return true;
  }
  showLogin(allowed[0], titulo);
  return false;
}
function showLogin(role, titulo){
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="wrap"><div class="card" style="max-width:380px;margin:30px auto">'+
      '<h2 style="font-size:24px">'+esc(titulo||'Acesso restrito')+'</h2>'+
      '<p class="hint" style="margin-bottom:18px">Entre com o usuário e a senha que você recebeu.</p>'+
      '<form id="login-form">'+
        '<div class="field"><label>Usuário</label><input id="lg-user" autocomplete="username" autocapitalize="none" required></div>'+
        '<div class="field"><label>Senha</label><input id="lg-pass" type="password" autocomplete="current-password" required></div>'+
        '<button class="btn-primary" id="lg-btn" type="submit" style="width:100%">Entrar</button>'+
        '<p class="hint" id="lg-msg" style="margin-top:12px;min-height:18px"></p>'+
      '</form></div></div>';
  document.getElementById('lg-user').focus();
  document.getElementById('login-form').addEventListener('submit', async function(ev){
    ev.preventDefault();
    var btn = document.getElementById('lg-btn'), msg = document.getElementById('lg-msg');
    btn.disabled = true; btn.textContent = 'Entrando…'; msg.textContent = '';
    try{
      await Api.login(role, document.getElementById('lg-user').value, document.getElementById('lg-pass').value);
      location.reload();
    }catch(err){
      msg.textContent = (err.message === 'CONFIG') ? 'Backend não configurado.' : err.message;
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });
}

function configWarningHtml(){
  return '<div class="wrap"><div class="card" style="text-align:center;padding:50px 30px">'+
    '<h2>Backend ainda não configurado</h2>'+
    '<p class="muted" style="margin-top:10px">Falta colar a URL do Apps Script implantado na constante <code>API_URL</code> do arquivo <code>app.js</code>. Veja o passo a passo em <code>APPS_SCRIPT_ENTREVISTA_ALTO_IMPACTO.gs</code>.</p>'+
    '</div></div>';
}

// ---------- navegação ----------
function renderNav(active){
  // Quem só responde vê Início e Responder (e Minha conta, se tiver conta).
  // Os menus de trabalho aparecem só depois do login, conforme o perfil.
  var auth = getAuth(), role = auth && auth.role;
  var tabs = [
    {href:'index.html', k:'inicio', label:'Início'},
    {href:'responder.html', k:'responder', label:'Responder'}
  ];
  if(role === 'respondente') tabs.push({href:'conta.html', k:'conta', label:'Minha conta'});
  if(role === 'especialista' || role === 'admin') tabs.push({href:'especialista.html', k:'especialista', label:'Especialista'});
  if(FEATURES.recrutadora && (role === 'recrutadora' || role === 'admin')) tabs.push({href:'recrutadora.html', k:'recrutadora', label:'Recrutadora'});
  if(role === 'especialista' || role === 'admin') tabs.push({href:'relatorio.html', k:'relatorio', label:'Relatório'});
  if(role === 'especialista' || role === 'admin') tabs.push({href:'admin.html', k:'admin', label:'Parametrizar'});
  var el = document.getElementById('tabs');
  if(!el) return;
  var quem = role === 'respondente' ? ((auth.name || 'Participante').split(' ')[0]) : (ROTULO_PERFIL[role] || role);
  el.innerHTML = tabs.map(function(t){
    return '<a class="tab'+(t.k===active?' active':'')+'" href="'+t.href+'">'+t.label+'</a>';
  }).join('') + (auth
    ? '<button class="tab tab-session" onclick="logout()" title="Encerrar sessão">Sair ('+esc(quem)+')</button>'
    : '<button class="tab tab-session tab-login" onclick="openLoginModal()">Entrar</button>');
}

var ROTULO_PERFIL = {respondente:'Participante', especialista:'Especialista', recrutadora:'Recrutadora', admin:'Admin'};
var DESTINO_PERFIL = {respondente:'conta.html', especialista:'especialista.html', recrutadora:'recrutadora.html', admin:'admin.html'};

// Login no canto superior direito: vale para o site todo (a sessão fica
// guardada no navegador por 11 h), então trocar de menu não pede senha de novo.
function openLoginModal(modo){
  if(document.getElementById('login-modal')) return;
  var perfis = [['respondente','Participante (e-mail)'],['especialista','Especialista'],['admin','Administrador']];
  var ov = document.createElement('div');
  ov.id = 'login-modal'; ov.className = 'modal-overlay';
  document.body.appendChild(ov);
  var close = function(){ ov.remove(); document.removeEventListener('keydown', onKey); };
  var onKey = function(e){ if(e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('mousedown', function(e){ if(e.target === ov) close(); });
  var depois = function(role){
    var pagina = location.pathname.split('/').pop() || 'index.html';
    if(role === 'respondente' && pagina === 'responder.html') location.reload();
    else if(pagina === 'index.html' || pagina === 'responder.html' || pagina === 'equipe.html' || role === 'respondente') location.href = DESTINO_PERFIL[role];
    else location.reload();
  };

  function telaEntrar(){
    ov.innerHTML = '<div class="modal-box" role="dialog" aria-label="Entrar">'+
      '<h2 style="font-size:24px">Entrar</h2>'+
      '<p class="hint" style="margin-bottom:16px">Depois de entrar, o acesso vale para todo o site.</p>'+
      '<form id="lm-form">'+
        '<div class="field"><label>Perfil</label><select id="lm-role">'+perfis.map(function(p){ return '<option value="'+p[0]+'">'+p[1]+'</option>'; }).join('')+'</select></div>'+
        '<div class="field"><label id="lm-ulabel">E-mail</label><input id="lm-user" autocomplete="username" autocapitalize="none" required></div>'+
        '<div class="field"><label>Senha</label><input id="lm-pass" type="password" autocomplete="current-password" required></div>'+
        '<div style="display:flex;gap:10px"><button class="btn-primary" id="lm-btn" type="submit" style="flex:1">Entrar</button>'+
        '<button class="btn-secondary" type="button" id="lm-cancel">Cancelar</button></div>'+
        '<p class="hint" id="lm-msg" style="margin-top:12px;min-height:18px"></p>'+
        '<p class="hint" id="lm-extra" style="display:flex;justify-content:space-between;gap:10px"><a href="responder.html" style="color:var(--idl-purple);font-weight:600">Criar conta de participante</a><a href="#" id="lm-forgot" style="color:var(--idl-purple);font-weight:600">Esqueci minha senha</a></p>'+
      '</form></div>';
    var sel = document.getElementById('lm-role');
    var ajusta = function(){
      var part = sel.value === 'respondente';
      document.getElementById('lm-ulabel').textContent = part ? 'E-mail' : 'Usuário';
      document.getElementById('lm-extra').style.display = part ? 'flex' : 'none';
    };
    sel.onchange = ajusta; ajusta();
    document.getElementById('lm-cancel').onclick = close;
    document.getElementById('lm-forgot').onclick = function(e){ e.preventDefault(); telaEsqueci(document.getElementById('lm-user').value); };
    document.getElementById('lm-user').focus();
    document.getElementById('lm-form').addEventListener('submit', async function(ev){
      ev.preventDefault();
      var role = sel.value, btn = document.getElementById('lm-btn'), msg = document.getElementById('lm-msg');
      btn.disabled = true; btn.textContent = 'Entrando…'; msg.textContent = '';
      try{
        await Api.login(role, document.getElementById('lm-user').value, document.getElementById('lm-pass').value);
        depois(role);
      }catch(err){
        msg.textContent = (err.message === 'CONFIG') ? 'Backend não configurado.' : err.message;
        btn.disabled = false; btn.textContent = 'Entrar';
      }
    });
  }

  function telaEsqueci(emailInicial){
    ov.innerHTML = '<div class="modal-box"><h2 style="font-size:24px">Redefinir senha</h2>'+
      '<p class="hint" id="rs-dica" style="margin-bottom:14px">Informe o e-mail da sua conta. Enviaremos um código de 6 dígitos.</p>'+
      '<form id="rs-form">'+
        '<div class="field"><label>E-mail</label><input id="rs-email" type="email" required value="'+esc(emailInicial||'')+'"></div>'+
        '<div id="rs-passo2" style="display:none">'+
          '<div class="field"><label>Código recebido por e-mail</label><input id="rs-code" inputmode="numeric" maxlength="6"></div>'+
          '<div class="field"><label>Nova senha (mínimo 8 caracteres)</label><input id="rs-pass" type="password" autocomplete="new-password"></div></div>'+
        '<div style="display:flex;gap:10px"><button class="btn-primary" id="rs-btn" type="submit" style="flex:1">Enviar código</button>'+
        '<button class="btn-secondary" type="button" id="rs-back">Voltar</button></div>'+
        '<p class="hint" id="rs-msg" style="margin-top:12px;min-height:18px"></p></form></div>';
    var passo = 1;
    document.getElementById('rs-back').onclick = telaEntrar;
    document.getElementById('rs-form').addEventListener('submit', async function(ev){
      ev.preventDefault();
      var btn = document.getElementById('rs-btn'), msg = document.getElementById('rs-msg'), email = document.getElementById('rs-email').value;
      btn.disabled = true; msg.textContent = '';
      try{
        if(passo === 1){
          await Api.forgot(email);
          passo = 2; document.getElementById('rs-passo2').style.display = 'block';
          document.getElementById('rs-dica').textContent = 'Se existir uma conta com esse e-mail, o código foi enviado. Ele vale por 15 minutos.';
          btn.textContent = 'Redefinir senha'; document.getElementById('rs-code').focus();
        } else {
          await Api.resetPassword(email, document.getElementById('rs-code').value, document.getElementById('rs-pass').value);
          depois('respondente'); return;
        }
      }catch(err){ msg.textContent = err.message; }
      btn.disabled = false;
    });
  }
  if(modo === 'esqueci') telaEsqueci(''); else telaEntrar();
}

// Banco de 44 perguntas clássicas de entrevista de emprego, classificadas
// pelo padrão de resposta esperado. As 10 marcadas `ativa:true` formam uma
// primeira simulação equilibrada (mistura dos 3 padrões); o resto fica no
// banco pronto para o admin ativar conforme a vaga.
const SEED_QUESTIONS = [
  { text:"Fale um pouco sobre sua formação acadêmica.", tipo:"direta", ativa:false,
    orientacao:"Conecte sua formação diretamente com as exigências da vaga: destaque cursos, projetos ou disciplinas mais relevantes, e seja breve, no máximo 60 segundos de resposta.",
    aiGuidance:"Verifique se a resposta é objetiva (não uma lista cronológica completa), se conecta a formação à vaga/área de interesse, e se dura o suficiente sem ser genérica." },
  { text:"Como você ficou sabendo desta vaga?", tipo:"direta", ativa:false,
    orientacao:"Seja específico (indicação, LinkedIn, site da empresa) e aproveite para demonstrar que você pesquisou sobre a empresa antes da entrevista.",
    aiGuidance:"Avalie se a resposta é específica (não vaga como 'vi por aí') e se demonstra alguma pesquisa prévia sobre a empresa/vaga." },
  { text:"Fale sobre você.", tipo:"reflexiva", ativa:true,
    orientacao:"Use a estrutura presente-passado-futuro: quem você é profissionalmente hoje, como chegou até aqui (resumo, não currículo completo) e o que busca a seguir. Limite a 1-2 minutos.",
    aiGuidance:"Cheque se a resposta segue uma narrativa coerente (não uma lista de cargos), se é relevante para a vaga e se tem duração/foco adequados." },
  { text:"Quais são os seus hobbies?", tipo:"direta", ativa:false,
    orientacao:"Seja autêntico, mas escolha hobbies que revelem traços úteis para o trabalho (disciplina, criatividade, trabalho em equipe) sem parecer forçado.",
    aiGuidance:"Avalie autenticidade e se a resposta conecta (ainda que sutilmente) a algum traço profissional positivo, sem soar ensaiada demais." },
  { text:"Por que você está interessado em trabalhar para esta empresa?", tipo:"reflexiva", ativa:true,
    orientacao:"Mostre que você pesquisou a empresa: cite algo específico (produto, cultura, missão, projeto recente) e conecte com seus valores/objetivos de carreira.",
    aiGuidance:"Verifique se há menção específica e verificável sobre a empresa (não genérica, tipo 'empresa é referência no mercado') e conexão pessoal genuína." },
  { text:"Onde você se vê em cinco anos?", tipo:"reflexiva", ativa:true,
    orientacao:"Mostre ambição realista e alinhada à vaga/empresa, sem prometer permanência cega nem parecer perdido; foque em crescimento de competências e contribuição.",
    aiGuidance:"Avalie se a resposta é realista, alinhada à trajetória e à vaga, e evita extremos (nem 'seu cargo' nem 'não sei')." },
  { text:"Por que você deixaria seu emprego atual?", tipo:"reflexiva", ativa:false,
    orientacao:"Nunca fale mal do empregador atual. Foque no que você busca (crescimento, desafio, alinhamento) e não no que está fugindo.",
    aiGuidance:"Verifique se a resposta evita críticas ao empregador atual/ex-chefe e se é orientada a motivos positivos de busca, não de fuga." },
  { text:"Por que há uma lacuna na sua trajetória profissional entre (data) e (data)?", tipo:"reflexiva", ativa:false,
    orientacao:"Seja transparente e breve sobre o motivo da pausa, e direcione rapidamente para o que você aprendeu ou fez de produtivo nesse período (estudos, projetos pessoais, cuidado familiar), sem parecer estar se desculpando.",
    aiGuidance:"Avalie se a resposta é transparente (sem evasivas), breve, e se redireciona para aprendizados/produtividade no período, sem tom defensivo excessivo." },
  { text:"Cite três pontos em que seu ex-chefe gostaria que você melhorasse.", tipo:"reflexiva", ativa:false,
    orientacao:"Escolha pontos reais e relevantes, mas que não sejam desqualificantes para a vaga; mostre também o que você já fez para evoluir em cada um.",
    aiGuidance:"Verifique se os pontos citados são plausíveis e não desqualificantes, e se a resposta mostra ação concreta de melhoria para cada um." },
  { text:"Você tem planos de carreira internacional?", tipo:"direta", ativa:false,
    orientacao:"Seja honesto sobre sua real disponibilidade e planos. Alinhar expectativas agora evita problemas depois.",
    aiGuidance:"Avalie se a resposta é honesta, direta e coerente com o restante do perfil do candidato." },
  { text:"Você teria disponibilidade para viajar a trabalho?", tipo:"direta", ativa:false,
    orientacao:"Seja honesto sobre sua real disponibilidade para viagens. Alinhar expectativas agora evita problemas depois.",
    aiGuidance:"Avalie se a resposta é honesta, direta e coerente com o restante do perfil do candidato." },
  { text:"Conte sobre a realização de carreira da qual mais se orgulha.", tipo:"star", ativa:true,
    orientacao:TEMPLATES.star.orientacao, aiGuidance:TEMPLATES.star.aiGuidance },
  { text:"Conte sobre alguma vez em que você tenha cometido um erro.", tipo:"star", ativa:false,
    orientacao:TEMPLATES.star.orientacao, aiGuidance:TEMPLATES.star.aiGuidance },
  { text:"Descreva como seria o emprego ideal para você.", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"O que você espera realizar nos primeiros 30, 60 e 90 dias de trabalho?", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Me fale um pouco sobre sua trajetória profissional.", tipo:"direta", ativa:false,
    orientacao:TEMPLATES.direta.orientacao, aiGuidance:TEMPLATES.direta.aiGuidance },
  { text:"Quais são os seus pontos fracos?", tipo:"reflexiva", ativa:true,
    orientacao:"Escolha uma fraqueza real (não um ponto forte disfarçado, como 'sou perfeccionista demais'), mostre autoconsciência e conte o que você está fazendo concretamente para melhorar.",
    aiGuidance:"Sinalize se a resposta é um clichê disfarçado de ponto forte (ex: 'sou perfeccionista'), e avalie se há um plano de ação real para melhoria." },
  { text:"Quais são os seus pontos fortes?", tipo:"reflexiva", ativa:true,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Conte-me como lidou com uma situação desafiadora.", tipo:"star", ativa:true,
    orientacao:TEMPLATES.star.orientacao, aiGuidance:TEMPLATES.star.aiGuidance },
  { text:"Por que deveríamos te contratar?", tipo:"reflexiva", ativa:true,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Por que você está procurando um novo emprego?", tipo:"reflexiva", ativa:false,
    orientacao:"Nunca fale mal do empregador atual/anterior. Foque no que você busca (crescimento, desafio, alinhamento) e não no que está fugindo.",
    aiGuidance:"Verifique se a resposta evita críticas ao empregador atual/ex-chefe e se é orientada a motivos positivos de busca, não de fuga." },
  { text:"Você trabalharia em fins de semana e feriados?", tipo:"direta", ativa:false,
    orientacao:"Seja honesto sobre sua real disponibilidade. Alinhar expectativas agora evita problemas depois.",
    aiGuidance:"Avalie se a resposta é honesta, direta e coerente com o restante do perfil do candidato." },
  { text:"Como você lidaria com um cliente insatisfeito?", tipo:"star", ativa:false,
    orientacao:TEMPLATES.star.orientacao, aiGuidance:TEMPLATES.star.aiGuidance },
  { text:"Qual a sua pretensão salarial?", tipo:"direta", ativa:true,
    orientacao:"Pesquise a faixa de mercado antes da entrevista e responda com uma faixa (não um número fixo), demonstrando abertura para negociar com base no pacote completo.",
    aiGuidance:"Avalie se a resposta apresenta uma faixa (não apenas um número rígido) e se demonstra preparo/pesquisa de mercado." },
  { text:"Conte-me sobre alguma vez em que foi além do esperado em um projeto.", tipo:"star", ativa:false,
    orientacao:TEMPLATES.star.orientacao, aiGuidance:TEMPLATES.star.aiGuidance },
  { text:"Quem são seus concorrentes?", tipo:"direta", ativa:false,
    orientacao:TEMPLATES.direta.orientacao, aiGuidance:TEMPLATES.direta.aiGuidance },
  { text:"Qual é o seu maior fracasso?", tipo:"star", ativa:false,
    orientacao:"Escolha um fracasso real com aprendizado claro; use a estrutura STAR e termine mostrando como você aplicou essa lição depois.",
    aiGuidance:"Verifique se a resposta assume o fracasso com honestidade (sem terceirizar culpa), estrutura via STAR, e termina com aprendizado aplicado." },
  { text:"O que te motiva no ambiente de trabalho?", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Qual a sua disponibilidade?", tipo:"direta", ativa:false,
    orientacao:TEMPLATES.direta.orientacao, aiGuidance:TEMPLATES.direta.aiGuidance },
  { text:"Quem é o seu mentor?", tipo:"direta", ativa:false,
    orientacao:TEMPLATES.direta.orientacao, aiGuidance:TEMPLATES.direta.aiGuidance },
  { text:"Conte-me sobre alguma vez em que discordou do seu gestor.", tipo:"star", ativa:false,
    orientacao:"Mostre que você discorda com respeito e argumentos, e feche com um desfecho profissional (ainda que não tenha 'vencido' a discussão).",
    aiGuidance:"Avalie se a resposta mostra discordância respeitosa e construtiva, com um desfecho profissional, evitando parecer insubordinado ou conflituoso." },
  { text:"Como você lida com a pressão?", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Quais as suas metas de carreira?", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Quais eram os estilos de liderança dos seus chefes?", tipo:"direta", ativa:false,
    orientacao:TEMPLATES.direta.orientacao, aiGuidance:TEMPLATES.direta.aiGuidance },
  { text:"O que as pessoas que se reportam diretamente a você diriam sobre você?", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Se eu ligasse agora para o seu chefe, o que ele diria que você precisa melhorar?", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Qual o seu estilo de liderança ou gestão?", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Qual o último livro que você leu?", tipo:"direta", ativa:false,
    orientacao:TEMPLATES.direta.orientacao, aiGuidance:TEMPLATES.direta.aiGuidance },
  { text:"O que o deixa desconfortável ou desmotivado?", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Quais foram as suas experiências com liderança?", tipo:"star", ativa:false,
    orientacao:TEMPLATES.star.orientacao, aiGuidance:TEMPLATES.star.aiGuidance },
  { text:"Como você demitiria alguém?", tipo:"star", ativa:false,
    orientacao:"Demonstre empatia e clareza: comunicação direta, respeitosa, com motivos claros e cuidado com a dignidade da pessoa.",
    aiGuidance:"Verifique se a resposta equilibra clareza/decisão com empatia e respeito pela pessoa desligada." },
  { text:"O que você mais gosta e o que menos gosta de trabalhar neste setor?", tipo:"reflexiva", ativa:false,
    orientacao:TEMPLATES.reflexiva.orientacao, aiGuidance:TEMPLATES.reflexiva.aiGuidance },
  { text:"Conte algo que seja verdade, mas que quase ninguém concorde com você.", tipo:"reflexiva", ativa:false,
    orientacao:"Escolha algo genuíno e não polêmico demais para o contexto profissional; mostre capacidade de pensar de forma independente com argumentos bem construídos.",
    aiGuidance:"Avalie originalidade genuína, qualidade da argumentação e adequação ao contexto profissional (evitar temas sensíveis/polêmicos demais)." },
  { text:"Quais perguntas você quer fazer para mim?", tipo:"direta", ativa:true,
    orientacao:"Sempre tenha 2-3 perguntas preparadas sobre a vaga, o time ou os desafios do momento. Nunca diga 'não tenho perguntas'.",
    aiGuidance:"Verifique se o candidato apresentou perguntas reais e relevantes (não genéricas). Sinalize como ponto de atenção se a resposta for 'não tenho perguntas'." }
];

function loadingHtml(msg){
  return '<div class="wrap"><p class="muted" style="text-align:center;padding:60px 0">'+esc(msg||'Carregando…')+'</p></div>';
}
function errorHtml(err){
  if(err && err.message === 'CONFIG') return configWarningHtml();
  if(err && err.message === 'AUTH'){
    clearAuth();
    return '<div class="wrap"><div class="card" style="text-align:center;padding:50px 30px">'+
      '<h2>Sessão expirada</h2><p class="muted" style="margin-top:10px">Entre de novo para continuar.</p>'+
      '<button class="btn-primary" style="margin-top:16px" onclick="location.reload()">Entrar</button></div></div>';
  }
  return '<div class="wrap"><div class="card" style="text-align:center;padding:50px 30px">'+
    '<h2>Não foi possível carregar</h2>'+
    '<p class="muted" style="margin-top:10px">'+esc((err && err.message) || 'Tente novamente em instantes.')+'</p>'+
    '<button class="btn-secondary" style="margin-top:16px" onclick="location.reload()">Tentar de novo</button>'+
    '</div></div>';
}
function starLegendHtml(){
  return '<div class="star-legend"><span><b>S</b>ituação</span><span><b>T</b>arefa</span><span><b>A</b>ção</span><span><b>R</b>esultado</span></div>';
}
