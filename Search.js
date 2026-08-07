const sampleInventory = [
  {
    measurement: '2 kg',
    productName: 'Apple Juice',
    company: 'Fresh Farms',
    category: 'Beverages',
    quantity: 25,
    godown: 'A1',
    dateOfLoad: '2026-08-01',
  },
  {
    measurement: '500 ml',
    productName: 'Mineral Water',
    company: 'Pure Springs',
    category: 'Beverages',
    quantity: 100,
    godown: 'B2',
    dateOfLoad: '2026-08-04',
  },
  {
    measurement: '10 pcs',
    productName: 'LED Bulb',
    company: 'BrightTech',
    category: 'Electronics',
    quantity: 50,
    godown: 'C3',
    dateOfLoad: '2026-07-30',
  },
  {
    measurement: '3 kg',
    productName: 'Tomato Sauce',
    company: 'KitchenPro',
    category: 'Condiments',
    quantity: 40,
    godown: 'A2',
    dateOfLoad: '2026-08-02',
  },
];

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const measurementFilter = document.getElementById('measurementFilter');
const companyFilter = document.getElementById('companyFilter');
const categoryFilter = document.getElementById('categoryFilter');
const quantityFilter = document.getElementById('quantityFilter');
const godownFilter = document.getElementById('godownFilter');
const dateFilter = document.getElementById('dateFilter');
const exportFormat = document.getElementById('exportFormat');
const exportButton = document.getElementById('exportButton');
const resultsContainer = document.getElementById('resultsContainer');

function populateFilterOptions() {
  const measurements = new Set();
  const companies = new Set();
  const categories = new Set();
  const quantities = new Set();
  const godowns = new Set();

  sampleInventory.forEach((item) => {
    measurements.add(item.measurement);
    companies.add(item.company);
    categories.add(item.category);
    quantities.add(item.quantity);
    godowns.add(item.godown);
  });

  measurements.forEach((value) => appendOption(measurementFilter, value));
  companies.forEach((value) => appendOption(companyFilter, value));
  categories.forEach((value) => appendOption(categoryFilter, value));
  quantities.forEach((value) => appendOption(quantityFilter, value));
  godowns.forEach((value) => appendOption(godownFilter, value));
}

function appendOption(select, value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  select.appendChild(option);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesSearch(item, term) {
  if (term === '') return true;
  const normalizedTerm = normalize(term);
  return [item.productName, item.category, item.company].some((field) => normalize(field).includes(normalizedTerm));
}

function matchesFilter(item, filterValue, fieldName) {
  if (!filterValue) return true;
  return normalize(item[fieldName]) === normalize(filterValue);
}

function renderResults(results) {
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="no-results">No results found.</div>';
    return;
  }

  const rows = results
    .map((item) => `
      <tr>
        <td>${item.measurement}</td>
        <td>${item.productName}</td>
        <td>${item.company}</td>
        <td>${item.category}</td>
        <td>${item.quantity}</td>
        <td>${item.godown}</td>
        <td>${item.dateOfLoad}</td>
      </tr>
    `)
    .join('');

  resultsContainer.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Measurement</th>
          <th>Product Name</th>
          <th>Company</th>
          <th>Category</th>
          <th>Quantity</th>
          <th>Godown</th>
          <th>Date of Load</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

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
  return new Blob(['\ufeff' + csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

function exportResults(results, format) {
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

function filterInventory() {
  const searchTerm = searchInput.value;
  const measurementValue = measurementFilter.value;
  const companyValue = companyFilter.value;
  const categoryValue = categoryFilter.value;
  const quantityValue = quantityFilter.value;
  const godownValue = godownFilter.value;
  const dateValue = dateFilter.value;

  const filtered = sampleInventory.filter((item) => {
    return (
      matchesSearch(item, searchTerm) &&
      matchesFilter(item, measurementValue, 'measurement') &&
      matchesFilter(item, companyValue, 'company') &&
      matchesFilter(item, categoryValue, 'category') &&
      matchesFilter(item, quantityValue, 'quantity') &&
      matchesFilter(item, godownValue, 'godown') &&
      (dateValue === '' || item.dateOfLoad === dateValue)
    );
  });

  renderResults(filtered);
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  filterInventory();
});

exportButton.addEventListener('click', () => {
  const filteredResults = sampleInventory.filter((item) => {
    return (
      matchesSearch(item, searchInput.value) &&
      matchesFilter(item, measurementFilter.value, 'measurement') &&
      matchesFilter(item, companyFilter.value, 'company') &&
      matchesFilter(item, categoryFilter.value, 'category') &&
      matchesFilter(item, quantityFilter.value, 'quantity') &&
      matchesFilter(item, godownFilter.value, 'godown') &&
      (dateFilter.value === '' || item.dateOfLoad === dateFilter.value)
    );
  });
  exportResults(filteredResults, exportFormat.value);
});

populateFilterOptions();
renderResults(sampleInventory);
