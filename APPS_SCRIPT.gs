// ═══════════════════════════════════════════════════════════════════════════
// APPS SCRIPT — Instituto da Liderança
// Planilha: Impact Leader - Avaliações do Líder
// ID: 1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho
// Versão: 2025 — inclui email, empresa e Holland RIASEC
// ═══════════════════════════════════════════════════════════════════════════
//
// COMO INSTALAR:
// 1. Abra: https://docs.google.com/spreadsheets/d/1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho
// 2. Extensões → Apps Script
// 3. Apague todo o código existente
// 4. Cole este arquivo inteiro
// 5. Clique em 💾 Salvar
// 6. Execute: configurarCabecalhos()  — cria a aba com todos os cabeçalhos
// 7. Execute: testarInsercao()        — insere linha de teste
// 8. Execute: limparTeste()           — remove a linha de teste
// 9. Implantar → Nova implantação → Aplicativo da Web
//    - Executar como: Eu
//    - Acesso: Qualquer pessoa
// 10. Copie a URL gerada
// 11. No Admin (admin.html) → Configuração → cole a URL do Apps Script
// ═══════════════════════════════════════════════════════════════════════════

var SHEET_ID = '1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho';
var ABA      = 'Respostas';

// ── Ordem exata das colunas na planilha ─────────────────────────────────────
var CABECALHOS = [
  // Identificação
  'timestamp', 'nome', 'email', 'empresa', 'turma', 'fase',
  // DISC
  'disc_D', 'disc_I', 'disc_S', 'disc_C',
  'disc_primario', 'disc_secundario',
  // Temperamento — Elementos
  'elem_FOGO', 'elem_AR', 'elem_TERRA', 'elem_AGUA', 'elem_primario',
  // Eneagrama
  'ennea_tipo', 'ennea_nome', 'ennea_score',
  // Arquétipos
  'arquetipos',
  // Kolb
  'kolb_estilo',
  // 6 Necessidades
  'need_1a', 'need_2a',
  'need_certeza', 'need_variedade', 'need_significancia',
  'need_conexao', 'need_crescimento', 'need_contribuicao',
  // Holland RIASEC
  'holland_codigo',
  'holland_tipo1', 'holland_tipo2', 'holland_tipo3',
  'holland_R', 'holland_I', 'holland_A',
  'holland_S', 'holland_E', 'holland_C'
];

// ── 1. CONFIGURAR CABEÇALHOS ────────────────────────────────────────────────
function configurarCabecalhos() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA);

  if (!sheet) {
    sheet = ss.insertSheet(ABA);
    Logger.log('✅ Aba "' + ABA + '" criada.');
  }

  // Cabeçalhos na linha 1
  sheet.getRange(1, 1, 1, CABECALHOS.length).setValues([CABECALHOS]);

  // Formatação visual
  var headerRange = sheet.getRange(1, 1, 1, CABECALHOS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0A0806');
  headerRange.setFontColor('#C9A84C');
  headerRange.setFontFamily('Arial');
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2); // congela timestamp + nome

  // Larguras das colunas
  sheet.setColumnWidth(1, 180); // timestamp
  sheet.setColumnWidth(2, 200); // nome
  sheet.setColumnWidth(3, 200); // email
  sheet.setColumnWidth(4, 180); // empresa
  sheet.setColumnWidth(5, 220); // turma
  sheet.setColumnWidth(6, 140); // fase
  for (var i = 7; i <= CABECALHOS.length; i++) sheet.setColumnWidth(i, 110);

  // Proteger a linha de cabeçalho
  try {
    var protection = headerRange.protect().setDescription('Cabeçalhos — não editar');
    protection.setWarningOnly(true);
  } catch(e) {}

  Logger.log('✅ Cabeçalhos configurados — ' + CABECALHOS.length + ' colunas');
  Logger.log('Planilha: https://docs.google.com/spreadsheets/d/' + SHEET_ID);
}

