// ═══════════════════════════════════════════════════════════════════════════
// APPS SCRIPT — Instituto da Liderança
// Planilha: 1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho
// ═══════════════════════════════════════════════════════════════════════════

var SHEET_ID = '1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho';
var ABA      = 'Respostas';

var CABECALHOS = [
  'timestamp','nome','email','empresa','turma','fase',
  'disc_D','disc_I','disc_S','disc_C','disc_primario','disc_secundario',
  'elem_FOGO','elem_AR','elem_TERRA','elem_AGUA','elem_primario',
  'ennea_tipo','ennea_nome','ennea_score',
  'arquetipos','kolb_estilo',
  'need_1a','need_2a',
  'need_certeza','need_variedade','need_significancia',
  'need_conexao','need_crescimento','need_contribuicao',
  'holland_codigo','holland_tipo1','holland_tipo2','holland_tipo3',
  'holland_R','holland_I','holland_A','holland_S','holland_E','holland_C'
];

// Colunas que devem ser salvas como TEXTO (1-based index)
var TEXT_COLS = [1,2,3,4,5,6,11,12,17,18,19,20,21,22,23,24,31,32,33,34];

// ── GET: retorna todos os dados como JSON ────────────────────────────────────
function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  // doGet pode ser chamado sem parâmetros no editor — proteger
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(ABA);

    if (!sheet || sheet.getLastRow() <= 1) {
      output.setContent(JSON.stringify({ status: 'ok', data: [], total: 0 }));
      return output;
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var rows    = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    var data = rows.map(function(row, idx) {
      var obj = { _id: idx };
      headers.forEach(function(h, i) {
        obj[h] = (row[i] !== undefined && row[i] !== null) ? String(row[i]) : '';
      });
      return obj;
    });

    output.setContent(JSON.stringify({ status: 'ok', data: data, total: data.length }));
  } catch(err) {
    output.setContent(JSON.stringify({ status: 'error', message: err.toString(), data: [], total: 0 }));
  }

  return output;
}

// ── POST: grava nova resposta ou salva ranking ───────────────────────────────
function doPost(e) {
  // Proteger contra execução manual no editor (sem evento HTTP)
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: 'Esta função deve ser chamada via HTTP POST, não manualmente.' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var data = JSON.parse(e.postData.contents);

    // Roteamento por action
    if (data.action === 'saveRanking') {
      return doSaveRanking(data.rows);
    }

    // Gravar resposta do assessment
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(ABA);
    if (!sheet) { configurarCabecalhos(); sheet = ss.getSheetByName(ABA); }

    var linha = [
      data.timestamp           || new Date().toISOString(),
      data.nome                || '',
      data.email               || '',
      data.empresa             || '',
      data.turma               || '',
      data.fase                || '',
      Number(data.disc_D)      || 0,
      Number(data.disc_I)      || 0,
      Number(data.disc_S)      || 0,
      Number(data.disc_C)      || 0,
      data.disc_primario       || '',
      data.disc_secundario     || '',
      Number(data.elem_FOGO)   || 0,
      Number(data.elem_AR)     || 0,
      Number(data.elem_TERRA)  || 0,
      Number(data.elem_AGUA)   || 0,
      data.elem_primario       || '',
      data.ennea_tipo          || '',
      data.ennea_nome          || '',
      data.ennea_score         || '',
      data.arquetipos          || '',
      data.kolb_estilo         || '',
      data.need_1a             || '',
      data.need_2a             || '',
      data.need_certeza        || '',
      data.need_variedade      || '',
      data.need_significancia  || '',
      data.need_conexao        || '',
      data.need_crescimento    || '',
      data.need_contribuicao   || '',
      data.holland_codigo      || '',
      data.holland_tipo1       || '',
      data.holland_tipo2       || '',
      data.holland_tipo3       || '',
      Number(data.holland_R)   || 0,
      Number(data.holland_I)   || 0,
      Number(data.holland_A)   || 0,
      Number(data.holland_S)   || 0,
      Number(data.holland_E)   || 0,
      Number(data.holland_C)   || 0,
    ];

    sheet.appendRow(linha);

    // Forçar formato TEXTO nas colunas string da linha recém-gravada
    var lastRow = sheet.getLastRow();
    TEXT_COLS.forEach(function(col) {
      sheet.getRange(lastRow, col, 1, 1).setNumberFormat('@');
    });

    // Zebra alternada
    if (lastRow % 2 === 0) {
      sheet.getRange(lastRow, 1, 1, CABECALHOS.length).setBackground('#F5F0E8');
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', nome: data.nome, row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    Logger.log('Erro doPost: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Salvar Ranking ───────────────────────────────────────────────────────────
function doSaveRanking(rows) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var abaRank = 'Ranking';
    var sheet = ss.getSheetByName(abaRank);

    if (!sheet) {
      sheet = ss.insertSheet(abaRank);
      var headers = ['timestamp','nome','email','turma','disc','rodada','posicao','pontos','nivel'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      var hr = sheet.getRange(1, 1, 1, headers.length);
      hr.setFontWeight('bold');
      hr.setBackground('#0A0806');
      hr.setFontColor('#C9A84C');
      sheet.setFrozenRows(1);
      // Forçar texto em todas as colunas da aba Ranking
      sheet.getRange(1, 1, 1000, headers.length).setNumberFormat('@');
    }

    if (!rows || !rows.length) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', saved: 0 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = rows.map(function(r) {
      return [
        r.timestamp || '',
        r.nome      || '',
        r.email     || '',
        r.turma     || '',
        r.disc      || '',
        r.rodada    || '',
        r.posicao   || 0,
        r.pontos    || 0,
        r.nivel     || ''
      ];
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', saved: data.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    Logger.log('Erro doSaveRanking: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Configurar cabeçalhos ────────────────────────────────────────────────────
function configurarCabecalhos() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA);
  if (!sheet) sheet = ss.insertSheet(ABA);

  sheet.getRange(1, 1, 1, CABECALHOS.length).setValues([CABECALHOS]);

  var hr = sheet.getRange(1, 1, 1, CABECALHOS.length);
  hr.setFontWeight('bold');
  hr.setBackground('#0A0806');
  hr.setFontColor('#C9A84C');
  hr.setFontFamily('Arial');
  hr.setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  // Forçar formato TEXTO nas colunas de string (evita conversão automática do Sheets)
  TEXT_COLS.forEach(function(col) {
    sheet.getRange(1, col, 1000, 1).setNumberFormat('@');
  });

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 200); // empresa
  sheet.setColumnWidth(5, 220); // turma
  for (var i = 6; i <= CABECALHOS.length; i++) sheet.setColumnWidth(i, 110);

  Logger.log('✅ Cabeçalhos configurados: ' + CABECALHOS.length + ' colunas — texto formatado como @');
}

