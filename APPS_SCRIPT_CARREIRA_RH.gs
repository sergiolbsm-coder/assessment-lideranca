/**
 * Apps Script dedicado ao "Diagnóstico de Carreira em RH" (carreira-rh.html).
 * Isolado do APPS_SCRIPT.gs de produção (assessment de liderança) — não mexe
 * na planilha nem no script existentes.
 *
 * PLANILHA DE DESTINO (já criada, com o cabeçalho abaixo já na linha 1):
 *   "IDL — Diagnóstico de Carreira em RH — Respostas"
 *   https://docs.google.com/spreadsheets/d/1whXi5K-NgPfsPJQ_mSUnWmt1F6OKWS-cSTvfogI1mRw/edit
 *
 * COMO IMPLANTAR (passo a passo manual — só o dono da conta consegue fazer):
 *   1. Abra a planilha acima.
 *   2. Menu Extensões → Apps Script.
 *   3. Apague o conteúdo padrão de Code.gs e cole este arquivo inteiro.
 *   4. Menu Implantar → Nova implantação.
 *   5. Tipo: "App da Web". Executar como: "Eu". Quem tem acesso: "Qualquer pessoa".
 *   6. Implantar → autorize as permissões pedidas → copie a URL que termina em /exec.
 *   7. Cole essa URL na constante SHEETS_URL de carreira-rh.html e publique de novo.
 */

const ABA_RESPOSTAS = 'Respostas';

const CAB_RESPOSTAS = [
  'timestamp','nome','email','momento_carreira','confianca',
  'disc_nat_D','disc_nat_I','disc_nat_S','disc_nat_C',
  'holland_R','holland_I','holland_A','holland_S','holland_E','holland_C',
  'top1','top1_combinado','top2','top2_combinado','top3','top3_combinado',
  'ranking_json'
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA_RESPOSTAS);
  if (!sh) {
    // A aba padrão da planilha já nasceu com o cabeçalho (criada via upload de
    // CSV) — se o nome dela não for exatamente "Respostas", usamos a primeira aba.
    sh = ss.getSheets()[0];
    sh.setName(ABA_RESPOSTAS);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(CAB_RESPOSTAS);
  }
  return sh;
}

function doGet(e) {
  try {
    const sh = getSheet_();
    const data = sh.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', respostas: rows }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'erro', mensagem: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sh = getSheet_();
    const linha = CAB_RESPOSTAS.map(col => data[col] !== undefined ? data[col] : '');
    sh.appendRow(linha);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'erro', mensagem: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
