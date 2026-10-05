import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { createInventoryItem, fetchFilterOptions, updateInventoryFromSpreadsheet } from '../api/inventory';
import { defaultMetadata } from '../data/defaultMetadata';
import { formatDateToText, formatTextToDate } from '../utils/dateUtils';
import './Entry.css';

const spreadsheetHeaders = [
  'Measurement',
  'Product Name',
  'Product Code',
  'Company',
  'Category',
  'Quantity',
  'Godown',
  'Date of Load',
];

async function downloadSpreadsheetTemplate() {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventory Update');
  worksheet.addRow(spreadsheetHeaders);
  worksheet.columns = [16, 26, 20, 22, 22, 14, 18, 18].map((width) => ({ width }));
  worksheet.autoFilter = `A1:H1`;

  const blob = new Blob([await workbook.xlsx.writeBuffer()], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'inventory-update-template.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);
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

  async function handleSpreadsheetUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportResult(null);
    setImporting(true);
    const result = { updated: 0, skipped: [] };
    let attemptedBatches = 0;
    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error('Please select an .xlsx Excel file.');
      }

      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      if (workbook.worksheets.length !== 1) {
        throw new Error('The spreadsheet must contain exactly one worksheet.');
      }

      const worksheet = workbook.worksheets[0];
      const headerValues = spreadsheetHeaders.map((_, index) => worksheet.getRow(1).getCell(index + 1).text.trim());
      const hasUnexpectedHeaders = worksheet.getRow(1).cellCount > spreadsheetHeaders.length;
      if (
        hasUnexpectedHeaders ||
        headerValues.some((header, index) => header !== spreadsheetHeaders[index])
      ) {
        throw new Error(`Use the provided template with these columns in order: ${spreadsheetHeaders.join(', ')}.`);
      }

      const rows = [];
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);
        const values = spreadsheetHeaders.map((_, index) => {
          const value = row.getCell(index + 1).value;
          if (value === null || value === undefined) return '';
          if (value instanceof Date && index === 7) {
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          if (index === 2 && typeof value === 'number') {
            return row.getCell(index + 1).text.trim();
          }
          if (typeof value === 'string' || typeof value === 'number') return value;
          return { unsupportedCellValue: true };
        });
        let hasUnexpectedData = false;
        row.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
          if (columnNumber > spreadsheetHeaders.length && cell.value !== null && cell.value !== undefined && cell.value !== '') {
            hasUnexpectedData = true;
          }
        });

        if (values.every((value) => value === '') && !hasUnexpectedData) continue;

        rows.push({
          rowNumber,
          ...(hasUnexpectedData ? { unexpectedData: true } : {}),
          measurement: values[0],
          productName: values[1],
          productCode: values[2],
          company: values[3],
          category: values[4],
          quantity: values[5],
          godown: values[6],
          dateOfLoad: values[7],
        });
      }

      if (rows.length === 0) {
        throw new Error('The spreadsheet does not contain any product rows.');
      }

      const rowsByCode = new Map();
      rows.forEach((row) => {
        if (typeof row.productCode !== 'string' || !row.productCode.trim()) return;
        const code = row.productCode.trim();
        rowsByCode.set(code, [...(rowsByCode.get(code) || []), row]);
      });
      const duplicateRows = new Set(
        [...rowsByCode.values()]
          .filter((matchingRows) => matchingRows.length > 1)
          .flat()
          .map((row) => row.rowNumber),
      );
      rows.forEach((row) => {
        if (duplicateRows.has(row.rowNumber)) {
          result.skipped.push({
            rowNumber: row.rowNumber,
            message: 'Product Code appears more than once in the spreadsheet.',
          });
        }
      });
      const uniqueRows = rows.filter((row) => !duplicateRows.has(row.rowNumber));
      const batchSize = 25;
      for (let start = 0; start < uniqueRows.length; start += batchSize) {
        attemptedBatches += 1;
        const batchResult = await updateInventoryFromSpreadsheet(uniqueRows.slice(start, start + batchSize));
        result.updated += batchResult.updated;
        result.skipped.push(...batchResult.skipped);
      }
      setImportResult(result);
    } catch (err) {
      const message = err.message || 'Could not import spreadsheet.';
      setImportError(
        attemptedBatches > 0
          ? `Import stopped. ${result.updated} product${result.updated === 1 ? '' : 's'} were reported updated in completed batches; the interrupted batch may also have partially updated products. ${message}`
          : message,
      );
      if (result.updated > 0 || result.skipped.length > 0) setImportResult(result);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  }

  return (
    <>
      <PageHeader
        title="Update record"
        description="Add inventory records individually or update existing stock from an Excel spreadsheet."
      />
      <div className="app-content">
        <div className="page-card inventory-import-card">
          <h2>Update stock from Excel</h2>
          <p>
            Import an .xlsx file using the provided template. Product Code matches an existing product;
            Quantity replaces its current stock. Unknown metadata and invalid rows are skipped, and new
            products or metadata are never created.
          </p>
          <div className="inventory-import-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => downloadSpreadsheetTemplate().catch((err) => setImportError(err.message || 'Could not create template.'))}
              disabled={importing}
            >
              Download Excel template
            </button>
            <label className="field inventory-import-file">
              <span>Excel file (.xlsx)</span>
              <input
                className="ui-input"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleSpreadsheetUpload}
                disabled={importing}
              />
            </label>
          </div>
          {importError && (
            <div className="alert-banner entry-error-banner" role="alert">
              {importError}
            </div>
          )}
          {importing && <p className="ui-hint" role="status">Importing spreadsheet…</p>}
          {importResult && (
            <div className="alert-banner success" role="status">
              Updated {importResult.updated} product{importResult.updated === 1 ? '' : 's'}.
              {importResult.skipped.length > 0 && (
                <details className="inventory-import-skipped">
                  <summary>
                    {importResult.skipped.length} row{importResult.skipped.length === 1 ? '' : 's'} skipped
                  </summary>
                  <ul>
                    {importResult.skipped.map(({ rowNumber, message }, index) => (
                      <li key={`${rowNumber}-${index}`}>Row {rowNumber}: {message}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
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
