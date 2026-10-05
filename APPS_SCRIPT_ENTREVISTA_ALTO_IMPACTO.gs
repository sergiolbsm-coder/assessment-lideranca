/**
 * Apps Script dedicado à venture "Entrevista de Alto Impacto"
 * (ventures/entrevista-de-alto-impacto/*.html). Isolado dos outros Apps
 * Script deste repositório (assessment de liderança e diagnóstico de
 * carreira), não mexe nas planilhas nem nos scripts existentes.
 *
 * Acesso é público (candidatos externos não têm conta Google/Claude), então
 * TODA a persistência e a chamada de IA passam por aqui: a página estática
 * nunca fala diretamente com a IA (a chave de API nunca é exposta
 * no navegador).
 *
 * COMO IMPLANTAR (passo a passo manual, só o dono da conta consegue fazer):
 *   1. Crie uma planilha nova no Google Sheets, nomeie
 *      "IDL · Entrevista de Alto Impacto · Dados".
 *   2. Menu Extensões → Apps Script.
 *   3. Apague o conteúdo padrão de Code.gs e cole este arquivo inteiro.
 *   4. Menu ⚙️ Configurações do projeto → Propriedades do script → "Adicionar
 *      propriedade do script": nome GEMINI_API_KEY, valor = chave gratuita
 *      gerada em aistudio.google.com. (Alternativa paga: ANTHROPIC_API_KEY,
 *      de console.anthropic.com; o Gemini tem prioridade se as duas existirem.)
 *      Sem nenhuma das duas o feedback automático da IA fica marcado como
 *      indisponível, mas o resto do sistema funciona normalmente.
 *      Para o login (ver "login e sessão" abaixo), adicione também
 *      SPECIALIST_PASSWORD (senha da especialista) e ADMIN_PASSWORD (senha da
 *      tela Parametrizar). Usuários padrão: "especialista" e "admin".
 *   5. Menu Implantar → Nova implantação.
 *   6. Tipo: "App da Web". Executar como: "Eu". Quem tem acesso:
 *      "Qualquer pessoa".
 *   7. Implantar → autorize as permissões pedidas → copie a URL que termina
 *      em /exec.
 *   8. Cole essa URL na constante API_URL de
 *      ventures/entrevista-de-alto-impacto/app.js e publique de novo
 *      (commit + push).
 *
 * Sempre que editar este arquivo, cole de novo no editor do Apps Script e
 * faça "Gerenciar implantações" → editar a implantação existente → Nova
 * versão (a URL /exec não muda).
 */

// Modelo do Gemini (camada gratuita). Se o Google aposentar este nome, troque
// aqui por outro modelo Flash listado em ai.google.dev/gemini-api/docs/models.
const GEMINI_MODEL = 'gemini-2.5-flash';
// Se o modelo principal estiver sobrecarregado (503/429) ou indisponível, tenta
// estes em ordem. Todos têm camada gratuita.
const GEMINI_FALLBACKS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
const CLAUDE_MODEL = 'claude-sonnet-5';

const ABA_PERGUNTAS = 'Perguntas';
const CAB_PERGUNTAS = ['id','order','text','tipo','orientacao','aiGuidance','ativa','createdAt','updatedAt'];

const ABA_ENTREVISTAS = 'Entrevistas';
const CAB_ENTREVISTAS = [
  'id','candidateName','targetRole','status',
  'questionsSnapshotJSON','answersJSON','aiFeedbackJSON','specialistFeedbackJSON',
  'createdAt','submittedAt','reviewedAt','reviewedBy'
];

// ---------- infraestrutura de planilha ----------

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
  }
  return sh;
}
function questoesSheet_() { return getSheet_(ABA_PERGUNTAS, CAB_PERGUNTAS); }
function entrevistasSheet_() { return getSheet_(ABA_ENTREVISTAS, CAB_ENTREVISTAS); }

