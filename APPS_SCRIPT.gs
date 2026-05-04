// ══════════════════════════════════════════════════════════════════════════
// APPS SCRIPT — Instituto da Liderança
// Planilha: Impact Leader - Avaliações do Líder
// ID: 1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho
// ══════════════════════════════════════════════════════════════════════════
//
// INSTRUÇÕES:
// 1. Abra a planilha: https://docs.google.com/spreadsheets/d/1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho
// 2. Clique em: Extensões → Apps Script
// 3. Apague todo o código existente
// 4. Cole TODO este arquivo
// 5. Clique em 💾 Salvar
// 6. Execute a função "configurarCabecalhos" uma vez para criar os cabeçalhos
// 7. Implante como Web App (Implantar → Nova implantação → Aplicativo da Web)
//    - Executar como: Eu
//    - Acesso: Qualquer pessoa
// 8. Copie a URL gerada e cole no arquivo index.html na linha:
//    const SHEETS_URL = 'COLE_A_URL_AQUI';
// ══════════════════════════════════════════════════════════════════════════

var SHEET_ID = '1C8kfRIjc3caRCfCkIgFToudZJD6Ch_-_36JBW9Mr7ho';
var ABA_NOME = 'Respostas'; // Nome da aba que será criada/usada

// ── CABEÇALHOS (ordem das colunas na planilha) ────────────────────────────
var CABECALHOS = [
  'timestamp',
  'nome',
  'turma',
  'fase',
  // DISC
  'disc_D',
  'disc_I',
  'disc_S',
  'disc_C',
  'disc_primario',
  'disc_secundario',
  // Elementos
  'elem_FOGO',
  'elem_AR',
  'elem_TERRA',
  'elem_AGUA',
  'elem_primario',
  // Eneagrama
  'ennea_tipo',
  'ennea_nome',
  'ennea_score',
  // Arquétipo
  'arquetipos',
  // Kolb
  'kolb_estilo',
  // 6 Necessidades
  'need_1a',
  'need_2a',
  'need_certeza',
  'need_variedade',
  'need_significancia',
  'need_conexao',
  'need_crescimento',
  'need_contribuicao',
  // Temperamento
  'temperamento',
  // Roland
  'roland_estagio',
  'roland_nome'
];

// ── CONFIGURAR CABEÇALHOS (executar uma vez) ──────────────────────────────
function configurarCabecalhos() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_NOME);

  // Criar a aba se não existir
  if (!sheet) {
    sheet = ss.insertSheet(ABA_NOME);
    Logger.log('Aba "' + ABA_NOME + '" criada.');
  }

  // Inserir cabeçalhos na linha 1
  sheet.getRange(1, 1, 1, CABECALHOS.length).setValues([CABECALHOS]);

  // Formatar cabeçalhos
  var headerRange = sheet.getRange(1, 1, 1, CABECALHOS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#0A0806');
  headerRange.setFontColor('#C9A84C');
  headerRange.setFontFamily('Arial');

  // Congelar linha de cabeçalho
  sheet.setFrozenRows(1);

  // Ajustar largura das colunas
  sheet.setColumnWidth(1, 180); // timestamp
  sheet.setColumnWidth(2, 200); // nome
  sheet.setColumnWidth(3, 220); // turma
  for (var i = 4; i <= CABECALHOS.length; i++) {
    sheet.setColumnWidth(i, 120);
  }

  Logger.log('✅ Cabeçalhos configurados com sucesso!');
  Logger.log('Total de colunas: ' + CABECALHOS.length);
}