// ── 2. RECEBER DADOS DO ASSESSMENT ─────────────────────────────────────────
function doPost(e) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(ABA);
    if (!sheet) { configurarCabecalhos(); sheet = ss.getSheetByName(ABA); }

    var data = JSON.parse(e.postData.contents);

    var linha = [
      // Identificação
      data.timestamp            || new Date().toISOString(),
      data.nome                 || '',
      data.email                || '',
      data.empresa              || '',
      data.turma                || '',
      data.fase                 || '',
      // DISC
      Number(data.disc_D)       || 0,
      Number(data.disc_I)       || 0,
      Number(data.disc_S)       || 0,
      Number(data.disc_C)       || 0,
      data.disc_primario        || '',
      data.disc_secundario      || '',
      // Temperamento
      Number(data.elem_FOGO)    || 0,
      Number(data.elem_AR)      || 0,
      Number(data.elem_TERRA)   || 0,
      Number(data.elem_AGUA)    || 0,
      data.elem_primario        || '',
      // Eneagrama
      data.ennea_tipo           || '',
      data.ennea_nome           || '',
      data.ennea_score          || '',
      // Arquétipos
      data.arquetipos           || '',
      // Kolb
      data.kolb_estilo          || '',
      // 6 Necessidades
      data.need_1a              || '',
      data.need_2a              || '',
      data.need_certeza         || '',
      data.need_variedade       || '',
      data.need_significancia   || '',
      data.need_conexao         || '',
      data.need_crescimento     || '',
      data.need_contribuicao    || '',
      // Holland
      data.holland_codigo       || '',
      data.holland_tipo1        || '',
      data.holland_tipo2        || '',
      data.holland_tipo3        || '',
      Number(data.holland_R)    || 0,
      Number(data.holland_I)    || 0,
      Number(data.holland_A)    || 0,
      Number(data.holland_S)    || 0,
      Number(data.holland_E)    || 0,
      Number(data.holland_C)    || 0,
    ];

    sheet.appendRow(linha);

    // Formatar a nova linha
    var lastRow = sheet.getLastRow();
    var range   = sheet.getRange(lastRow, 1, 1, CABECALHOS.length);
    // Cor alternada
    if (lastRow % 2 === 0) {
      range.setBackground('#F5F0E8');
    }

    Logger.log('✅ Resposta salva — ' + data.nome + ' | ' + data.turma);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', nome: data.nome }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('❌ Erro: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── 3. TESTE MANUAL ─────────────────────────────────────────────────────────
function testarInsercao() {
  var mock = {
    postData: {
      contents: JSON.stringify({
        timestamp:          new Date().toISOString(),
        nome:               'TESTE — Apagar',
        email:              'teste@institutodaideranca.com',
        empresa:            'Instituto da Liderança',
        turma:              'Impact Leader · Turma 2025/1',
        fase:               'Pré-Treinamento',
        disc_D:             18, disc_I: 12, disc_S: 8, disc_C: 5,
        disc_primario:      'D', disc_secundario: 'I',
        elem_FOGO:          12, elem_AR: 8, elem_TERRA: 4, elem_AGUA: 3,
        elem_primario:      'FOGO',
        ennea_tipo:         '8', ennea_nome: 'O Desafiador', ennea_score: '4.20',
        arquetipos:         'Herói',
        kolb_estilo:        'Convergente',
        need_1a:            'Significância', need_2a: 'Crescimento',
        need_certeza:       '3.2', need_variedade: '4.0',
        need_significancia: '4.5', need_conexao: '3.0',
        need_crescimento:   '4.2', need_contribuicao: '3.8',
        holland_codigo:     'EIS',
        holland_tipo1:      'Empreendedor', holland_tipo2: 'Investigativo', holland_tipo3: 'Social',
        holland_R: 5, holland_I: 8, holland_A: 4, holland_S: 7, holland_E: 9, holland_C: 6,
      })
    }
  };
  var result = doPost(mock);
  Logger.log('Resultado: ' + result.getContent());
}

// ── 4. LIMPAR LINHAS DE TESTE ───────────────────────────────────────────────
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

// ── 5. ESTATÍSTICAS RÁPIDAS ─────────────────────────────────────────────────
function verEstatisticas() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA);
  if (!sheet) { Logger.log('Aba não encontrada.'); return; }
  var dados = sheet.getDataRange().getValues();
  var total = dados.length - 1;
  Logger.log('══════════════════════════════════════');
  Logger.log('ASSESSMENT — Instituto da Liderança');
  Logger.log('Total de respostas: ' + total);
  if (!total) return;
  var disc = { D: 0, I: 0, S: 0, C: 0 };
  var elem = { FOGO: 0, AR: 0, TERRA: 0, AGUA: 0 };
  for (var i = 1; i <= total; i++) {
    var d = dados[i][10]; // disc_primario (col 11, index 10)
    if (disc[d] !== undefined) disc[d]++;
    var el = dados[i][16]; // elem_primario (col 17, index 16)
    if (elem[el] !== undefined) elem[el]++;
  }
  Logger.log('DISC — D:' + disc.D + ' I:' + disc.I + ' S:' + disc.S + ' C:' + disc.C);
  Logger.log('Elementos — FOGO:' + elem.FOGO + ' AR:' + elem.AR + ' TERRA:' + elem.TERRA + ' AGUA:' + elem.AGUA);
  Logger.log('══════════════════════════════════════');
}