function readAll_(sheet, headers) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1)
    .filter(row => row[0] !== '')
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}
function findRowIndexById_(sheet, id) {
  const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2; // linha real (1-based, +1 pelo cabeçalho)
  }
  return -1;
}
function jsonOrDefault_(text, fallback) {
  if (text === '' || text === null || text === undefined) return fallback;
  try { return JSON.parse(text); } catch (e) { return fallback; }
}

// ---------- leitura (doGet) ----------

function rowToInterview_(r) {
  return {
    id: r.id,
    candidateName: r.candidateName,
    targetRole: r.targetRole,
    status: r.status,
    questionsSnapshot: jsonOrDefault_(r.questionsSnapshotJSON, []),
    answers: jsonOrDefault_(r.answersJSON, {}),
    aiFeedback: jsonOrDefault_(r.aiFeedbackJSON, { status: 'none' }),
    specialistFeedback: jsonOrDefault_(r.specialistFeedbackJSON, { byQuestion: {}, overall: null }),
    createdAt: r.createdAt,
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
    reviewedBy: r.reviewedBy
  };
}

function doGet(e) {
  try {
    const p = e.parameter || {};
    const action = p.action || '';

    if (action === 'login') {
      const r = login_(p.role, p.user, p.password);
      return jsonOut_(r.ok ? { status: 'ok', token: r.token, role: p.role } : { status: 'erro', mensagem: r.msg });
    }
    if (action === 'whoami') {
      const role = checkToken_(p.token);
      return jsonOut_(role ? { status: 'ok', role: role } : { status: 'erro', mensagem: 'AUTH' });
    }
    if (action === 'status') {
      // Diagnóstico sem expor segredos: só diz o que está configurado.
      const pr = props_();
      return jsonOut_({
        status: 'ok', versao: 'login-v1',
        ia: pr.getProperty('GEMINI_API_KEY') ? 'gemini' : (pr.getProperty('ANTHROPIC_API_KEY') ? 'anthropic' : 'nenhuma'),
        senhaEspecialista: !!pr.getProperty('SPECIALIST_PASSWORD'),
        senhaAdmin: !!pr.getProperty('ADMIN_PASSWORD')
      });
    }

    const resource = (p.resource || '').toLowerCase();
    if (resource === 'questions') {
      const rows = readAll_(questoesSheet_(), CAB_PERGUNTAS).map(r => Object.assign({}, r, {
        ativa: r.ativa === true || r.ativa === 'TRUE' || r.ativa === 'true',
        order: Number(r.order) || 0
      }));
      rows.sort((a, b) => a.order - b.order);
      return jsonOut_({ status: 'ok', rows: rows });
    }
    if (resource === 'interview') {
      // Público: o candidato abre a própria simulação pelo id do link.
      const r = readAll_(entrevistasSheet_(), CAB_ENTREVISTAS).filter(x => String(x.id) === String(p.id))[0];
      return jsonOut_({ status: 'ok', row: r ? rowToInterview_(r) : null });
    }
    if (resource === 'interviews') {
      // Lista completa (respostas de todos os candidatos): só com login.
      if (!isStaff_(checkToken_(p.token))) return jsonOut_({ status: 'erro', mensagem: 'AUTH' });
      return jsonOut_({ status: 'ok', rows: readAll_(entrevistasSheet_(), CAB_ENTREVISTAS).map(rowToInterview_) });
    }
    return jsonOut_({ status: 'erro', mensagem: 'resource inválido' });
  } catch (err) {
    return jsonOut_({ status: 'erro', mensagem: String(err) });
  }
}
function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- login e sessão ----------
//
// Senhas ficam só nas Propriedades do script (nunca no código nem no
// GitHub). Perfis:
//   especialista: SPECIALIST_PASSWORD (usuário: SPECIALIST_USER, padrão "especialista")
//   admin:        ADMIN_PASSWORD      (usuário: ADMIN_USER, padrão "admin")
// O login devolve um token assinado (HMAC) que vale por SESSION_HOURS.

