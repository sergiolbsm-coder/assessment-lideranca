
// ═══════════════════════════════════════════════════════════════════════════
// APPS SCRIPT — Instituto da Liderança  |  Versão 2025.5
// ═══════════════════════════════════════════════════════════════════════════
var SHEET_ID       = '1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho';
var ABA_RESPOSTAS  = 'Respostas';
var ABA_PONTUACAO  = 'Pontuacao';
var ABA_RANKING    = 'Ranking';
var ABA_TURMAS     = 'Turmas';   // ← nova aba: fonte única de verdade
var ABA_TOKENS     = 'Tokens';   // ← licenças de acesso: 1 token = 1 resposta
var CAB_TOKENS     = ['codigo','cliente','status','gerado_em','usado_em','respondente_email'];
var ABA_EMPRESAS   = 'Empresas'; // ← login da empresa (view-only dos próprios tokens)
var CAB_EMPRESAS   = ['cliente','senha_hash','definido_em'];

// Segredo pra proteger geração/listagem de tokens (ações administrativas e
// financeiramente sensíveis — não podem ficar abertas como o resto do doGet
// ainda está). Configure em: Editor do Apps Script → ⚙️ Configurações do
// projeto → Propriedades do script → adicione ADMIN_SECRET com um valor
// forte. Sem essa propriedade definida, as duas ações ficam bloqueadas por
// padrão (fail-closed), não abertas.
var ADMIN_SECRET = PropertiesService.getScriptProperties().getProperty('ADMIN_SECRET') || '';

var CAB_RESPOSTAS = [
  'timestamp','nome','email','empresa','turma','fase',
  'disc_D','disc_I','disc_S','disc_C','disc_primario','disc_secundario',
  'disc_nat_D','disc_nat_I','disc_nat_S','disc_nat_C',
  'disc_mask_D','disc_mask_I','disc_mask_S','disc_mask_C',
  'elem_FOGO','elem_AR','elem_TERRA','elem_AGUA','elem_primario',
  'ennea_tipo','ennea_nome','ennea_score',
  'arquetipos','kolb_estilo',
  'need_1a','need_2a',
  'need_certeza','need_variedade','need_significancia',
  'need_conexao','need_crescimento','need_contribuicao',
  'holland_codigo','holland_tipo1','holland_tipo2','holland_tipo3',
  'holland_R','holland_I','holland_A','holland_S','holland_E','holland_C'
];
var TEXT_COLS_R = [1,2,3,4,5,6,11,12,19,20,21,22,25,26,27,28,29,30,31,32,39,40,41,42];

var CAB_PONTUACAO = [
  'respondente_key','nome','email','turma','empresa',
  'rodada','atv_id','atv_nome','pts','marcado','timestamp_lancamento'
];

var CAB_RANKING = [
  'timestamp','nome','email','turma','empresa','disc',
  'rodada','posicao','pontos','nivel'
];

// ── doGet ────────────────────────────────────────────────────────────────────
function doGet(e) {
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getRespostas';
    if (action === 'getPontuacoes') return out.setContent(JSON.stringify(sheetToJson(ABA_PONTUACAO)));
    if (action === 'getRanking')    return out.setContent(JSON.stringify(sheetToJson(ABA_RANKING)));
    if (action === 'getTurmas')     return out.setContent(JSON.stringify(doGetTurmas()));
    if (action === 'checkToken')    return out.setContent(JSON.stringify(doCheckToken(e.parameter.token)));
    if (action === 'getTokens')     return out.setContent(JSON.stringify(doListTokens(e.parameter.secret)));
    if (action === 'loginEmpresa')  return out.setContent(JSON.stringify(doLoginEmpresa(e.parameter.cliente, e.parameter.senha)));
    if (action === 'tokensEmpresa') return out.setContent(JSON.stringify(doTokensEmpresa(e.parameter.cliente, e.parameter.senha)));
    return out.setContent(JSON.stringify(sheetToJson(ABA_RESPOSTAS)));
  } catch(err) {
    return out.setContent(JSON.stringify({status:'error', message:err.toString()}));
  }
}

function sheetToJson(abaName) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(abaName);
  if (!sheet || sheet.getLastRow() <= 1) return {status:'ok', data:[], total:0};
  var headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  var rows    = sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues();
  var data = rows.map(function(row, idx) {
    var obj = {_id: idx};
    headers.forEach(function(h,i){ obj[h] = (row[i] !== null && row[i] !== undefined) ? String(row[i]) : ''; });
    return obj;
  });
  return {status:'ok', data:data, total:data.length};
}

