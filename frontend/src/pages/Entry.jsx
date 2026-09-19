import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { createInventoryItem, fetchFilterOptions } from '../api/inventory';
import { defaultMetadata } from '../data/defaultMetadata';
import { formatDateToText, formatTextToDate } from '../utils/dateUtils';
import './Entry.css';

const initialForm = {
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

export default function Entry() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [metadataOptions, setMetadataOptions] = useState({ companies: [], categories: [], measurements: [] });

  useEffect(() => {
    fetchFilterOptions()
      .then((data) => {
        setMetadataOptions({
          companies: [...new Set([...(defaultMetadata.companies || []), ...(data.companies || [])])],
          categories: [...new Set([...(defaultMetadata.categories || []), ...(data.categories || [])])],
          measurements: [...new Set([...(defaultMetadata.measurements || []), ...(data.measurements || [])])],
        });
      })
      .catch(() =>
        setMetadataOptions({
          companies: defaultMetadata.companies,
          categories: defaultMetadata.categories,
          measurements: defaultMetadata.measurements,
        }),
      );
  }, []);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSuccessMessage('');
    setSubmitError('');
  }

  function handleDatePickerChange(value) {
    setForm((prev) => ({
      ...prev,
      loadDatePicker: value,
      loadDateText: formatDateToText(value),
    }));
    setErrors((prev) => ({ ...prev, loadDateText: '' }));
  }

  function handleDateTextBlur() {
    const dateValue = formatTextToDate(form.loadDateText);
    if (dateValue) {
      setForm((prev) => ({ ...prev, loadDatePicker: dateValue }));
      setErrors((prev) => ({ ...prev, loadDateText: '' }));
    } else if (form.loadDateText.trim() !== '') {
      setErrors((prev) => ({
        ...prev,
        loadDateText: 'Please enter a valid date in dd-mm-yyyy format.',
      }));
    } else {
      setErrors((prev) => ({ ...prev, loadDateText: '' }));
    }
  }

  function handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, productImage: '' }));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxBytes = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type) || file.size > maxBytes) {
      setErrors((prev) => ({
        ...prev,
        productImage: 'Please upload a JPG or PNG image up to 5 MB.',
      }));
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, productImage: String(reader.result || '') }));
      setErrors((prev) => ({ ...prev, productImage: '' }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const quantityValue = form.quantity.trim();
    const isQuantityValid = /^\d+$/.test(quantityValue);

    if (!isQuantityValid) {
      nextErrors.quantity = 'Only numeric values are accepted.';
    }

    if (form.loadDateText.trim() !== '' && !formatTextToDate(form.loadDateText)) {
      nextErrors.loadDateText = 'Please enter a valid date in dd-mm-yyyy format.';
    }

    if (!form.productName.trim()) nextErrors.productName = 'Product name is required.';
    if (!form.company.trim()) nextErrors.company = 'Company is required.';
    if (!form.category.trim()) nextErrors.category = 'Category is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setSubmitError('');
    try {
      await createInventoryItem({
        measurement: form.measurement.trim(),
        productName: form.productName.trim(),
        productCode: form.productCode.trim(),
        productImage: form.productImage,
        company: form.company.trim(),
        category: form.category.trim(),
        quantity: Number(quantityValue),
        godown: form.godown.trim(),
        dateOfLoad: form.loadDatePicker || formatTextToDate(form.loadDateText) || '',
      });
      setSuccessMessage(`Saved "${form.productName.trim()}" to MongoDB.`);
      setForm(initialForm);
      setErrors({});
    } catch (err) {
      setSubmitError(err.message || 'Could not save to the server.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Update record"
        description="New entries are saved to MongoDB through the backend API."
      />
      <div className="app-content">
        <div className="page-card entry-form-card">
          {submitError && (
            <div className="alert-banner entry-error-banner" role="alert">
              {submitError}
            </div>
          )}
          {successMessage && (
            <div className="alert-banner success" role="status">
              {successMessage}
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate className="entry-form">
            <div className="form-grid entry-form-grid">
              <div className="field">
                <label htmlFor="measurement">Measurement</label>
                <select
                  className="ui-select"
                  id="measurement"
                  name="measurement"
                  value={form.measurement}
                  onChange={(e) => updateField('measurement', e.target.value)}
                >
                  <option value="">Select measurement</option>
                  {metadataOptions.measurements.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="productName">
                  Product name <span aria-hidden="true">*</span>
                </label>
                <input
                  className="ui-input"
                  type="text"
                  id="productName"
                  name="productName"
                  required
                  placeholder="Enter product name"
                  value={form.productName}
                  onChange={(e) => updateField('productName', e.target.value)}
                />
                {errors.productName && <div className="ui-error">{errors.productName}</div>}
              </div>
              <div className="field">
                <label htmlFor="company">
                  Company <span aria-hidden="true">*</span>
                </label>
                <select
                  className="ui-select"
                  id="company"
                  name="company"
                  required
                  value={form.company}
                  onChange={(e) => updateField('company', e.target.value)}
                >
                  <option value="">Select company</option>
                  {metadataOptions.companies.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.company && <div className="ui-error">{errors.company}</div>}
              </div>
              <div className="field">
                <label htmlFor="category">
                  Category <span aria-hidden="true">*</span>
                </label>
                <select
                  className="ui-select"
                  id="category"
                  name="category"
                  required
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                >
                  <option value="">Select category</option>
                  {metadataOptions.categories.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.category && <div className="ui-error">{errors.category}</div>}
              </div>
              <div className="field">
                <label htmlFor="quantity">
                  Quantity <span aria-hidden="true">*</span>
                </label>
                <input
                  className="ui-input"
                  type="number"
                  id="quantity"
                  name="quantity"
                  required
                  min="0"
                  step="1"
                  placeholder="Enter quantity"
                  value={form.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                />
                <div className="ui-hint">Numeric values only.</div>
                {errors.quantity && <div className="ui-error">{errors.quantity}</div>}
              </div>
              <div className="field">
                <label htmlFor="productCode">Product code</label>
                <input
                  className="ui-input"
                  type="text"
                  id="productCode"
                  name="productCode"
                  placeholder="Enter product code"
                  value={form.productCode}
                  onChange={(e) => updateField('productCode', e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="productImage">Product image</label>
                <input
                  className="ui-input"
                  type="file"
                  id="productImage"
                  name="productImage"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleImageSelect}
                />
                <div className="ui-hint">JPG or PNG only, up to 5 MB.</div>
                {errors.productImage && <div className="ui-error">{errors.productImage}</div>}
              </div>
              <div className="field">
                <label htmlFor="godown">Godown</label>
                <input
                  className="ui-input"
                  type="text"
                  id="godown"
                  name="godown"
                  placeholder="Enter godown"
                  value={form.godown}
                  onChange={(e) => updateField('godown', e.target.value)}
                />
              </div>
            </div>
            <div className="field entry-date-field">
              <label htmlFor="loadDateText">Date of load</label>
              <div className="date-row">
                <div>
                  <input
                    className="ui-input"
                    type="text"
                    id="loadDateText"
                    name="loadDateText"
                    placeholder="dd-mm-yyyy"
                    autoComplete="off"
                    value={form.loadDateText}
                    onChange={(e) => updateField('loadDateText', e.target.value)}
                    onBlur={handleDateTextBlur}
                  />
                  <div className="ui-hint">Type dd-mm-yyyy or use the calendar.</div>
                  {errors.loadDateText && <div className="ui-error">{errors.loadDateText}</div>}
                </div>
                <input
                  className="ui-input date-picker"
                  type="date"
                  id="loadDatePicker"
                  aria-label="Choose date from calendar"
                  value={form.loadDatePicker}
                  onChange={(e) => handleDatePickerChange(e.target.value)}
                />
              </div>
            </div>
            <div className="entry-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
