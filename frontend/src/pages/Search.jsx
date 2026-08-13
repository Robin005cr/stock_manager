import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './Search.css';
import { sampleInventory, filterInventory, getFilterOptions } from '../data/sampleInventory';
import { exportResults } from '../utils/exportUtils';

const filterOptions = getFilterOptions(sampleInventory);

function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [measurementValue, setMeasurementValue] = useState('');
  const [companyValue, setCompanyValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [quantityValue, setQuantityValue] = useState('');
  const [godownValue, setGodownValue] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [hasSearched, setHasSearched] = useState(false);

  const results = useMemo(() => {
    if (!hasSearched) return sampleInventory;
    return filterInventory(sampleInventory, {
      searchTerm,
      measurementValue,
      companyValue,
      categoryValue,
      quantityValue,
      godownValue,
      dateValue,
    });
  }, [
    hasSearched,
    searchTerm,
    measurementValue,
    companyValue,
    categoryValue,
    quantityValue,
    godownValue,
    dateValue,
  ]);

  const filters = {
    searchTerm,
    measurementValue,
    companyValue,
    categoryValue,
    quantityValue,
    godownValue,
    dateValue,
  };

  function handleSearch(event) {
    event.preventDefault();
    setHasSearched(true);
  }

  function handleExport() {
    const filtered = filterInventory(sampleInventory, filters);
    exportResults(filtered, exportFormat);
  }

  return (
    <div className="search-page">
      <div className="container">
        <nav className="page-nav">
          <Link to="/">Update</Link>
          <Link to="/login">Login</Link>
        </nav>
        <h1>Search Inventory</h1>
        <form onSubmit={handleSearch}>
          <div className="form-grid">
            <div>
              <label htmlFor="searchInput">Search Product</label>
              <input
                type="search"
                id="searchInput"
                name="searchInput"
                placeholder="Search by product, category, or company"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <FilterSelect
              id="measurementFilter"
              label="Measurement"
              value={measurementValue}
              onChange={setMeasurementValue}
              options={filterOptions.measurements}
            />
            <FilterSelect
              id="companyFilter"
              label="Company"
              value={companyValue}
              onChange={setCompanyValue}
              options={filterOptions.companies}
            />
            <FilterSelect
              id="categoryFilter"
              label="Category"
              value={categoryValue}
              onChange={setCategoryValue}
              options={filterOptions.categories}
            />
            <FilterSelect
              id="quantityFilter"
              label="Quantity"
              value={quantityValue}
              onChange={setQuantityValue}
              options={filterOptions.quantities}
            />
            <FilterSelect
              id="godownFilter"
              label="Godown"
              value={godownValue}
              onChange={setGodownValue}
              options={filterOptions.godowns}
            />
            <div>
              <label htmlFor="dateFilter">Date of Load</label>
              <input
                type="date"
                id="dateFilter"
                name="dateFilter"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
              />
            </div>
          </div>
          <button type="submit">Search</button>
        </form>
        <div className="action-row">
          <div>
            <label htmlFor="exportFormat">Export Format</label>
            <select
              id="exportFormat"
              name="exportFormat"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <button type="button" onClick={handleExport}>
            Export
          </button>
        </div>
        <div className="results">
          {results.length === 0 ? (
            <div className="no-results">No results found.</div>
          ) : (
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
                {results.map((item) => (
                  <tr key={`${item.productName}-${item.godown}-${item.dateOfLoad}`}>
                    <td>{item.measurement}</td>
                    <td>{item.productName}</td>
                    <td>{item.company}</td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td>{item.godown}</td>
                    <td>{item.dateOfLoad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