// ── doPost ───────────────────────────────────────────────────────────────────
function doPost(e) {
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  if (!e || !e.postData || !e.postData.contents) {
    return out.setContent(JSON.stringify({status:'error', message:'Use HTTP POST. Para testes, chame testarInsercao().'}));
  }
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'savePontuacao') return out.setContent(JSON.stringify(doSavePontuacao(data)));
    if (data.action === 'saveRanking')   return out.setContent(JSON.stringify(doSaveRanking(data.rows)));
    if (data.action === 'saveTurmas')    return out.setContent(JSON.stringify(doSaveTurmas(data.turmas)));
    if (data.action === 'gerarTokens')   return out.setContent(JSON.stringify(doGerarTokens(data.cliente, data.quantidade, data.secret)));
    if (data.action === 'definirSenhaEmpresa') return out.setContent(JSON.stringify(doDefinirSenhaEmpresa(data.cliente, data.senha, data.secret)));
    return out.setContent(JSON.stringify(doSaveResposta(data)));
  } catch(err) {
    Logger.log('Erro doPost: ' + err.toString());
    return out.setContent(JSON.stringify({status:'error', message:err.toString()}));
  }
}

// ── Turmas — leitura ─────────────────────────────────────────────────────────
function doGetTurmas() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_TURMAS);
  if (!sheet || sheet.getLastRow() === 0) return {status:'ok', turmas:['Geral']};
  var vals = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues()
               .flat()
               .map(function(v){ return String(v).trim(); })
               .filter(function(v){ return v.length > 0; });
  if (!vals.length) return {status:'ok', turmas:['Geral']};
  return {status:'ok', turmas: vals};
}

// ── Turmas — escrita (admin) ──────────────────────────────────────────────────
function doSaveTurmas(turmas) {
  if (!Array.isArray(turmas) || !turmas.length) return {status:'error', message:'Lista de turmas vazia'};
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_TURMAS);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_TURMAS);
    var h = sheet.getRange(1,1,1,2);
    h.setValues([['turma','ativo']]);
    h.setFontWeight('bold');
    h.setBackground('#0A0806');
    h.setFontColor('#C9A84C');
    sheet.setFrozenRows(1);
  }
  // Limpa dados anteriores (preserva cabeçalho)
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  // Escreve nova lista
  var rows = turmas.map(function(t){ return [String(t).trim(), 'SIM']; });
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  sheet.getRange(2, 1, rows.length, 1).setNumberFormat('@');
  return {status:'ok', saved: rows.length};
}

// ── Tokens de licença ──────────────────────────────────────────────────────
function configurarAbaTokens() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_TOKENS);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_TOKENS);
    var h = sheet.getRange(1, 1, 1, CAB_TOKENS.length);
    h.setValues([CAB_TOKENS]);
    h.setFontWeight('bold'); h.setBackground('#0A0806'); h.setFontColor('#C9A84C');
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1000, 1).setNumberFormat('@'); // código sempre como texto
  }
  return sheet;
}

// Código sem caracteres ambíguos (0/O, 1/I/L) — mais fácil de digitar certo.
function gerarCodigoToken() {
  var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var s = '';
  for (var i = 0; i < 8; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s.slice(0, 4) + '-' + s.slice(4);
}

// Gera um lote de tokens pra um cliente. Ação administrativa — exige
// ADMIN_SECRET (ver comentário da constante lá em cima).
function doGerarTokens(cliente, quantidade, secret) {
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return {status: 'error', message: 'Não autorizado'};
  }
  quantidade = Number(quantidade);
  if (!cliente || !quantidade || quantidade < 1 || quantidade > 500) {
    return {status: 'error', message: 'Informe cliente e uma quantidade entre 1 e 500'};
  }
  var sheet = configurarAbaTokens();
  var existentes = {};
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(function(r) { existentes[r[0]] = true; });
  }
  var agora = new Date().toISOString();
  var codigos = [];
  var rows = [];
  for (var i = 0; i < quantidade; i++) {
    var codigo;
    do { codigo = gerarCodigoToken(); } while (existentes[codigo]);
    existentes[codigo] = true;
    codigos.push(codigo);
    rows.push([codigo, cliente, 'disponivel', agora, '', '']);
  }
  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, CAB_TOKENS.length).setValues(rows);
  sheet.getRange(startRow, 1, rows.length, 1).setNumberFormat('@');
  return {status: 'ok', cliente: cliente, gerados: codigos.length, codigos: codigos};
}