// ── RECEBER DADOS DO ASSESSMENT (chamado automaticamente) ─────────────────
function doPost(e) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(ABA_NOME);

    // Criar aba se não existir (segurança)
    if (!sheet) {
      configurarCabecalhos();
      sheet = ss.getSheetByName(ABA_NOME);
    }

    // Parsear dados recebidos
    var data = JSON.parse(e.postData.contents);

    // Montar linha na mesma ordem dos cabeçalhos
    var linha = [
      data.timestamp            || new Date().toISOString(),
      data.nome                 || '',
      data.turma                || '',
      data.fase                 || '',
      // DISC
      Number(data.disc_D)       || 0,
      Number(data.disc_I)       || 0,
      Number(data.disc_S)       || 0,
      Number(data.disc_C)       || 0,
      data.disc_primario        || '',
      data.disc_secundario      || '',
      // Elementos
      Number(data.elem_FOGO)    || 0,
      Number(data.elem_AR)      || 0,
      Number(data.elem_TERRA)   || 0,
      Number(data.elem_AGUA)    || 0,
      data.elem_primario        || '',
      // Eneagrama
      data.ennea_tipo           || '',
      data.ennea_nome           || '',
      data.ennea_score          || '',
      // Arquétipo
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
      // Temperamento
      data.temperamento         || '',
      // Roland
      data.roland_estagio       || '',
      data.roland_nome          || ''
    ];

    // Adicionar linha na planilha
    sheet.appendRow(linha);

    // Log para debug
    Logger.log('✅ Resposta salva: ' + data.nome + ' — ' + data.turma);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'ok',
        message: 'Resposta salva com sucesso',
        nome: data.nome
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('❌ Erro: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── TESTE MANUAL ──────────────────────────────────────────────────────────
// Execute esta função no editor para inserir uma linha de teste
function testarInsercao() {
  var dadosTeste = {
    timestamp:          new Date().toISOString(),
    nome:               'Teste Silva — APAGAR',
    turma:              'Impact Leader · Turma 2025/1',
    fase:               'Pré-Treinamento',
    disc_D:             18,
    disc_I:             12,
    disc_S:             8,
    disc_C:             5,
    disc_primario:      'D',
    disc_secundario:    'I',
    elem_FOGO:          12,
    elem_AR:            8,
    elem_TERRA:         4,
    elem_AGUA:          3,
    elem_primario:      'FOGO',
    ennea_tipo:         '8',
    ennea_nome:         'O Desafiador',
    ennea_score:        '4.20',
    arquetipos:         'Herói',
    kolb_estilo:        'Convergente',
    need_1a:            'Significância',
    need_2a:            'Crescimento',
    need_certeza:       '3.2',
    need_variedade:     '4.0',
    need_significancia: '4.5',
    need_conexao:       '3.0',
    need_crescimento:   '4.2',
    need_contribuicao:  '3.8',
    temperamento:       'Colérico',
    roland_estagio:     '3',
    roland_nome:        'Independência'
  };

  var mock = { postData: { contents: JSON.stringify(dadosTeste) } };
  var result = doPost(mock);
  Logger.log('Resultado: ' + result.getContent());
}

// ── LIMPAR TESTES ─────────────────────────────────────────────────────────
// Execute para apagar todas as linhas de teste
function limparLinhasTeste() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_NOME);
  if (!sheet) return;

  var dados = sheet.getDataRange().getValues();
  for (var i = dados.length - 1; i >= 1; i--) {
    if ((dados[i][1] || '').toString().includes('APAGAR')) {
      sheet.deleteRow(i + 1);
    }
  }
  Logger.log('Linhas de teste removidas.');
}

// ── ESTATÍSTICAS RÁPIDAS ──────────────────────────────────────────────────
// Execute para ver um resumo no Log
function verEstatisticas() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(ABA_NOME);
  if (!sheet) { Logger.log('Aba não encontrada.'); return; }

  var dados = sheet.getDataRange().getValues();
  var total = dados.length - 1; // desconta cabeçalho

  Logger.log('══════════════════════════════');
  Logger.log('ESTATÍSTICAS — Assessment IL');
  Logger.log('Total de respostas: ' + total);

  if (total === 0) { Logger.log('Sem respostas ainda.'); return; }

  // Contar DISC
  var disc = { D: 0, I: 0, S: 0, C: 0 };
  for (var i = 1; i <= total; i++) {
    var d = dados[i][8]; // coluna disc_primario (índice 8)
    if (disc[d] !== undefined) disc[d]++;
  }
  Logger.log('DISC: D=' + disc.D + ' I=' + disc.I + ' S=' + disc.S + ' C=' + disc.C);
  Logger.log('══════════════════════════════');
}
