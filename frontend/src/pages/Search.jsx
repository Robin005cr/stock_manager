import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { fetchFilterOptions, fetchInventory } from '../api/inventory';
import { defaultMetadata } from '../data/defaultMetadata';
import { exportResults } from '../utils/exportUtils';
import './Search.css';

const emptyFilterOptions = {
  measurements: [],
  companies: [],
  categories: [],
  quantities: [],
  godowns: [],
};

function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={id} className="ui-select" value={value} onChange={(event) => onChange(event.target.value)}>
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [measurementValue, setMeasurementValue] = useState('');
  const [companyValue, setCompanyValue] = useState('');
  const [quantityValue, setQuantityValue] = useState('');
  const [godownValue, setGodownValue] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [results, setResults] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [filterOptions, setFilterOptions] = useState(emptyFilterOptions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categoryChips = useMemo(
    () => ['All', ...(filterOptions.categories || [])],
    [filterOptions.categories],
  );

  const filters = useMemo(
    () => ({
      searchTerm,
      measurementValue,
      companyValue,
      categoryValue: selectedCategory === 'All' ? '' : selectedCategory,
      quantityValue,
      godownValue,
      dateValue,
    }),
    [searchTerm, selectedCategory, measurementValue, companyValue, quantityValue, godownValue, dateValue],
  );

  const totalQuantity = useMemo(
    () => results.reduce((sum, item) => sum + Number(item.quantity), 0),
    [results],
  );

  const activeFilterCount = [measurementValue, companyValue, quantityValue, godownValue, dateValue].filter(Boolean).length;

  function clearFilters() {
    setMeasurementValue('');
    setCompanyValue('');
    setQuantityValue('');
    setGodownValue('');
    setDateValue('');
  }

  const loadInventory = useCallback(async (activeFilters, trackCatalog = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchInventory(activeFilters);
      setResults(data.items);
      if (trackCatalog) {
        setCatalogTotal(data.total);
      }
    } catch (err) {
      setError(err.message || 'Could not load inventory from the server.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions()
      .then((data) =>
        setFilterOptions({
          measurements: [...new Set([...(defaultMetadata.measurements || []), ...(data.measurements || [])])],
          companies: [...new Set([...(defaultMetadata.companies || []), ...(data.companies || [])])],
          categories: [...new Set([...(defaultMetadata.categories || []), ...(data.categories || [])])],
          quantities: [...new Set([...(data.quantities || [])])],
          godowns: [...new Set([...(data.godowns || [])])],
        }),
      )
      .catch(() =>
        setFilterOptions({
          measurements: defaultMetadata.measurements,
          companies: defaultMetadata.companies,
          categories: defaultMetadata.categories,
          quantities: defaultMetadata.quantities,
          godowns: defaultMetadata.godowns,
        }),
      );
    loadInventory({}, true);
  }, [loadInventory]);

  useEffect(() => {
    loadInventory(filters, false);
  }, [filters, loadInventory]);

  function handleExport() {
    exportResults(results, exportFormat);
  }

  return (
    <>
      <PageHeader
        title="Search inventory"
        description="Data is loaded from MongoDB via the API. Filter and export as needed."
      />
      <div className="app-content">
        {error && (
          <div className="alert-banner search-error-banner" role="alert">
            {error}
          </div>
        )}

        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-label">Showing</div>
            <div className="stat-value">{loading ? '…' : results.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total units</div>
            <div className="stat-value">{loading ? '…' : totalQuantity}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Catalog size</div>
            <div className="stat-value">{loading ? '…' : catalogTotal}</div>
          </div>
        </div>

        <div className="page-card search-panel">
          <div className="search-toolbar">
            <input
              className="search-input"
              type="search"
              id="searchInput"
              name="searchInput"
              placeholder="Search products, codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              className={`filter-toggle${filtersOpen ? ' active' : ''}`}
              aria-expanded={filtersOpen}
              aria-controls="inventory-filters"
              onClick={() => setFiltersOpen((isOpen) => !isOpen)}
              title="Show filters"
            >
              <span className="filter-icon" aria-hidden="true" />
              <span>Filter</span>
              {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
            </button>
          </div>

          <div className="category-strip" aria-label="Inventory categories">
            {categoryChips.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  className={`category-chip${isActive ? ' active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {filtersOpen && (
            <div className="filter-drawer" id="inventory-filters">
              <div className="filter-drawer-header">
                <div>
                  <strong>Filter inventory</strong>
                  <span>Refine the products shown below.</span>
                </div>
                {activeFilterCount > 0 && (
                  <button type="button" className="clear-filters" onClick={clearFilters}>
                    Clear all
                  </button>
                )}
              </div>
              <div className="advanced-filters">
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
                <div className="field">
                  <label htmlFor="dateFilter">Date of load</label>
                  <input
                    className="ui-input"
                    type="date"
                    id="dateFilter"
                    name="dateFilter"
                    value={dateValue}
                    onChange={(event) => setDateValue(event.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="search-export-row">
            <div className="field export-format-field">
              <label htmlFor="exportFormat">Export format</label>
              <select
                id="exportFormat"
                name="exportFormat"
                className="ui-select"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={!results.length}>
              Export results
            </button>
          </div>
        </div>

        <div className="page-card search-results-card">
          {loading ? (
            <div className="search-loading">Loading inventory…</div>
          ) : results.length === 0 ? (
            <div className="empty-state">No results match your filters.</div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Measurement</th>
                    <th>Product</th>
                    <th>Company</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Godown</th>
                    <th>Load date</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item) => (
                    <tr key={item.id ?? `${item.productName}-${item.godown}-${item.dateOfLoad}`}>
                      <td>{item.measurement}</td>
                      <td>
                        <strong>{item.productName}</strong>
                      </td>
                      <td>{item.company}</td>
                      <td>
                        <span className="category-pill">{item.category}</span>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{item.godown}</td>
                      <td>{item.dateOfLoad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