// Lista todos os tokens (pro painel admin acompanhar uso). Também exige
// ADMIN_SECRET — diferente do resto do doGet, essa lista não pode ficar
// aberta: vazar código não-usado equivale a dar licença de graça.
function doListTokens(secret) {
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return {status: 'error', message: 'Não autorizado'};
  }
  return sheetToJson(ABA_TOKENS);
}

// Checagem pública (sem segredo) — o respondente precisa poder validar o
// próprio código antes de começar. Não expõe nada além de válido/inválido.
function doCheckToken(codigo) {
  if (!codigo) return {status: 'ok', valido: false, message: 'Informe um token'};
  var achou = encontrarLinhaToken(codigo);
  if (!achou) return {status: 'ok', valido: false, message: 'Token não encontrado'};
  if (achou.status !== 'disponivel') return {status: 'ok', valido: false, message: 'Token já utilizado'};
  return {status: 'ok', valido: true};
}

// Busca a linha (1-indexed) de um código. Comparação normalizada
// (maiúsculas, sem espaço) pra tolerar digitação do respondente.
function encontrarLinhaToken(codigo) {
  if (!codigo) return null;
  var norm = String(codigo).trim().toUpperCase();
  var sheet = configurarAbaTokens();
  if (sheet.getLastRow() <= 1) return null;
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, CAB_TOKENS.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toUpperCase() === norm) {
      return {row: i + 2, codigo: vals[i][0], cliente: vals[i][1], status: vals[i][2]};
    }
  }
  return null;
}

// Marca o token como usado. Chamado de dentro do LockService em
// doSaveResposta — não chamar isso sozinho fora de um lock.
function consumirToken(codigo, email) {
  var achou = encontrarLinhaToken(codigo);
  if (!achou) return {ok: false, message: 'Token inválido'};
  if (achou.status !== 'disponivel') return {ok: false, message: 'Token já utilizado'};
  var sheet = configurarAbaTokens();
  sheet.getRange(achou.row, 3).setValue('usado');
  sheet.getRange(achou.row, 5).setValue(new Date().toISOString());
  sheet.getRange(achou.row, 6).setValue(email || '');
  return {ok: true};
}

// ── Login de empresa (view-only dos próprios tokens) ────────────────────────
function configurarAbaEmpresas() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_EMPRESAS);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_EMPRESAS);
    var h = sheet.getRange(1, 1, 1, CAB_EMPRESAS.length);
    h.setValues([CAB_EMPRESAS]);
    h.setFontWeight('bold'); h.setBackground('#0A0806'); h.setFontColor('#C9A84C');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Hash simples (SHA-256) — não guardamos senha em texto puro na planilha.
// Não é bcrypt/argon2 (Apps Script não tem), mas já evita que qualquer um
// que abra a planilha veja a senha direto.
function hashSenha(senha) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(senha));
  return bytes.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
}

function encontrarLinhaEmpresa(cliente) {
  if (!cliente) return null;
  var norm = String(cliente).trim().toLowerCase();
  var sheet = configurarAbaEmpresas();
  if (sheet.getLastRow() <= 1) return null;
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, CAB_EMPRESAS.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toLowerCase() === norm) {
      return {row: i + 2, cliente: vals[i][0], senha_hash: vals[i][1]};
    }
  }
  return null;
}

// Define/atualiza a senha de acesso de uma empresa. Ação de admin — exige
// ADMIN_SECRET, igual gerarTokens/getTokens.
function doDefinirSenhaEmpresa(cliente, senha, secret) {
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return {status: 'error', message: 'Não autorizado'};
  }
  if (!cliente || !senha || String(senha).length < 6) {
    return {status: 'error', message: 'Informe cliente e uma senha com pelo menos 6 caracteres'};
  }
  var sheet = configurarAbaEmpresas();
  var achou = encontrarLinhaEmpresa(cliente);
  var hash = hashSenha(senha);
  if (achou) {
    sheet.getRange(achou.row, 2).setValue(hash);
    sheet.getRange(achou.row, 3).setValue(new Date().toISOString());
  } else {
    sheet.appendRow([cliente, hash, new Date().toISOString()]);
  }
  return {status: 'ok', cliente: cliente};
}

