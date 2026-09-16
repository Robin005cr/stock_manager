import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { createInventoryItem } from '../api/inventory';
import { formatDateToText, formatTextToDate } from '../utils/dateUtils';
import './Entry.css';

const initialForm = {
  measurement: '',
  productName: '',
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
    if (!form.godown.trim()) nextErrors.godown = 'Godown is required.';

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
                <input
                  className="ui-input"
                  type="text"
                  id="measurement"
                  name="measurement"
                  placeholder="e.g. 2 kg, 50 cm"
                  value={form.measurement}
                  onChange={(e) => updateField('measurement', e.target.value)}
                />
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
                <input
                  className="ui-input"
                  type="text"
                  id="company"
                  name="company"
                  required
                  placeholder="Enter company"
                  value={form.company}
                  onChange={(e) => updateField('company', e.target.value)}
                />
                {errors.company && <div className="ui-error">{errors.company}</div>}
              </div>
              <div className="field">
                <label htmlFor="category">
                  Category <span aria-hidden="true">*</span>
                </label>
                <input
                  className="ui-input"
                  type="text"
                  id="category"
                  name="category"
                  required
                  placeholder="Enter category"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                />
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
                <label htmlFor="godown">
                  Godown <span aria-hidden="true">*</span>
                </label>
                <input
                  className="ui-input"
                  type="text"
                  id="godown"
                  name="godown"
                  required
                  placeholder="Enter godown"
                  value={form.godown}
                  onChange={(e) => updateField('godown', e.target.value)}
                />
                {errors.godown && <div className="ui-error">{errors.godown}</div>}
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