const SESSION_HOURS = 12;
const ROLES = {
  especialista: { userProp: 'SPECIALIST_USER', passProp: 'SPECIALIST_PASSWORD', defaultUser: 'especialista' },
  admin: { userProp: 'ADMIN_USER', passProp: 'ADMIN_PASSWORD', defaultUser: 'admin' }
};
function props_() { return PropertiesService.getScriptProperties(); }
function secret_() {
  let sec = props_().getProperty('TOKEN_SECRET');
  if (!sec) { sec = Utilities.getUuid() + Utilities.getUuid(); props_().setProperty('TOKEN_SECRET', sec); }
  return sec;
}
function sign_(payload) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, secret_()));
}
function makeToken_(role) {
  const payload = role + '.' + (Date.now() + SESSION_HOURS * 3600 * 1000);
  return payload + '.' + sign_(payload);
}
function checkToken_(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  if (sign_(parts[0] + '.' + parts[1]) !== parts[2]) return null;
  if (Number(parts[1]) < Date.now()) return null;
  return ROLES[parts[0]] ? parts[0] : null;
}
function isStaff_(role) { return role === 'especialista' || role === 'admin'; }

function login_(role, user, pass) {
  const cfg = ROLES[role];
  if (!cfg) return { ok: false, msg: 'Perfil inválido.' };
  const cache = CacheService.getScriptCache();
  const key = 'falhas_' + role;
  const falhas = Number(cache.get(key) || 0);
  if (falhas >= 5) return { ok: false, msg: 'Muitas tentativas erradas. Aguarde 10 minutos.' };
  const pr = props_();
  const senha = pr.getProperty(cfg.passProp);
  if (!senha) return { ok: false, msg: 'A senha deste perfil ainda não foi configurada no backend.' };
  const usuario = pr.getProperty(cfg.userProp) || cfg.defaultUser;
  if (String(user || '').trim().toLowerCase() === usuario.toLowerCase() && String(pass || '') === senha) {
    cache.remove(key);
    return { ok: true, token: makeToken_(role) };
  }
  cache.put(key, String(falhas + 1), 600);
  Utilities.sleep(800);
  return { ok: false, msg: 'Usuário ou senha incorretos.' };
}

// ---------- escrita (doPost) ----------

const ADMIN_ACTIONS = ['upsertQuestion', 'seedQuestions', 'deleteQuestion', 'reorderQuestions'];
const STAFF_ACTIONS = ['saveSpecialistFeedback', 'saveOverallFeedback', 'completeReview', 'reopenReview'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const handlers = {
      upsertQuestion: upsertQuestion_,
      seedQuestions: seedQuestions_,
      deleteQuestion: deleteQuestion_,
      reorderQuestions: reorderQuestions_,
      createInterview: createInterview_,
      saveAnswer: saveAnswer_,
      finishInterview: finishInterview_,
      retryAiFeedback: retryAiFeedback_,
      saveSpecialistFeedback: saveSpecialistFeedback_,
      saveOverallFeedback: saveOverallFeedback_,
      completeReview: completeReview_,
      reopenReview: reopenReview_
    };
    const fn = handlers[action];
    if (!fn) return jsonOut_({ status: 'erro', mensagem: 'action inválida: ' + action });
    const role = checkToken_(data.token);
    if (ADMIN_ACTIONS.indexOf(action) > -1 && role !== 'admin') return jsonOut_({ status: 'erro', mensagem: 'AUTH' });
    if (STAFF_ACTIONS.indexOf(action) > -1 && !isStaff_(role)) return jsonOut_({ status: 'erro', mensagem: 'AUTH' });
    fn(data);
    return jsonOut_({ status: 'ok' });
  } catch (err) {
    return jsonOut_({ status: 'erro', mensagem: String(err) });
  }
  // Nota: como o cliente chama com mode:'no-cors', ele nunca lê este corpo.
  // Mantemos a resposta JSON normal para permitir testes manuais (ex:
  // Postman) e depuração pelo log de execuções do Apps Script.
}

// ---------- perguntas ----------

