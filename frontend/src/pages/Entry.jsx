import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Entry.css';
import { formatDateToText, formatTextToDate } from '../utils/dateUtils';

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

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
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

  function handleSubmit(event) {
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

    alert('Entry saved successfully.');
    setForm(initialForm);
    setErrors({});
  }

  return (
    <div className="entry-page">
      <div className="container">
        <nav className="page-nav">
          <Link to="/search">Search</Link>
          <Link to="/login">Login</Link>
        </nav>
        <h1>Update Record</h1>
        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="measurement">Measurement</label>
            <input
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
              Product Name <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="productName"
              name="productName"
              required
              placeholder="Enter product name"
              value={form.productName}
              onChange={(e) => updateField('productName', e.target.value)}
            />
            {errors.productName && <div className="error">{errors.productName}</div>}
          </div>
          <div className="field">
            <label htmlFor="company">
              Company <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="company"
              name="company"
              required
              placeholder="Enter company"
              value={form.company}
              onChange={(e) => updateField('company', e.target.value)}
            />
            {errors.company && <div className="error">{errors.company}</div>}
          </div>
          <div className="field">
            <label htmlFor="category">
              Category <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="category"
              name="category"
              required
              placeholder="Enter category"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            />
            {errors.category && <div className="error">{errors.category}</div>}
          </div>
          <div className="field">
            <label htmlFor="quantity">
              Quantity <span aria-hidden="true">*</span>
            </label>
            <input
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
            <div className="hint">Only numeric values are accepted.</div>
            {errors.quantity && <div className="error">{errors.quantity}</div>}
          </div>
          <div className="field">
            <label htmlFor="godown">
              Godown <span aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="godown"
              name="godown"
              required
              placeholder="Enter godown"
              value={form.godown}
              onChange={(e) => updateField('godown', e.target.value)}
            />
            {errors.godown && <div className="error">{errors.godown}</div>}
          </div>
          <div className="field">
            <label>Date of Load</label>
            <div className="date-row">
              <div>
                <input
                  type="text"
                  id="loadDateText"
                  name="loadDateText"
                  placeholder="dd-mm-yyyy"
                  autoComplete="off"
                  value={form.loadDateText}
                  onChange={(e) => updateField('loadDateText', e.target.value)}
                  onBlur={handleDateTextBlur}
                />
                <div className="hint">Type the date as dd-mm-yyyy or choose from the calendar.</div>
                {errors.loadDateText && <div className="error">{errors.loadDateText}</div>}
              </div>
              <div>
                <input
                  type="date"
                  id="loadDatePicker"
                  aria-label="Choose date from calendar"
                  value={form.loadDatePicker}
                  onChange={(e) => handleDatePickerChange(e.target.value)}
                />
              </div>
            </div>
          </div>
          <button type="submit">Save Update</button>
        </form>
      </div>
    </div>
  );
}
