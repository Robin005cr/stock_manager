function buildCsv(results) {
  const headers = ['Measurement', 'Product Name', 'Company', 'Category', 'Quantity', 'Godown', 'Date of Load'];
  const lines = [headers.join(',')];
  results.forEach((item) => {
    const row = [
      item.measurement,
      item.productName,
      item.company,
      item.category,
      item.quantity,
      item.godown,
      item.dateOfLoad,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
    lines.push(row.join(','));
  });
  return lines.join('\r\n');
}

function buildExcel(results) {
  const csv = buildCsv(results);
  return new Blob(['\ufeff' + csv], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function buildPdf(results) {
  const rows = results.map((item) => [
    item.measurement,
    item.productName,
    item.company,
    item.category,
    item.quantity,
    item.godown,
    item.dateOfLoad,
  ]);
  const headerRow = ['Measurement', 'Product Name', 'Company', 'Category', 'Quantity', 'Godown', 'Date of Load'];
  const tableData = [headerRow, ...rows];
  const lines = tableData.map((row) => row.join(' | '));
  return new Blob([lines.join('\n')], { type: 'application/pdf' });
}

function downloadFile(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function exportResults(results, format) {
  if (results.length === 0) {
    alert('No results to export.');
    return;
  }

  const fileNameBase = 'inventory-export';
  if (format === 'csv') {
    const csv = buildCsv(results);
    downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${fileNameBase}.csv`);
  } else if (format === 'excel') {
    downloadFile(buildExcel(results), `${fileNameBase}.xlsx`);
  } else if (format === 'pdf') {
    downloadFile(buildPdf(results), `${fileNameBase}.pdf`);
  }
}