function upsertQuestion_(data) {
  const sh = questoesSheet_();
  const idx = data.id ? findRowIndexById_(sh, data.id) : -1;
  if (idx === -1) {
    const rows = readAll_(sh, CAB_PERGUNTAS);
    const maxOrder = rows.reduce((m, r) => Math.max(m, Number(r.order) || 0), 0);
    const id = data.id || Utilities.getUuid();
    const now = new Date().toISOString();
    sh.appendRow([
      id, data.order != null ? data.order : maxOrder + 1, data.text || '', data.tipo || 'direta',
      data.orientacao || '', data.aiGuidance || '', !!data.ativa, now, now
    ]);
  } else {
    const row = idx;
    const current = sh.getRange(row, 1, 1, CAB_PERGUNTAS.length).getValues()[0];
    const obj = {};
    CAB_PERGUNTAS.forEach((h, i) => obj[h] = current[i]);
    const updated = Object.assign({}, obj, {
      text: data.text != null ? data.text : obj.text,
      tipo: data.tipo != null ? data.tipo : obj.tipo,
      orientacao: data.orientacao != null ? data.orientacao : obj.orientacao,
      aiGuidance: data.aiGuidance != null ? data.aiGuidance : obj.aiGuidance,
      ativa: data.ativa != null ? !!data.ativa : obj.ativa,
      updatedAt: new Date().toISOString()
    });
    sh.getRange(row, 1, 1, CAB_PERGUNTAS.length).setValues([CAB_PERGUNTAS.map(h => updated[h])]);
  }
}
function seedQuestions_(data) {
  const sh = questoesSheet_();
  if (readAll_(sh, CAB_PERGUNTAS).length > 0) return; // evita importar o banco de exemplo duas vezes
  const list = data.questions || [];
  const now = new Date().toISOString();
  const rows = list.map((q, i) => [
    q.id || Utilities.getUuid(), i + 1, q.text || '', q.tipo || 'direta',
    q.orientacao || '', q.aiGuidance || '', !!q.ativa, now, now
  ]);
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, CAB_PERGUNTAS.length).setValues(rows);
}
function deleteQuestion_(data) {
  const sh = questoesSheet_();
  const idx = findRowIndexById_(sh, data.id);
  if (idx > -1) sh.deleteRow(idx);
}
function reorderQuestions_(data) {
  const sh = questoesSheet_();
  const idxA = findRowIndexById_(sh, data.idA);
  const idxB = findRowIndexById_(sh, data.idB);
  if (idxA === -1 || idxB === -1) return;
  const colOrder = CAB_PERGUNTAS.indexOf('order') + 1;
  const orderA = sh.getRange(idxA, colOrder).getValue();
  const orderB = sh.getRange(idxB, colOrder).getValue();
  sh.getRange(idxA, colOrder).setValue(orderB);
  sh.getRange(idxB, colOrder).setValue(orderA);
}

// ---------- entrevistas ----------

function createInterview_(data) {
  const sh = entrevistasSheet_();
  const now = new Date().toISOString();
  sh.appendRow([
    data.id, data.candidateName || '', data.targetRole || '', 'em_andamento',
    JSON.stringify(data.questionsSnapshot || []), JSON.stringify({}),
    JSON.stringify({ status: 'none' }), JSON.stringify({ byQuestion: {}, overall: null }),
    data.createdAt || now, '', '', ''
  ]);
}
function updateInterviewCell_(id, colName, value) {
  const sh = entrevistasSheet_();
  const idx = findRowIndexById_(sh, id);
  if (idx === -1) throw new Error('entrevista não encontrada: ' + id);
  const col = CAB_ENTREVISTAS.indexOf(colName) + 1;
  sh.getRange(idx, col).setValue(value);
  return idx;
}
function readInterview_(id) {
  const sh = entrevistasSheet_();
  const idx = findRowIndexById_(sh, id);
  if (idx === -1) return null;
  const row = sh.getRange(idx, 1, 1, CAB_ENTREVISTAS.length).getValues()[0];
  const obj = {};
  CAB_ENTREVISTAS.forEach((h, i) => obj[h] = row[i]);
  return obj;
}