// Login da empresa — retorna só válido/inválido, nenhum dado junto (evita
// vazar algo além do necessário mesmo numa resposta de "login ok").
function doLoginEmpresa(cliente, senha) {
  var achou = encontrarLinhaEmpresa(cliente);
  if (!achou) return {status: 'ok', valido: false, message: 'Empresa ou senha incorretos'};
  if (achou.senha_hash !== hashSenha(senha)) return {status: 'ok', valido: false, message: 'Empresa ou senha incorretos'};
  return {status: 'ok', valido: true};
}

// Tokens de UMA empresa — revalida login a cada chamada (nunca confia em
// "já logado" vindo só do navegador) e devolve só o que é daquele cliente.
function doTokensEmpresa(cliente, senha) {
  var login = doLoginEmpresa(cliente, senha);
  if (!login.valido) return {status: 'error', message: login.message || 'Não autorizado'};
  var todos = sheetToJson(ABA_TOKENS);
  var norm = String(cliente).trim().toLowerCase();
  var meus = (todos.data || []).filter(function(t) {
    return String(t.cliente).trim().toLowerCase() === norm;
  });
  // Não devolve o hash de ninguém, nem dados de outras empresas.
  return {status: 'ok', cliente: cliente, data: meus, total: meus.length};
}

// ── Salvar resposta do assessment ────────────────────────────────────────────
// Exige token de licença válido e ainda não usado. Consumo do token é
// protegido por LockService pra duas respostas não conseguirem gastar o
// mesmo código em paralelo (condição de corrida).
function doSaveResposta(d) {
  var lock = LockService.getScriptLock();
  var consumo;
  try {
    lock.waitLock(10000);
    consumo = consumirToken(d.token, d.email);
    if (!consumo.ok) {
      return {status: 'error', message: consumo.message};
    }
  } finally {
    lock.releaseLock();
  }

  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_RESPOSTAS);
  if (!sheet) { configurarAbas(); sheet = ss.getSheetByName(ABA_RESPOSTAS); }

  var linha = [
    d.timestamp || new Date().toISOString(),
    d.nome || '', d.email || '', d.empresa || '', d.turma || '', d.fase || '',
    Number(d.disc_D)||0, Number(d.disc_I)||0, Number(d.disc_S)||0, Number(d.disc_C)||0,
    d.disc_primario||'', d.disc_secundario||'',
    Number(d.disc_nat_D)||0, Number(d.disc_nat_I)||0, Number(d.disc_nat_S)||0, Number(d.disc_nat_C)||0,
    Number(d.disc_mask_D)||0, Number(d.disc_mask_I)||0, Number(d.disc_mask_S)||0, Number(d.disc_mask_C)||0,
    Number(d.elem_FOGO)||0, Number(d.elem_AR)||0, Number(d.elem_TERRA)||0, Number(d.elem_AGUA)||0,
    d.elem_primario||'',
    d.ennea_tipo||'', d.ennea_nome||'', d.ennea_score||'',
    d.arquetipos||'', d.kolb_estilo||'',
    d.need_1a||'', d.need_2a||'',
    d.need_certeza||'', d.need_variedade||'', d.need_significancia||'',
    d.need_conexao||'', d.need_crescimento||'', d.need_contribuicao||'',
    d.holland_codigo||'', d.holland_tipo1||'', d.holland_tipo2||'', d.holland_tipo3||'',
    Number(d.holland_R)||0, Number(d.holland_I)||0, Number(d.holland_A)||0,
    Number(d.holland_S)||0, Number(d.holland_E)||0, Number(d.holland_C)||0
  ];

  sheet.appendRow(linha);
  var lastRow = sheet.getLastRow();
  TEXT_COLS_R.forEach(function(col){ sheet.getRange(lastRow,col,1,1).setNumberFormat('@'); });
  if (lastRow % 2 === 0) sheet.getRange(lastRow,1,1,CAB_RESPOSTAS.length).setBackground('#F5F0E8');
  return {status:'ok', nome:d.nome, row:lastRow};
}

