// ═══════════════════════════════════════════════════════════════════════════
// APPS SCRIPT — Instituto da Liderança
// Planilha: Impact Leader - Avaliações do Líder
// ID: 1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho
// Versão: 2025.2 — suporta POST (gravar) e GET (ler dados para Admin/Painel)
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

// ── GET: retorna todos os dados como JSON (para Admin e Painel) ──────────────
function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

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
        obj[h] = row[i] !== undefined && row[i] !== null ? String(row[i]) : '';
      });
      return obj;
    });

    output.setContent(JSON.stringify({ status: 'ok', data: data, total: data.length }));
  } catch(err) {
    output.setContent(JSON.stringify({ status: 'error', message: err.toString(), data: [], total: 0 }));
  }

  return output;
}

// ── POST: grava nova resposta ────────────────────────────────────────────────
function doPost(e) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(ABA);
    if (!sheet) { configurarCabecalhos(); sheet = ss.getSheetByName(ABA); }

    var data = JSON.parse(e.postData.contents);

    // Handle ranking save action
    if (data.action === 'saveRanking') {
      return doSaveRanking(data.rows);
    }

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

    // Formatar linha — garantir que colunas de texto não sejam convertidas para número
    var lastRow = sheet.getLastRow();
    // Colunas de texto: nome(2), email(3), empresa(4), turma(5), fase(6),
    //                   disc_primario(11), disc_secundario(12), elem_primario(17),
    //                   ennea_nome(19), arquetipos(21), kolb_estilo(22), need_1a(23), need_2a(24),
    //                   holland_codigo(31), holland_tipo1(32), holland_tipo2(33), holland_tipo3(34)
    var textCols = [2,3,4,5,6,11,12,17,19,21,22,23,24,31,32,33,34];
    textCols.forEach(function(col) {
      sheet.getRange(lastRow, col, 1, 1).setNumberFormat('@');
    });

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

  // Forçar formato TEXTO nas colunas de string para evitar conversão automática
  // Colunas de texto (1-based): nome=2, email=3, empresa=4, turma=5, fase=6,
  // disc_primario=11, disc_secundario=12, elem_primario=17, ennea_tipo=18, ennea_nome=19,
  // ennea_score=20, arquetipos=21, kolb_estilo=22, need_1a=23, need_2a=24,
  // need_certeza=25, need_variedade=26, need_significancia=27, need_conexao=28,
  // need_crescimento=29, need_contribuicao=30,
  // holland_codigo=31, holland_tipo1=32, holland_tipo2=33, holland_tipo3=34
  var textCols = [2,3,4,5,6,11,12,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34];
  var lastRow  = Math.max(sheet.getLastRow(), 2);
  textCols.forEach(function(col) {
    // Aplicar na coluna inteira (linhas 1 a 1000)
    sheet.getRange(1, col, 1000, 1).setNumberFormat('@');
  });

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 180); // empresa
  sheet.setColumnWidth(5, 220);
  for (var i = 6; i <= CABECALHOS.length; i++) sheet.setColumnWidth(i, 110);

  Logger.log('✅ Cabeçalhos configurados: ' + CABECALHOS.length + ' colunas — colunas de texto formatadas como @');
}

// ── Salvar Ranking ───────────────────────────────────────────────────────────
function doSaveRanking(rows) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var aba   = 'Ranking';
    var sheet = ss.getSheetByName(aba);

    if (!sheet) {
      sheet = ss.insertSheet(aba);
      var headers = ['timestamp','nome','email','turma','disc','rodada','posicao','pontos','nivel'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      var hr = sheet.getRange(1, 1, 1, headers.length);
      hr.setFontWeight('bold');
      hr.setBackground('#0A0806');
      hr.setFontColor('#C9A84C');
      sheet.setFrozenRows(1);
    }

    if (!rows || !rows.length) {
      return ContentService.createTextOutput(JSON.stringify({status:'ok', saved:0}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = rows.map(function(r) {
      return [r.timestamp||'', r.nome||'', r.email||'', r.turma||'',
              r.disc||'', r.rodada||'', r.posicao||0, r.pontos||0, r.nivel||''];
    });

    sheet.getRange(sheet.getLastRow()+1, 1, data.length, data[0].length).setValues(data);

    // Format alternating rows
    var lastRow = sheet.getLastRow();
    for (var i = 2; i <= lastRow; i++) {
      if (i % 2 === 0) {
        sheet.getRange(i, 1, 1, 9).setBackground('#F5F0E8');
      }
    }

    return ContentService.createTextOutput(JSON.stringify({status:'ok', saved: data.length}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    Logger.log('Erro doSaveRanking: ' + err.toString());
    return ContentService.createTextOutput(JSON.stringify({status:'error', message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Ver Estatísticas ─────────────────────────────────────────────────────────
// ── Teste manual ─────────────────────────────────────────────────────────────
function testarInsercao() {
  var mock = {
    postData: { contents: JSON.stringify({
      timestamp: new Date().toISOString(),
      nome:'TESTE — Apagar', email:'teste@il.com', empresa:'Instituto da Liderança',
      turma:'Impact Leader · Turma 2025/1', fase:'Pré-Treinamento',
      disc_D:18, disc_I:12, disc_S:8, disc_C:5,
      disc_primario:'D', disc_secundario:'I',
      elem_FOGO:12, elem_AR:8, elem_TERRA:4, elem_AGUA:3, elem_primario:'FOGO',
      ennea_tipo:'8', ennea_nome:'O Desafiador', ennea_score:'4.20',
      arquetipos:'Herói', kolb_estilo:'Convergente',
      need_1a:'Significância', need_2a:'Crescimento',
      need_certeza:'3.2', need_variedade:'4.0', need_significancia:'4.5',
      need_conexao:'3.0', need_crescimento:'4.2', need_contribuicao:'3.8',
      holland_codigo:'EIS',
      holland_tipo1:'Empreendedor', holland_tipo2:'Investigativo', holland_tipo3:'Social',
      holland_R:5, holland_I:8, holland_A:4, holland_S:7, holland_E:9, holland_C:6,
    })}
  };
  var result = doPost(mock);
  Logger.log('POST resultado: ' + result.getContent());

  // Test GET
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
    Logger.log('Último respondente: ' + parsed.data[parsed.data.length-1].nome);
  }
}