// ── Funções de teste (executar manualmente no editor) ────────────────────────
function testarInsercao() {
  // Simula um POST com dados de teste
  var mockEvent = {
    postData: {
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        nome: 'TESTE — Apagar',
        email: 'teste@il.com',
        empresa: 'Instituto da Liderança',
        turma: 'Geral',
        fase: 'Pré-Treinamento',
        disc_D: 18, disc_I: 12, disc_S: 8, disc_C: 5,
        disc_primario: 'D', disc_secundario: 'I',
        elem_FOGO: 12, elem_AR: 8, elem_TERRA: 4, elem_AGUA: 3,
        elem_primario: 'FOGO',
        ennea_tipo: '8', ennea_nome: 'O Desafiador', ennea_score: '4.20',
        arquetipos: 'Herói', kolb_estilo: 'Convergente',
        need_1a: 'Significância', need_2a: 'Crescimento',
        need_certeza: '3.2', need_variedade: '4.0', need_significancia: '4.5',
        need_conexao: '3.0', need_crescimento: '4.2', need_contribuicao: '3.8',
        holland_codigo: 'EIS',
        holland_tipo1: 'Empreendedor', holland_tipo2: 'Investigativo', holland_tipo3: 'Social',
        holland_R: 5, holland_I: 8, holland_A: 4, holland_S: 7, holland_E: 9, holland_C: 6,
      })
    }
  };
  var result = doPost(mockEvent);
  Logger.log('POST resultado: ' + result.getContent());

  // Testar GET
  var getResult = doGet({});
  var parsed = JSON.parse(getResult.getContent());
  Logger.log('GET resultado: total=' + parsed.total + ' registros');
}

function limparTeste() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA);
  if (!sheet) return;
  var dados = sheet.getDataRange().getValues();
  for (var i = dados.length - 1; i >= 1; i--) {
    if (String(dados[i][1]).includes('TESTE')) sheet.deleteRow(i + 1);
  }
  Logger.log('Linhas de teste removidas.');
}

function verEstatisticas() {
  var getResult = doGet({});
  var parsed = JSON.parse(getResult.getContent());
  Logger.log('Total de respostas: ' + parsed.total);
  if (parsed.data.length > 0) {
    Logger.log('Último respondente: ' + parsed.data[parsed.data.length - 1].nome);
    Logger.log('Empresa: ' + parsed.data[parsed.data.length - 1].empresa);
  }
}
