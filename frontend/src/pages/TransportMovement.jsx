import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { createTransportMovement, fetchTransportMovements } from '../api/transportMovements';
import { fetchMetadata } from '../api/metadata';
import './TransportMovement.css';

const initialForm = {
  category: '',
  company: '',
  measurement: '',
  dateOfLoad: '',
  vehicleType: '',
  vehicleNumber: '',
  units: '',
};

const initialFilters = {
  category: '',
  company: '',
  measurement: '',
  vehicleType: '',
  vehicleNumber: '',
  units: '',
  dateFrom: '',
  dateTo: '',
};

function MetadataSelect({ name, label, value, options, onChange }) {
  return (
    <div className="field">
      <label htmlFor={`transport-${name}`}>{label} <span aria-hidden="true">*</span></label>
      <select
        className="ui-select"
        id={`transport-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        required
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.value}>{option.value}</option>
        ))}
      </select>
    </div>
  );
}

function displayDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
}

export default function TransportMovement() {
  const [activeView, setActiveView] = useState('add');
  const [form, setForm] = useState(initialForm);
  const [options, setOptions] = useState({ category: [], company: [], measurement: [] });
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const latestRequest = useRef(0);

  useEffect(() => {
    let active = true;
    Promise.all(['category', 'company', 'measurement'].map((kind) => fetchMetadata(kind)))
      .then(([category, company, measurement]) => {
        if (active) setOptions({ category, company, measurement });
      })
      .catch((err) => {
        if (active) setMetadataError(err.message || 'Could not load global category, company, and measurement values.');
      })
      .finally(() => {
        if (active) setMetadataLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  useEffect(() => {
    if (activeView !== 'history') return undefined;
    const requestId = ++latestRequest.current;
    let active = true;
    setLoading(true);
    setError('');
    fetchTransportMovements(filters)
      .then((data) => {
        if (active && requestId === latestRequest.current) setItems(data.items || []);
      })
      .catch((err) => {
        if (active && requestId === latestRequest.current) {
          setError(err.message || 'Could not load transport movement history.');
          setItems([]);
        }
      })
      .finally(() => {
        if (active && requestId === latestRequest.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeView, filters]);

  function updateForm(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }));
    setNotice('');
    setError('');
  }

  function updateFilter(name, value) {
    setFilters((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    const units = Number(form.units);
    if (!Number.isSafeInteger(units) || units < 1) {
      setError('No. of Units must be a positive whole number.');
      return;
    }

    setSaving(true);
    try {
      await createTransportMovement({ ...form, units });
      setForm(initialForm);
      setNotice('Vehicle load added successfully.');
    } catch (err) {
      setError(err.message || 'Could not add the vehicle load.');
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setFilters(initialFilters);
  }

  return (
    <>
      <PageHeader
        title="Transport movement"
        description="Record incoming vehicle loads and search their independent warehouse history."
      />
      <div className="app-content transport-page">
        <div className="transport-tabs" role="tablist" aria-label="Transport movement options">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'add'}
            className={`btn ${activeView === 'add' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveView('add')}
          >
            Add vehicle load
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'history'}
            className={`btn ${activeView === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveView('history')}
          >
            Load history
          </button>
        </div>

        {error && <div className="alert-banner entry-error-banner" role="alert">{error}</div>}
        {notice && <div className="alert-banner success" role="status">{notice}</div>}
        {metadataError && <div className="alert-banner entry-error-banner" role="alert">{metadataError}</div>}

        {activeView === 'add' ? (
          <section className="page-card transport-form-card" aria-label="Add vehicle load">
            <h2>New incoming load</h2>
            {metadataLoading ? (
              <p className="transport-muted" role="status">Loading global values…</p>
            ) : (
              <form className="form-grid transport-form-grid" onSubmit={handleSubmit}>
                <MetadataSelect
                  name="category"
                  label="Category"
                  value={form.category}
                  options={options.category}
                  onChange={(event) => updateForm('category', event.target.value)}
                />
                <MetadataSelect
                  name="company"
                  label="Company"
                  value={form.company}
                  options={options.company}
                  onChange={(event) => updateForm('company', event.target.value)}
                />
                <MetadataSelect
                  name="measurement"
                  label="Measurement"
                  value={form.measurement}
                  options={options.measurement}
                  onChange={(event) => updateForm('measurement', event.target.value)}
                />
                <div className="field">
                  <label htmlFor="transport-dateOfLoad">Date of load <span aria-hidden="true">*</span></label>
                  <input
                    className="ui-input"
                    id="transport-dateOfLoad"
                    name="dateOfLoad"
                    type="date"
                    value={form.dateOfLoad}
                    onChange={(event) => updateForm('dateOfLoad', event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="transport-vehicleType">Vehicle type <span aria-hidden="true">*</span></label>
                  <input
                    className="ui-input"
                    id="transport-vehicleType"
                    name="vehicleType"
                    type="text"
                    value={form.vehicleType}
                    onChange={(event) => updateForm('vehicleType', event.target.value)}
                    placeholder="e.g. Truck"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="transport-vehicleNumber">Vehicle number <span aria-hidden="true">*</span></label>
                  <input
                    className="ui-input"
                    id="transport-vehicleNumber"
                    name="vehicleNumber"
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(event) => updateForm('vehicleNumber', event.target.value)}
                    placeholder="Enter vehicle number"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="transport-units">No. of Units <span aria-hidden="true">*</span></label>
                  <input
                    className="ui-input"
                    id="transport-units"
                    name="units"
                    type="number"
                    min="1"
                    step="1"
                    value={form.units}
                    onChange={(event) => updateForm('units', event.target.value)}
                    required
                  />
                </div>
                <div className="transport-form-actions">
                  <button className="btn btn-primary" type="submit" disabled={saving || metadataError || metadataLoading}>
                    {saving ? 'Saving…' : 'Add vehicle load'}
                  </button>
                </div>
              </form>
            )}
          </section>
        ) : (
          <section className="transport-history" aria-label="Vehicle load history">
            <div className="page-card transport-filter-card">
              <div className="transport-filter-heading">
                <div>
                  <h2>Search load history</h2>
                  <p>{activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} applied` : 'Showing all vehicle loads'}</p>
                </div>
                <button type="button" className="btn btn-secondary" onClick={clearFilters} disabled={!activeFilterCount}>
                  Clear filters
                </button>
              </div>
              <div className="transport-filters">
                <MetadataSelect
                  name="category-filter"
                  label="Category"
                  value={filters.category}
                  options={options.category}
                  onChange={(event) => updateFilter('category', event.target.value)}
                />
                <MetadataSelect
                  name="company-filter"
                  label="Company"
                  value={filters.company}
                  options={options.company}
                  onChange={(event) => updateFilter('company', event.target.value)}
                />
                <MetadataSelect
                  name="measurement-filter"
                  label="Measurement"
                  value={filters.measurement}
                  options={options.measurement}
                  onChange={(event) => updateFilter('measurement', event.target.value)}
                />
                <div className="field">
                  <label htmlFor="transport-filter-dateFrom">Date from</label>
                  <input className="ui-input" id="transport-filter-dateFrom" type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="transport-filter-dateTo">Date to</label>
                  <input className="ui-input" id="transport-filter-dateTo" type="date" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="transport-filter-vehicleType">Vehicle type</label>
                  <input className="ui-input" id="transport-filter-vehicleType" type="search" value={filters.vehicleType} onChange={(event) => updateFilter('vehicleType', event.target.value)} placeholder="Filter by vehicle type" />
                </div>
                <div className="field">
                  <label htmlFor="transport-filter-vehicleNumber">Vehicle number</label>
                  <input className="ui-input" id="transport-filter-vehicleNumber" type="search" value={filters.vehicleNumber} onChange={(event) => updateFilter('vehicleNumber', event.target.value)} placeholder="Search vehicle number" />
                </div>
                <div className="field">
                  <label htmlFor="transport-filter-units">No. of Units</label>
                  <input className="ui-input" id="transport-filter-units" type="number" min="1" step="1" value={filters.units} onChange={(event) => updateFilter('units', event.target.value)} placeholder="Exact units" />
                </div>
              </div>
            </div>

            <div className="page-card transport-results-card">
              {loading ? (
                <p className="transport-empty" role="status">Loading vehicle load history…</p>
              ) : items.length === 0 ? (
                <p className="transport-empty">No vehicle loads match these filters.</p>
              ) : (
                <div className="transport-table-wrap">
                  <table className="transport-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Company</th>
                        <th>Measurement</th>
                        <th>Date of load</th>
                        <th>Vehicle type</th>
                        <th>Vehicle number</th>
                        <th>No. of Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.category}</td>
                          <td>{item.company}</td>
                          <td>{item.measurement}</td>
                          <td>{displayDate(item.dateOfLoad)}</td>
                          <td>{item.vehicleType}</td>
                          <td>{item.vehicleNumber}</td>
                          <td>{item.units}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="transport-result-count">{items.length} load{items.length === 1 ? '' : 's'}</div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
