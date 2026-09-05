// ============================================================
// Entrevista de Alto Impacto — lógica compartilhada (4 páginas)
// Idealizadora: Franciane Novais · Venture em parceria com o IDL
// ============================================================
"use strict";

// PASSO OBRIGATÓRIO ANTES DE PUBLICAR: troque pela URL /exec do Apps Script
// (veja APPS_SCRIPT_ENTREVISTA_ALTO_IMPACTO.gs para o passo a passo de deploy).
const API_URL = "COLE_AQUI_A_URL_DO_APPS_SCRIPT_/exec";

const TIPO_META = {
  direta:    { label:"Resposta Direta",    short:"Direta",    desc:"Objetiva e factual" },
  reflexiva: { label:"Resposta Reflexiva", short:"Reflexiva", desc:"Autoconhecimento e opinião fundamentada" },
  star:      { label:"Método STAR",        short:"STAR",      desc:"Situação · Tarefa · Ação · Resultado" }
};

const TEMPLATES = {
  direta: {
    orientacao: "Responda de forma objetiva e direta, com fatos concretos e relevantes para a vaga. Evite respostas genéricas ou longas demais — vá direto ao ponto.",
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

const STATUS_META = {
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
  if(!iso) return "—";
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
// Script) — a resposta fica opaca, então toda escrita é "dispara e confirma
// via um novo GET" (padrão já usado no carreira-rh.html).
const Api = {
  async get(params){
    if(!API_URL || API_URL.indexOf('COLE_AQUI') === 0){
      throw new Error('CONFIG');
    }
    var url = API_URL + '?' + new URLSearchParams(Object.assign({t:Date.now()}, params)).toString();
    var r = await fetch(url);
    var json = await r.json();
    if(json.status !== 'ok') throw new Error(json.mensagem || 'erro');
    return json;
  },
  async post(action, payload){
    if(!API_URL || API_URL.indexOf('COLE_AQUI') === 0){
      throw new Error('CONFIG');
    }
    await fetch(API_URL, {
      method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(Object.assign({action:action}, payload))
    });
  },
  async listQuestions(){ var j = await this.get({action:'list', resource:'questions'}); return j.rows||[]; },
  async listInterviews(){ var j = await this.get({action:'list', resource:'interviews'}); return j.rows||[]; },
  async getInterview(id){
    var rows = await this.listInterviews();
    return rows.find(function(r){ return r.id===id; }) || null;
  }
};

function configWarningHtml(){
  return '<div class="wrap"><div class="card" style="text-align:center;padding:50px 30px">'+
    '<h2>Backend ainda não configurado</h2>'+
    '<p class="muted" style="margin-top:10px">Falta colar a URL do Apps Script implantado na constante <code>API_URL</code> do arquivo <code>app.js</code>. Veja o passo a passo em <code>APPS_SCRIPT_ENTREVISTA_ALTO_IMPACTO.gs</code>.</p>'+
    '</div></div>';
}

// ---------- navegação ----------
function renderNav(active){
  var tabs = [
    {href:'index.html', k:'responder', label:'Responder'},
    {href:'especialista.html', k:'especialista', label:'Especialista'},
    {href:'relatorio.html', k:'relatorio', label:'Relatório'},
    {href:'admin.html', k:'admin', label:'Parametrizar'}
  ];
  var el = document.getElementById('tabs');
  if(!el) return;
  el.innerHTML = tabs.map(function(t){
    return '<a class="tab'+(t.k===active?' active':'')+'" href="'+t.href+'">'+t.label+'</a>';
  }).join('');
}

// Banco de 44 perguntas clássicas de entrevista de emprego, classificadas
// pelo padrão de resposta esperado. As 10 marcadas `ativa:true` formam uma
// primeira simulação equilibrada (mistura dos 3 padrões); o resto fica no
// banco pronto para o admin ativar conforme a vaga.
const SEED_QUESTIONS = [
  { text:"Fale um pouco sobre sua formação acadêmica.", tipo:"direta", ativa:false,
    orientacao:"Conecte sua formação diretamente com as exigências da vaga: destaque cursos, projetos ou disciplinas mais relevantes, e seja breve — no máximo 60 segundos de resposta.",
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
    orientacao:"Seja honesto sobre sua real disponibilidade e planos — alinhar expectativas agora evita problemas depois.",
    aiGuidance:"Avalie se a resposta é honesta, direta e coerente com o restante do perfil do candidato." },
  { text:"Você teria disponibilidade para viajar a trabalho?", tipo:"direta", ativa:false,
    orientacao:"Seja honesto sobre sua real disponibilidade para viagens — alinhar expectativas agora evita problemas depois.",
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
    orientacao:"Seja honesto sobre sua real disponibilidade — alinhar expectativas agora evita problemas depois.",
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
    orientacao:"Sempre tenha 2-3 perguntas preparadas sobre a vaga, o time ou os desafios do momento — nunca diga 'não tenho perguntas'.",
    aiGuidance:"Verifique se o candidato apresentou perguntas reais e relevantes (não genéricas) — sinalizar como ponto de atenção se a resposta for 'não tenho perguntas'." }
];

function loadingHtml(msg){
  return '<div class="wrap"><p class="muted" style="text-align:center;padding:60px 0">'+esc(msg||'Carregando…')+'</p></div>';
}
function errorHtml(err){
  if(err && err.message === 'CONFIG') return configWarningHtml();
  return '<div class="wrap"><div class="card" style="text-align:center;padding:50px 30px">'+
    '<h2>Não foi possível carregar</h2>'+
    '<p class="muted" style="margin-top:10px">'+esc((err && err.message) || 'Tente novamente em instantes.')+'</p>'+
    '<button class="btn-secondary" style="margin-top:16px" onclick="location.reload()">Tentar de novo</button>'+
    '</div></div>';
}
function starLegendHtml(){
  return '<div class="star-legend"><span><b>S</b>ituação</span><span><b>T</b>arefa</span><span><b>A</b>ção</span><span><b>R</b>esultado</span></div>';
}