function saveAnswer_(data) {
  const current = readInterview_(data.id);
  if (!current) return;
  const answers = jsonOrDefault_(current.answersJSON, {});
  answers[data.qid] = { text: data.text || '', answeredAt: new Date().toISOString() };
  updateInterviewCell_(data.id, 'answersJSON', JSON.stringify(answers));
}

function finishInterview_(data) {
  const current = readInterview_(data.id);
  if (!current) return;
  const answers = jsonOrDefault_(current.answersJSON, {});
  Object.assign(answers, data.answers || {});
  updateInterviewCell_(data.id, 'answersJSON', JSON.stringify(answers));
  updateInterviewCell_(data.id, 'status', 'submetido');
  updateInterviewCell_(data.id, 'submittedAt', new Date().toISOString());
  updateInterviewCell_(data.id, 'aiFeedbackJSON', JSON.stringify({ status: 'pending' }));

  const snapshot = jsonOrDefault_(current.questionsSnapshotJSON, []);
  const feedback = callAiFeedback_(snapshot, answers);
  updateInterviewCell_(data.id, 'aiFeedbackJSON', JSON.stringify(feedback));
}
function retryAiFeedback_(data) {
  const current = readInterview_(data.id);
  if (!current) return;
  const snapshot = jsonOrDefault_(current.questionsSnapshotJSON, []);
  const answers = jsonOrDefault_(current.answersJSON, {});
  updateInterviewCell_(data.id, 'aiFeedbackJSON', JSON.stringify({ status: 'pending' }));
  const feedback = callAiFeedback_(snapshot, answers);
  updateInterviewCell_(data.id, 'aiFeedbackJSON', JSON.stringify(feedback));
}

function saveSpecialistFeedback_(data) {
  const current = readInterview_(data.id);
  if (!current) return;
  const sf = jsonOrDefault_(current.specialistFeedbackJSON, { byQuestion: {}, overall: null });
  sf.byQuestion = sf.byQuestion || {};
  sf.byQuestion[data.qid] = { text: data.text || '', specialistName: data.specialistName || 'Especialista', updatedAt: new Date().toISOString() };
  updateInterviewCell_(data.id, 'specialistFeedbackJSON', JSON.stringify(sf));
}
function saveOverallFeedback_(data) {
  const current = readInterview_(data.id);
  if (!current) return;
  const sf = jsonOrDefault_(current.specialistFeedbackJSON, { byQuestion: {}, overall: null });
  sf.overall = { text: data.text || '', specialistName: data.specialistName || 'Especialista', updatedAt: new Date().toISOString() };
  updateInterviewCell_(data.id, 'specialistFeedbackJSON', JSON.stringify(sf));
}
function completeReview_(data) {
  updateInterviewCell_(data.id, 'status', 'avaliado');
  updateInterviewCell_(data.id, 'reviewedAt', new Date().toISOString());
  updateInterviewCell_(data.id, 'reviewedBy', data.specialistName || 'Especialista');
}
function reopenReview_(data) {
  updateInterviewCell_(data.id, 'status', 'submetido');
}

// ---------- IA (Gemini ou Anthropic) ----------

// Usa o Gemini se existir GEMINI_API_KEY (tem camada gratuita); senão usa a
// Anthropic se existir ANTHROPIC_API_KEY; sem nenhuma das duas, marca o
// feedback automático como indisponível (o resto do sistema segue normal).
function callAiFeedback_(questionsSnapshot, answers) {
  const props = PropertiesService.getScriptProperties();
  const geminiKey = props.getProperty('GEMINI_API_KEY');
  const claudeKey = props.getProperty('ANTHROPIC_API_KEY');
  if (!geminiKey && !claudeKey) return { status: 'unavailable' };
  try {
    const prompt = buildAiPrompt_(questionsSnapshot, answers);
    const text = geminiKey ? askGemini_(geminiKey, prompt) : askClaude_(claudeKey, prompt);
    const arr = extractJsonArray_(text);
    const byQuestion = {};
    arr.forEach(item => { if (item && item.id) byQuestion[item.id] = String(item.feedback || ''); });
    if (!Object.keys(byQuestion).length) return { status: 'error', error: 'resposta da IA sem feedbacks no formato esperado: ' + String(text).slice(0, 300) };
    return { status: 'ready', byQuestion: byQuestion, generatedAt: new Date().toISOString() };
  } catch (err) {
    return { status: 'error', error: String(err) };
  }
}

