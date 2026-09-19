import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { createMetadata, deleteMetadata, fetchMetadata, updateMetadata } from '../api/metadata';
import './Metadata.css';

const metadataKinds = [
  { key: 'category', label: 'Categories', placeholder: 'Add a category like Tiles' },
  { key: 'company', label: 'Companies', placeholder: 'Add a company name' },
  { key: 'measurement', label: 'Measurements', placeholder: 'Add a unit like 2 kg' },
];

const emptyMap = Object.fromEntries(metadataKinds.map(({ key }) => [key, []]));

export default function Metadata() {
  const [items, setItems] = useState(emptyMap);
  const [drafts, setDrafts] = useState(Object.fromEntries(metadataKinds.map(({ key }) => [key, ''])));
  const [editing, setEditing] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const kindLabels = useMemo(
    () => Object.fromEntries(metadataKinds.map(({ key, label }) => [key, label])),
    [],
  );

  async function loadMetadata() {
    setLoading(true);
    try {
      const results = await Promise.all(metadataKinds.map(({ key }) => fetchMetadata(key)));
      const next = Object.fromEntries(
        metadataKinds.map(({ key }, index) => [key, Array.isArray(results[index]) ? results[index] : []]),
      );
      setItems(next);
    } catch (err) {
      setError(err.message || 'Could not load metadata.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetadata();
  }, []);

  async function handleAdd(kind) {
    const value = drafts[kind].trim();
    if (!value) {
      setError(`${kindLabels[kind]} cannot be empty.`);
      return;
    }

    try {
      await createMetadata(kind, value);
      setDrafts((prev) => ({ ...prev, [kind]: '' }));
      setError('');
      setNotice(`${kindLabels[kind]} added.`);
      await loadMetadata();
    } catch (err) {
      setError(err.message || `Could not add ${kindLabels[kind].toLowerCase()}.`);
      setNotice('');
    }
  }

  function beginEdit(kind, option) {
    setEditing((prev) => ({ ...prev, [kind]: option.id }));
    setDrafts((prev) => ({ ...prev, [kind]: option.value }));
    setError('');
    setNotice('');
  }

  function cancelEdit(kind) {
    setEditing((prev) => ({ ...prev, [kind]: null }));
    setDrafts((prev) => ({ ...prev, [kind]: '' }));
  }

  async function saveEdit(kind, optionId) {
    const value = drafts[kind].trim();
    if (!value) {
      setError(`${kindLabels[kind]} cannot be empty.`);
      return;
    }

    try {
      await updateMetadata(kind, optionId, value);
      setEditing((prev) => ({ ...prev, [kind]: null }));
      setDrafts((prev) => ({ ...prev, [kind]: '' }));
      setError('');
      setNotice(`${kindLabels[kind]} updated.`);
      await loadMetadata();
    } catch (err) {
      setError(err.message || `Could not update ${kindLabels[kind].toLowerCase()}.`);
      setNotice('');
    }
  }

  async function handleDelete(kind, optionId) {
    try {
      await deleteMetadata(kind, optionId);
      setError('');
      setNotice(`${kindLabels[kind]} removed.`);
      await loadMetadata();
    } catch (err) {
      setError(err.message || `Could not delete ${kindLabels[kind].toLowerCase()}.`);
      setNotice('');
    }
  }

  return (
    <>
      <PageHeader
        title="Add meta details"
        description="Create and manage reusable company, category, and measurement values for inventory records."
      />
      <div className="app-content metadata-page">
        {error && (
          <div className="alert-banner entry-error-banner" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="alert-banner success" role="status">
            {notice}
          </div>
        )}

        <div className="metadata-grid">
          {metadataKinds.map(({ key, label, placeholder }) => (
            <div className="page-card metadata-card" key={key}>
              <div className="metadata-card-header">
                <h2>{label}</h2>
                <span>{items[key].length} total</span>
              </div>

              <div className="metadata-form">
                <input
                  className="ui-input"
                  type="text"
                  value={drafts[key]}
                  placeholder={placeholder}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                />
                <button type="button" className="btn btn-primary" onClick={() => handleAdd(key)}>
                  Add
                </button>
              </div>

              <div className="metadata-list"> 
                {loading ? (
                  <p className="metadata-empty">Loading…</p>
                ) : items[key].length === 0 ? (
                  <p className="metadata-empty">No {label.toLowerCase()} added yet.</p>
                ) : (
                  items[key].map((option) => {
                    const isEditing = editing[key] === option.id;
                    return (
                      <div className="metadata-item" key={option.id}>
                        {isEditing ? (
                          <>
                            <input
                              className="ui-input"
                              value={drafts[key]}
                              onChange={(event) => setDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                            />
                            <div className="metadata-actions">
                              <button type="button" className="btn btn-primary" onClick={() => saveEdit(key, option.id)}>
                                Save
                              </button>
                              <button type="button" className="btn btn-secondary" onClick={() => cancelEdit(key)}>
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="metadata-value">{option.value}</span>
                            <div className="metadata-actions">
                              <button type="button" className="btn btn-secondary" onClick={() => beginEdit(key, option)}>
                                Edit
                              </button>
                              <button type="button" className="btn btn-danger" onClick={() => handleDelete(key, option.id)}>
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
