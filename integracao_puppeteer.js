/**
 * Script de integração para substituir html2pdf por Puppeteer
 * Adicione este código ao seu admin.html para usar o PDF Server
 */

// Configuração do servidor PDF
const PDF_SERVER_URL = 'http://localhost:3001'; // Alterar conforme necessário

/**
 * Função para exportar o relatório 360 usando Puppeteer
 * Substitui a função exportRelatorioComPDF anterior
 */
async function exportRelatorioComPDF() {
  try {
    // Verificar se o servidor está disponível
    const healthCheck = await fetch(`${PDF_SERVER_URL}/health`).catch(() => null);
    if (!healthCheck || !healthCheck.ok) {
      alert('❌ Servidor PDF não está disponível.\n\nCertifique-se de que o PDF Server está rodando em ' + PDF_SERVER_URL);
      return;
    }

    // Obter o overlay e o conteúdo
    const overlay = document.getElementById('overlay');
    if (!overlay) {
      alert('Overlay não encontrado');
      return;
    }

    // Mostrar loading
    const btn = document.getElementById('ov-pdf-btn');
    const controls = document.getElementById('ov-controls');
    btn.textContent = '⏳ Gerando PDF...';
    btn.disabled = true;
    controls.style.display = 'none';

    // Obter o HTML do relatório
    const pageEl = overlay.querySelector('.page');
    const htmlContent = pageEl ? pageEl.innerHTML : overlay.innerHTML;

    // Obter o nome do relatório para o filename
    const nomeRelatorio = document.querySelector('[data-relatorio-nome]')?.textContent || 'Relatorio-360';
    const filename = `${nomeRelatorio}-${new Date().toISOString().split('T')[0]}.pdf`;

    // Preparar o HTML completo com estilos
    const reportStyles = document.querySelector('style[data-report-styles]')?.textContent || '';
    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${nomeRelatorio}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Syne', sans-serif;
            background: #FFFFFF;
            color: #0A0806;
            line-height: 1.6;
          }
          
          @page {
            margin: 10mm;
            size: A4;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            
            .section {
              page-break-inside: avoid;
              break-inside: avoid;
              overflow: visible;
              margin-bottom: 0;
            }
            
            .section-body {
              overflow: visible;
            }
            
            .card, .grid-2, .grid-3, table {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            h3 {
              page-break-after: avoid;
              break-after: avoid;
            }
            
            .insight-box {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            tr, td {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
          
          ${reportStyles}
        </style>
      </head>
      <body>
        <div style="width: 780px; padding: 20px 18px; box-sizing: border-box; background: #fff; margin: 0 auto;">
          ${htmlContent}
        </div>
      </body>
      </html>
    `;

    // Enviar para o servidor PDF
    const response = await fetch(`${PDF_SERVER_URL}/api/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: fullHTML,
        filename: filename,
        options: {
          format: 'A4',
          margin: {
            top: '10mm',
            bottom: '10mm',
            left: '10mm',
            right: '10mm'
          },
          printBackground: true,
          preferCSSPageSize: true
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao gerar PDF');
    }

    // Fazer download do PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // Restaurar UI
    controls.style.display = 'flex';
    btn.textContent = '📄 Exportar PDF';
    btn.disabled = false;

    toast('✅ PDF gerado com sucesso', 'success');
    console.log(`✅ PDF gerado: ${filename}`);

  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    
    const btn = document.getElementById('ov-pdf-btn');
    const controls = document.getElementById('ov-controls');
    controls.style.display = 'flex';
    btn.textContent = '📄 Exportar PDF';
    btn.disabled = false;

    toast('❌ Erro ao gerar PDF: ' + error.message, 'error');
  }
}

/**
 * Função para exportar um instrumento específico
 * @param {string} instrumentoId - ID do elemento do instrumento
 * @param {string} instrumentoNome - Nome do instrumento para o filename
 */
async function exportarInstrumento(instrumentoId, instrumentoNome) {
  try {
    const healthCheck = await fetch(`${PDF_SERVER_URL}/health`).catch(() => null);
    if (!healthCheck || !healthCheck.ok) {
      alert('❌ Servidor PDF não está disponível');
      return;
    }

    const elemento = document.getElementById(instrumentoId);
    if (!elemento) {
      alert(`Instrumento ${instrumentoId} não encontrado`);
      return;
    }

    // Mostrar loading
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Gerando...';
    btn.disabled = true;

    // Preparar HTML
    const reportStyles = document.querySelector('style[data-report-styles]')?.textContent || '';
    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${instrumentoNome}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Syne', sans-serif; background: #FFFFFF; }
          @page { margin: 10mm; size: A4; }
          ${reportStyles}
        </style>
      </head>
      <body>
        <div style="width: 780px; padding: 20px; box-sizing: border-box;">
          ${elemento.outerHTML}
        </div>
      </body>
      </html>
    `;

    // Gerar PDF
    const response = await fetch(`${PDF_SERVER_URL}/api/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: fullHTML,
        filename: `Relatorio-360-${instrumentoNome}.pdf`,
        options: {
          format: 'A4',
          margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
          printBackground: true
        }
      })
    });

    if (!response.ok) throw new Error('Erro ao gerar PDF');

    // Download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio-360-${instrumentoNome}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    btn.textContent = originalText;
    btn.disabled = false;
    toast(`✅ ${instrumentoNome} exportado com sucesso`, 'success');

  } catch (error) {
    console.error('Erro:', error);
    toast('❌ Erro ao exportar: ' + error.message, 'error');
    if (event.target) {
      event.target.disabled = false;
    }
  }
}

/**
 * Função para imprimir um instrumento
 * @param {string} instrumentoId - ID do elemento
 */
function imprimirInstrumento(instrumentoId) {
  const elemento = document.getElementById(instrumentoId);
  if (!elemento) {
    alert('Instrumento não encontrado');
    return;
  }

  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Impressão</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Syne', sans-serif; }
        @media print { body { margin: 0; padding: 0; } }
      </style>
    </head>
    <body>
      ${elemento.outerHTML}
      <script>
        window.print();
        window.close();
      </script>
    </body>
    </html>
  `);
}

console.log('✅ Integração Puppeteer carregada');
console.log(`📡 Servidor PDF: ${PDF_SERVER_URL}`);