function askGemini_(apiKey, prompt) {
  const modelos = [GEMINI_MODEL].concat(GEMINI_FALLBACKS);
  let ultimoErro = '';
  for (let i = 0; i < modelos.length; i++) {
    const resp = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + modelos[i] + ':generateContent', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-goog-api-key': apiKey },
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 }
        }),
        muteHttpExceptions: true
      });
    const code = resp.getResponseCode();
    let body = {};
    try { body = JSON.parse(resp.getContentText()); } catch (e) {}
    if (code === 200) {
      const cand = (body.candidates && body.candidates[0]) || {};
      const parts = (cand.content && cand.content.parts) || [];
      // Ignora partes de "pensamento" do modelo; só o texto da resposta interessa.
      const text = parts.filter(p => !p.thought).map(p => p.text || '').join('');
      if (text) return text;
      ultimoErro = modelos[i] + ': sem texto (finishReason: ' + (cand.finishReason || (body.promptFeedback && body.promptFeedback.blockReason) || 'desconhecido') + ')';
      continue;
    }
    ultimoErro = modelos[i] + ': ' + ((body.error && body.error.message) || ('HTTP ' + code));
    // Chave inválida/sem permissão: trocar de modelo não adianta.
    if (code === 400 || code === 401 || code === 403) break;
    Utilities.sleep(1500);
  }
  throw new Error('Gemini ' + ultimoErro);
}

function askClaude_(apiKey, prompt) {
  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2500,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });
  const body = JSON.parse(resp.getContentText());
  if (resp.getResponseCode() !== 200) {
    throw new Error('Anthropic: ' + ((body.error && body.error.message) || ('HTTP ' + resp.getResponseCode())));
  }
  return (body.content && body.content[0] && body.content[0].text) || '';
}

function buildAiPrompt_(snapshot, answers) {
  const blocks = snapshot.map((q, i) => {
    const a = answers[q.qid];
    const resp = (a && a.text ? String(a.text).trim() : '') || '(o candidato não respondeu esta pergunta)';
    const tipoLabel = (q.tipo === 'star') ? 'Método STAR' : (q.tipo === 'reflexiva' ? 'Resposta Reflexiva' : 'Resposta Direta');
    return 'PERGUNTA ' + (i + 1) + ' (id: "' + q.qid + '", padrão: ' + tipoLabel + ')\n"' + q.text + '"\n' +
      'Critério de avaliação: ' + (q.aiGuidance || 'Avalie clareza, relevância e estrutura da resposta.') + '\n' +
      'Resposta do candidato: """' + resp + '"""';
  }).join('\n\n');
  return 'Você é um coach de entrevistas de emprego experiente, avaliando as respostas de um candidato numa simulação. ' +
    'Para CADA pergunta abaixo, escreva um feedback construtivo em português do Brasil (2 a 4 frases), citando o critério de avaliação indicado, ' +
    'reconhecendo o que funcionou e apontando 1 a 2 melhorias específicas e acionáveis. Seja direto, gentil e específico, nunca genérico.\n\n' +
    blocks +
    '\n\nResponda SOMENTE com um array JSON no formato [{"id":"<id da pergunta>","feedback":"<texto>"}], um objeto por pergunta, na mesma ordem. Nenhum texto fora do array.';
}

function extractJsonArray_(text) {
  const asList = v => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      const k = Object.keys(v).filter(x => Array.isArray(v[x]))[0];
      if (k) return v[k];
    }
    return null;
  };
  try { const l = asList(JSON.parse(text)); if (l) return l; } catch (e) {}
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start > -1 && end > start) {
    try { const l = asList(JSON.parse(text.slice(start, end + 1))); if (l) return l; } catch (e2) {}
  }
  return [];
}