// ── Salvar pontuação (UPSERT por key+rodada+atv_id) ──────────────────────────
function doSavePontuacao(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_PONTUACAO);
  if (!sheet) { configurarAbas(); sheet = ss.getSheetByName(ABA_PONTUACAO); }

  var lancamentos = data.lancamentos || [];
  if (!lancamentos.length) return {status:'ok', saved:0};

  var ts      = new Date().toISOString();
  var allRows = sheet.getDataRange().getValues();
  var headers = allRows[0];
  var keyIdx  = headers.indexOf('respondente_key');
  var rodIdx  = headers.indexOf('rodada');
  var atvIdx  = headers.indexOf('atv_id');

  var toReplace = {};
  lancamentos.forEach(function(l){ toReplace[l.key+'|'+l.rodada+'|'+l.atv_id] = true; });

  for (var i = allRows.length - 1; i >= 1; i--) {
    var rk = allRows[i][keyIdx]+'|'+allRows[i][rodIdx]+'|'+allRows[i][atvIdx];
    if (toReplace[rk]) sheet.deleteRow(i+1);
  }

  var newRows = lancamentos.map(function(l) {
    return [l.key||'', l.nome||'', l.email||'', l.turma||'', l.empresa||'',
            l.rodada||'', l.atv_id||'', l.atv_nome||'', Number(l.pts)||0,
            (l.marcado===true||l.marcado==='true') ? 'SIM' : 'NAO', ts];
  });

  if (newRows.length) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
    [1,2,3,4,5,6,7,8,10,11].forEach(function(col){
      sheet.getRange(startRow, col, newRows.length, 1).setNumberFormat('@');
    });
  }

  return {status:'ok', saved:newRows.length};
}

// ── Salvar ranking ────────────────────────────────────────────────────────────
function doSaveRanking(rows) {
  if (!rows || !rows.length) return {status:'ok', saved:0};
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_RANKING);
  if (!sheet) { configurarAbas(); sheet = ss.getSheetByName(ABA_RANKING); }
  var ts   = new Date().toISOString();
  var data = rows.map(function(r){
    return [ts, r.nome||'', r.email||'', r.turma||'', r.empresa||'', r.disc||'',
            r.rodada||'', r.posicao||0, r.pontos||0, r.nivel||''];
  });
  var start = sheet.getLastRow()+1;
  sheet.getRange(start,1,data.length,data[0].length).setValues(data);
  [1,2,3,4,5,6,7,9].forEach(function(col){
    sheet.getRange(start,col,data.length,1).setNumberFormat('@');
  });
  return {status:'ok', saved:data.length};
}

// ── Configurar abas ───────────────────────────────────────────────────────────
function configurarAbas() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  function makeSheet(name, headers, textCols) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      var hr = sh.getRange(1,1,1,headers.length);
      hr.setFontWeight('bold'); hr.setBackground('#0A0806'); hr.setFontColor('#C9A84C');
      sh.setFrozenRows(1);
    }
    if (textCols) textCols.forEach(function(c){ sh.getRange(1,c,1000,1).setNumberFormat('@'); });
    return sh;
  }
  makeSheet(ABA_RESPOSTAS, CAB_RESPOSTAS, TEXT_COLS_R);
  makeSheet(ABA_PONTUACAO, CAB_PONTUACAO, null);
  makeSheet(ABA_RANKING,   CAB_RANKING,   null);
  // Cria aba Turmas com defaults mínimos se não existir
  if (!ss.getSheetByName(ABA_TURMAS)) doSaveTurmas(['Geral']);
  Logger.log('Abas configuradas: Respostas, Pontuacao, Ranking, Turmas');
}

// ── Testes (executar no editor) ───────────────────────────────────────────────
// Cria um token disponível direto na planilha (sem passar pelo segredo —
// só pra uso interno do editor do Apps Script, nunca é exposto via web).
function _criarTokenDeTeste() {
  var sheet = configurarAbaTokens();
  var codigo = gerarCodigoToken();
  sheet.appendRow([codigo, 'TESTE', 'disponivel', new Date().toISOString(), '', '']);
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat('@');
  return codigo;
}

