import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { deleteInventoryItem, fetchFilterOptions, fetchInventoryItem, updateInventoryItem } from '../api/inventory';
import { defaultMetadata } from '../data/defaultMetadata';
import { formatDateToText, formatTextToDate } from '../utils/dateUtils';
import './EditExisting.css';

const emptyForm = {
  measurement: '',
  productName: '',
  productCode: '',
  productImage: '',
  company: '',
  category: '',
  quantity: '',
  godown: '',
  loadDateText: '',
  loadDatePicker: '',
};

export default function EditExisting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [metadataOptions, setMetadataOptions] = useState({ companies: [], categories: [], measurements: [] });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    Promise.all([fetchInventoryItem(id), fetchFilterOptions()])
      .then(([item, options]) => {
        setForm({
          measurement: item.measurement || '',
          productName: item.productName || '',
          productCode: item.productCode || '',
          productImage: item.productImage || '',
          company: item.company || '',
          category: item.category || '',
          quantity: String(item.quantity ?? ''),
          godown: item.godown || '',
          loadDateText: formatDateToText(item.dateOfLoad),
          loadDatePicker: item.dateOfLoad || '',
        });
        setMetadataOptions({
          companies: [...new Set([...(defaultMetadata.companies || []), ...(options.companies || [])])],
          categories: [...new Set([...(defaultMetadata.categories || []), ...(options.categories || [])])],
          measurements: [...new Set([...(defaultMetadata.measurements || []), ...(options.measurements || [])])],
        });
      })
      .catch((error) => setSubmitError(error.message || 'Could not load the product.'))
      .finally(() => setLoading(false));
  }, [id]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setMessage('');
    setSubmitError('');
  }

  function handleDatePickerChange(value) {
    setForm((prev) => ({ ...prev, loadDatePicker: value, loadDateText: formatDateToText(value) }));
    setErrors((prev) => ({ ...prev, loadDateText: '' }));
  }

  function handleDateTextBlur() {
    const dateValue = formatTextToDate(form.loadDateText);
    if (dateValue) {
      setForm((prev) => ({ ...prev, loadDatePicker: dateValue }));
      setErrors((prev) => ({ ...prev, loadDateText: '' }));
    } else if (form.loadDateText.trim()) {
      setErrors((prev) => ({ ...prev, loadDateText: 'Please enter a valid date in dd-mm-yyyy format.' }));
    }
  }

  function handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, productImage: 'Please upload a JPG or PNG image up to 5 MB.' }));
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateField('productImage', String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!/^\d+$/.test(form.quantity.trim())) nextErrors.quantity = 'Only numeric values are accepted.';
    if (!form.productName.trim()) nextErrors.productName = 'Product name is required.';
    if (!form.company.trim()) nextErrors.company = 'Company is required.';
    if (!form.category.trim()) nextErrors.category = 'Category is required.';
    if (form.loadDateText.trim() && !formatTextToDate(form.loadDateText)) {
      nextErrors.loadDateText = 'Please enter a valid date in dd-mm-yyyy format.';
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setSubmitError('');
    try {
      await updateInventoryItem(id, {
        measurement: form.measurement.trim(),
        productName: form.productName.trim(),
        productCode: form.productCode.trim(),
        productImage: form.productImage,
        company: form.company.trim(),
        category: form.category.trim(),
        quantity: Number(form.quantity.trim()),
        godown: form.godown.trim(),
        dateOfLoad: form.loadDatePicker || formatTextToDate(form.loadDateText) || '',
      });
      setMessage(`Saved changes to "${form.productName.trim()}".`);
    } catch (error) {
      setSubmitError(error.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${form.productName}"? This cannot be undone.`)) return;
    setDeleting(true);
    setSubmitError('');
    try {
      await deleteInventoryItem(id);
      navigate('/search', { replace: true });
    } catch (error) {
      setSubmitError(error.message || 'Could not delete the product.');
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="Edit existing" description="Modify or remove an existing inventory product." />
      <div className="app-content">
        <div className="page-card edit-existing-card">
          {!id && (
            <div className="edit-empty-state">
              <h2>Select a product to edit</h2>
              <p>Open Search inventory and choose Edit beside the product you want to change.</p>
              <Link className="btn btn-primary" to="/search">Open Search inventory</Link>
            </div>
          )}
          {submitError && <div className="alert-banner entry-error-banner" role="alert">{submitError}</div>}
          {message && <div className="alert-banner success" role="status">{message}</div>}
          {id && (loading ? <div className="edit-loading">Loading product...</div> : (
            <form onSubmit={handleSubmit} noValidate className="entry-form">
              <div className="form-grid entry-form-grid">
                <div className="field">
                  <label htmlFor="edit-measurement">Measurement</label>
                  <select className="ui-select" id="edit-measurement" value={form.measurement} onChange={(event) => updateField('measurement', event.target.value)}>
                    <option value="">Select measurement</option>
                    {metadataOptions.measurements.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="edit-productName">Product name <span aria-hidden="true">*</span></label>
                  <input className="ui-input" id="edit-productName" value={form.productName} onChange={(event) => updateField('productName', event.target.value)} />
                  {errors.productName && <div className="ui-error">{errors.productName}</div>}
                </div>
                <div className="field">
                  <label htmlFor="edit-company">Company <span aria-hidden="true">*</span></label>
                  <select className="ui-select" id="edit-company" value={form.company} onChange={(event) => updateField('company', event.target.value)}>
                    <option value="">Select company</option>
                    {metadataOptions.companies.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {errors.company && <div className="ui-error">{errors.company}</div>}
                </div>
                <div className="field">
                  <label htmlFor="edit-category">Category <span aria-hidden="true">*</span></label>
                  <select className="ui-select" id="edit-category" value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                    <option value="">Select category</option>
                    {metadataOptions.categories.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {errors.category && <div className="ui-error">{errors.category}</div>}
                </div>
                <div className="field">
                  <label htmlFor="edit-quantity">Quantity <span aria-hidden="true">*</span></label>
                  <input className="ui-input" type="number" min="0" step="1" id="edit-quantity" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
                  {errors.quantity && <div className="ui-error">{errors.quantity}</div>}
                </div>
                <div className="field">
                  <label htmlFor="edit-productCode">Product code</label>
                  <input className="ui-input" id="edit-productCode" value={form.productCode} onChange={(event) => updateField('productCode', event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="edit-productImage">Product image</label>
                  <input className="ui-input" type="file" id="edit-productImage" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleImageSelect} />
                  {form.productImage && <div className="edit-image-status">Current image will be kept unless replaced.</div>}
                  {errors.productImage && <div className="ui-error">{errors.productImage}</div>}
                </div>
                <div className="field">
                  <label htmlFor="edit-godown">Godown</label>
                  <input className="ui-input" id="edit-godown" value={form.godown} onChange={(event) => updateField('godown', event.target.value)} />
                </div>
              </div>
              <div className="field entry-date-field">
                <label htmlFor="edit-loadDateText">Date of load</label>
                <div className="date-row">
                  <div>
                    <input className="ui-input" id="edit-loadDateText" placeholder="dd-mm-yyyy" value={form.loadDateText} onChange={(event) => updateField('loadDateText', event.target.value)} onBlur={handleDateTextBlur} />
                    {errors.loadDateText && <div className="ui-error">{errors.loadDateText}</div>}
                  </div>
                  <input className="ui-input date-picker" type="date" aria-label="Choose date from calendar" value={form.loadDatePicker} onChange={(event) => handleDatePickerChange(event.target.value)} />
                </div>
              </div>
              <div className="entry-actions edit-existing-actions">
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/search')}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting || saving}>{deleting ? 'Deleting...' : 'Delete product'}</button>
                <button type="submit" className="btn btn-primary" disabled={saving || deleting}>{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </>
  );
}
