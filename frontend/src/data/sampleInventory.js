export const sampleInventory = [
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

export function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export function matchesSearch(item, term) {
  if (term === '') return true;
  const normalizedTerm = normalize(term);
  return [item.productName, item.category, item.company].some((field) =>
    normalize(field).includes(normalizedTerm),
  );
}

export function matchesFilter(item, filterValue, fieldName) {
  if (!filterValue) return true;
  return normalize(item[fieldName]) === normalize(filterValue);
}

export function filterInventory(inventory, filters) {
  const {
    searchTerm,
    measurementValue,
    companyValue,
    categoryValue,
    quantityValue,
    godownValue,
    dateValue,
  } = filters;

  return inventory.filter(
    (item) =>
      matchesSearch(item, searchTerm) &&
      matchesFilter(item, measurementValue, 'measurement') &&
      matchesFilter(item, companyValue, 'company') &&
      matchesFilter(item, categoryValue, 'category') &&
      matchesFilter(item, quantityValue, 'quantity') &&
      matchesFilter(item, godownValue, 'godown') &&
      (dateValue === '' || item.dateOfLoad === dateValue),
  );
}

export function getFilterOptions(inventory) {
  const measurements = new Set();
  const companies = new Set();
  const categories = new Set();
  const quantities = new Set();
  const godowns = new Set();

  inventory.forEach((item) => {
    measurements.add(item.measurement);
    companies.add(item.company);
    categories.add(item.category);
    quantities.add(item.quantity);
    godowns.add(item.godown);
  });

  return {
    measurements: [...measurements],
    companies: [...companies],
    categories: [...categories],
    quantities: [...quantities],
    godowns: [...godowns],
  };
}