function testarInsercao() {
  var token = _criarTokenDeTeste();
  var r = doSaveResposta({
    token: token,
    timestamp:new Date().toISOString(), nome:'TESTE — Apagar', email:'teste@il.com',
    empresa:'Instituto da Liderança', turma:'Geral', fase:'Pré-Treinamento',
    disc_D:6,disc_I:-12,disc_S:-4,disc_C:8, disc_primario:'D',disc_secundario:'C',
    disc_nat_D:12,disc_nat_I:18,disc_nat_S:8,disc_nat_C:5,
    disc_mask_D:18,disc_mask_I:6,disc_mask_S:4,disc_mask_C:13,
    elem_FOGO:12,elem_AR:8,elem_TERRA:4,elem_AGUA:3,elem_primario:'FOGO',
    ennea_tipo:'8',ennea_nome:'O Desafiador',ennea_score:'4.2',
    arquetipos:'Herói',kolb_estilo:'Convergente',
    need_1a:'Significância',need_2a:'Crescimento',
    need_certeza:'3.2',need_variedade:'4.0',need_significancia:'4.5',
    need_conexao:'3.0',need_crescimento:'4.2',need_contribuicao:'3.8',
    holland_codigo:'EIS',holland_tipo1:'Empreendedor',holland_tipo2:'Investigativo',holland_tipo3:'Social',
    holland_R:5,holland_I:8,holland_A:4,holland_S:7,holland_E:9,holland_C:6
  });
  Logger.log('Resposta: ' + JSON.stringify(r));
}

function testarPontuacao() {
  var r = doSavePontuacao({lancamentos:[
    {key:'teste@il.com',nome:'TESTE',email:'teste@il.com',turma:'Geral',empresa:'Instituto da Liderança',
     rodada:'1',atv_id:'a1',atv_nome:'Presença no encontro',pts:10,marcado:true},
    {key:'teste@il.com',nome:'TESTE',email:'teste@il.com',turma:'Geral',empresa:'Instituto da Liderança',
     rodada:'1',atv_id:'a2',atv_nome:'Missão da semana',pts:25,marcado:false}
  ]});
  Logger.log('Pontuação: ' + JSON.stringify(r));
}

function testarTurmas() {
  var salvo = doSaveTurmas(['Geral','Impact Leader · T1','Formação 2025']);
  Logger.log('Save turmas: ' + JSON.stringify(salvo));
  var lido = doGetTurmas();
  Logger.log('Get turmas: ' + JSON.stringify(lido));
}

function testarGetPontuacoes() {
  var r = sheetToJson(ABA_PONTUACAO);
  Logger.log('Pontuações: total=' + r.total);
}

function limparTeste() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  [ABA_RESPOSTAS,ABA_PONTUACAO,ABA_RANKING,ABA_TOKENS].forEach(function(n){
    var sh = ss.getSheetByName(n); if(!sh) return;
    var rows = sh.getDataRange().getValues();
    for(var i=rows.length-1;i>=1;i--){
      if(String(rows[i][0]).includes('TESTE')||String(rows[i][1]).includes('TESTE'))
        sh.deleteRow(i+1);
    }
  });
  Logger.log('Linhas de teste removidas');
}

function verEstatisticas() {
  Logger.log('Respostas: '  + sheetToJson(ABA_RESPOSTAS).total);
  Logger.log('Pontuacoes: ' + sheetToJson(ABA_PONTUACAO).total);
  Logger.log('Ranking: '    + sheetToJson(ABA_RANKING).total);
  Logger.log('Turmas: '     + JSON.stringify(doGetTurmas()));
  Logger.log('Tokens: '     + sheetToJson(ABA_TOKENS).total);
}

// Roda no editor do Apps Script pra testar o ciclo completo de token:
// gera, checa disponível, usa numa resposta, checa que ficou indisponível.
function testarTokens() {
  if (!ADMIN_SECRET) {
    Logger.log('Defina ADMIN_SECRET em Configurações do projeto → Propriedades do script antes de testar doGerarTokens/doListTokens.');
  } else {
    var lote = doGerarTokens('TESTE', 2, ADMIN_SECRET);
    Logger.log('Gerados: ' + JSON.stringify(lote));
    if (lote.codigos && lote.codigos[0]) {
      Logger.log('Check antes de usar: ' + JSON.stringify(doCheckToken(lote.codigos[0])));
      Logger.log('Consumo: ' + JSON.stringify(consumirToken(lote.codigos[0], 'teste@il.com')));
      Logger.log('Check depois de usar (deve ser inválido): ' + JSON.stringify(doCheckToken(lote.codigos[0])));
    }
  }
}
