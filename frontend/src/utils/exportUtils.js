const headers = ['Measurement', 'Product Name', 'Company', 'Category', 'Quantity', 'Godown', 'Date of Load'];

function getRows(results) {
  return results.map((item) => [
    item.measurement,
    item.productName,
    item.company,
    item.category,
    item.quantity,
    item.godown,
    item.dateOfLoad,
  ]);
}

function buildCsv(results) {
  const lines = [headers.join(',')];
  getRows(results).forEach((values) => {
    const row = values.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`);
    lines.push(row.join(','));
  });
  return lines.join('\r\n');
}

async function buildExcel(results) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventory');
  worksheet.addRow(headers);
  getRows(results).forEach((row) => worksheet.addRow(row));
  worksheet.columns = [14, 24, 22, 18, 12, 14, 16].map((width) => ({ width }));

  return new Blob([await workbook.xlsx.writeBuffer()], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

async function buildPdf(results) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  document.setFontSize(16);
  document.text('Inventory Export', 28, 30);
  autoTable(document, {
    head: [headers],
    body: getRows(results).map((row) => row.map((value) => String(value ?? ''))),
    startY: 44,
    margin: { left: 28, right: 28 },
    styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: [38, 91, 76] },
  });
  return document.output('blob');
}

function downloadFile(blob, filename) {
  const link = document.createElement('a');
  const fileUrl = URL.createObjectURL(blob);
  link.href = fileUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}

export async function exportResults(results, format, requestedFileName = 'inventory-export') {
  if (results.length === 0) {
    alert('No results to export.');
    return;
  }

  const fileNameBase = requestedFileName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/, '')
    .replace(/\.(csv|xlsx|pdf)$/i, '') || 'inventory-export';

  if (format === 'csv') {
    const csv = buildCsv(results);
    downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${fileNameBase}.csv`);
  } else if (format === 'excel') {
    downloadFile(await buildExcel(results), `${fileNameBase}.xlsx`);
  } else if (format === 'pdf') {
    downloadFile(await buildPdf(results), `${fileNameBase}.pdf`);
  }
}
