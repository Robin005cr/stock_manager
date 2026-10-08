import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { fetchFilterOptions, fetchInventory, updateInventoryStock } from '../api/inventory';
import { defaultMetadata } from '../data/defaultMetadata';
import { usePinnedProducts } from '../state/PinnedProductsContext';
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

function StockHistoryPhoto({ src, alt }) {
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <div className="stock-history-photo">
      {src && !loadFailed ? (
        <img src={src} alt={alt} onError={() => setLoadFailed(true)} />
      ) : (
        <span>pic not available</span>
      )}
    </div>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [measurementValue, setMeasurementValue] = useState('');
  const [companyValue, setCompanyValue] = useState('');
  const [quantityValue, setQuantityValue] = useState('');
  const [godownValue, setGodownValue] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [stockAdjustment, setStockAdjustment] = useState(null);
  const [stockAdjustmentAmount, setStockAdjustmentAmount] = useState('1');
  const [stockAdjustmentError, setStockAdjustmentError] = useState('');
  const [updatingStock, setUpdatingStock] = useState({});

  const [results, setResults] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const latestInventoryRequest = useRef(0);
  const [filterOptions, setFilterOptions] = useState(emptyFilterOptions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isPinned, togglePinned, updatePinnedProduct } = usePinnedProducts();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('sm_user') || 'null');
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === 'admin';

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

  const loadInventory = useCallback(async (activeFilters) => {
    const requestId = ++latestInventoryRequest.current;
    const trackCatalog = Object.values(activeFilters).every((value) => !value);
    setLoading(true);
    setError('');
    try {
      const data = await fetchInventory(activeFilters);
      if (trackCatalog) {
        setCatalogTotal(data.total);
      }
      if (requestId !== latestInventoryRequest.current) return;
      setResults(data.items);
    } catch (err) {
      if (requestId !== latestInventoryRequest.current) return;
      setError(err.message || 'Could not load inventory from the server.');
      setResults([]);
    } finally {
      if (requestId === latestInventoryRequest.current) {
        setLoading(false);
      }
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
  }, [loadInventory]);

  useEffect(() => {
    loadInventory(filters);
  }, [filters, loadInventory]);

  async function handleExport() {
    setError('');
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const defaultFileName = `inventory-export _${pad(now.getDate())}_${pad(now.getMonth() + 1)}_${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
    const fileName = window.prompt('Enter a name for the export:', defaultFileName);
    if (fileName === null) return;
    if (!fileName.trim()) {
      setError('Enter a name for the export.');
      return;
    }

    try {
      await exportResults(results, exportFormat, fileName);
    } catch (err) {
      setError(err.message || 'Could not export inventory results.');
    }
  }

  function openStockAdjustment(item, direction) {
    setStockAdjustment({ item, direction });
    setStockAdjustmentAmount('1');
    setStockAdjustmentError('');
  }

  async function handleStockUpdate(event) {
    event.preventDefault();
    if (!stockAdjustment) return;

    const amount = Number(stockAdjustmentAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setStockAdjustmentError('Enter a positive whole number.');
      return;
    }

    const { item, direction } = stockAdjustment;
    setStockAdjustmentError('');
    setUpdatingStock((previous) => ({ ...previous, [item.id]: true }));

    try {
      const updatedItem = await updateInventoryStock(item.id, direction, amount);
      updatePinnedProduct({ ...item, quantity: updatedItem.quantity });
      setStockAdjustment(null);
      await loadInventory(filters, false);
    } catch (err) {
      setStockAdjustmentError(err.message || 'Could not update stock.');
    } finally {
      setUpdatingStock((previous) => ({ ...previous, [item.id]: false }));
    }
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
                    <th>Stock update</th>
                    <th>Godown</th>
                    <th>History</th>
                    <th aria-label="Edit product">Edit</th>
                    <th aria-label="Pin product" />
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
                      <td className="search-stock-cell">
                        <div className="stock-update-buttons">
                          <button
                            type="button"
                            className="stock-update-button stock-increment-button"
                            disabled={!isAdmin || updatingStock[item.id]}
                            onClick={() => openStockAdjustment(item, 'increment')}
                            aria-label={`Increase stock for ${item.productName}`}
                            title="Increase stock"
                          >
                            <span aria-hidden="true">+</span>
                          </button>
                          <button
                            type="button"
                            className="stock-update-button stock-decrement-button"
                            disabled={!isAdmin || updatingStock[item.id]}
                            onClick={() => openStockAdjustment(item, 'decrement')}
                            aria-label={`Decrease stock for ${item.productName}`}
                            title="Decrease stock"
                          >
                            <span aria-hidden="true">-</span>
                          </button>
                        </div>
                      </td>
                      <td>{item.godown}</td>
                      <td className="search-history-cell">
                        <button
                          type="button"
                          className="search-history-button"
                          onClick={() => setHistoryItem(item)}
                          aria-label={`View stock history for ${item.productName}`}
                          title="View stock history"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3.5 12a8.5 8.5 0 1 0 2.49-6.01L3.5 8.5" />
                            <path d="M3.5 3.75V8.5H8.25M12 7v5l3.25 2" />
                          </svg>
                        </button>
                      </td>
                      <td className="search-edit-cell">
                        <button
                          type="button"
                          className="btn btn-secondary search-edit-button"
                          disabled={!isAdmin}
                          onClick={() => navigate(`/edit-existing/${item.id}`, { viewTransition: true })}
                        >
                          Edit
                        </button>
                      </td>
                      <td className="pin-cell">
                        <button
                          type="button"
                          className={`pin-button${isPinned(item) ? ' pinned' : ''}`}
                          onClick={() => togglePinned(item)}
                          aria-label={isPinned(item) ? `Unpin ${item.productName}` : `Pin ${item.productName}`}
                          title={isPinned(item) ? 'Remove from pinned products' : 'Pin product'}
                        >
                          📌
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {stockAdjustment && (
        <div className="stock-adjust-overlay" role="dialog" aria-modal="true" aria-labelledby="stock-adjust-title">
          <form className="stock-adjust-card" onSubmit={handleStockUpdate}>
            <h3 id="stock-adjust-title">
              {stockAdjustment.direction === 'increment' ? 'Add stock' : 'Decrease stock'}
            </h3>
            <p className="stock-adjust-summary">
              {stockAdjustment.item.productName} · Current stock: {stockAdjustment.item.quantity}
            </p>
            <div className="field stock-adjust-field">
              <label htmlFor="stock-adjustment-amount">
                Quantity to {stockAdjustment.direction === 'increment' ? 'add' : 'decrease'}
              </label>
              <input
                autoFocus
                className="ui-input"
                id="stock-adjustment-amount"
                type="number"
                min="1"
                step="1"
                value={stockAdjustmentAmount}
                onChange={(event) => setStockAdjustmentAmount(event.target.value)}
              />
            </div>
            {stockAdjustmentError && (
              <p className="stock-adjust-error" role="alert">{stockAdjustmentError}</p>
            )}
            <div className="stock-adjust-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setStockAdjustment(null);
                  setStockAdjustmentError('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={updatingStock[stockAdjustment.item.id]}>
                {updatingStock[stockAdjustment.item.id] ? 'Updating...' : 'Update stock'}
              </button>
            </div>
          </form>
        </div>
      )}

      {historyItem && (
        <div
          className="stock-history-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHistoryItem(null);
          }}
        >
          <section className="stock-history-card" role="dialog" aria-modal="true" aria-labelledby="stock-history-title">
            <div className="stock-history-header">
              <div className="stock-history-product">
                <StockHistoryPhoto
                  key={historyItem.id ?? historyItem.productName}
                  src={historyItem.productImage}
                  alt={historyItem.productName}
                />
                <div>
                  <h3 id="stock-history-title">Stock history</h3>
                  <p>{historyItem.productName} · {historyItem.company}</p>
                </div>
              </div>
              <button
                type="button"
                className="stock-history-close"
                onClick={() => setHistoryItem(null)}
                aria-label="Close stock history"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="stock-history-load-date">
              <span>Date of load</span>
              <strong>{historyItem.dateOfLoad || 'Not recorded'}</strong>
            </div>
            {historyItem.stockHistory?.length ? (
              <ol className="stock-history-list">
                {[...historyItem.stockHistory].reverse().map((entry, index) => {
                  const eventDate = entry.changedAt ? new Date(entry.changedAt) : null;
                  const eventLabel = entry.type === 'load'
                    ? 'Initial stock loaded'
                    : entry.type === 'edit'
                      ? 'Stock quantity edited'
                      : entry.change > 0
                        ? 'Stock increased'
                        : 'Stock decreased';
                  return (
                    <li className="stock-history-event" key={`${entry.changedAt}-${index}`}>
                      <div>
                        <strong>{eventLabel}</strong>
                        <span>{entry.change > 0 ? '+' : ''}{entry.change} units</span>
                        {entry.quantityAfter !== undefined && <small>Stock after update: {entry.quantityAfter}</small>}
                      </div>
                      <time>
                        {eventDate && !Number.isNaN(eventDate.getTime())
                          ? eventDate.toLocaleString()
                          : 'Date/time unavailable'}
                      </time>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="stock-history-empty">No stock updates have been recorded for this product.</p>
            )}
            <div className="stock-history-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setHistoryItem(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}

    </>
  );
}
