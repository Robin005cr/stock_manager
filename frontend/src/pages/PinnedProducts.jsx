import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { usePinnedProducts } from '../state/PinnedProductsContext';
import { exportResults } from '../utils/exportUtils';
import './PinnedProducts.css';

export default function PinnedProducts() {
  const { pinnedProducts, togglePinned } = usePinnedProducts();
  const [exportError, setExportError] = useState('');

  async function handleExport() {
    setExportError('');
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const defaultFileName = `pinned-products-export_${pad(now.getDate())}_${pad(now.getMonth() + 1)}_${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
    const fileName = window.prompt('Enter a name for the PDF export:', defaultFileName);
    if (fileName === null) return;
    if (!fileName.trim()) {
      setExportError('Enter a name for the export.');
      return;
    }

    try {
      await exportResults(pinnedProducts, 'pdf', fileName, {
        headers: ['Measurement', 'Product Name', 'Company', 'Quantity'],
        getRows: (products) => products.map((item) => [
          item.measurement,
          item.productName,
          item.company,
          item.quantity,
        ]),
        title: 'Pinned Products Export',
      });
    } catch (error) {
      setExportError(error.message || 'Could not export pinned products.');
    }
  }

  return (
    <>
      <PageHeader
        title="Pinned Products"
        description="Your saved products are kept here for quick access."
      />
      <div className="app-content">
        <div className="page-card pinned-products-card">
          <div className="pinned-export-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={!pinnedProducts.length}
            >
              Export PDF
            </button>
          </div>
          {exportError && (
            <div className="alert-banner pinned-export-error" role="alert">
              {exportError}
            </div>
          )}
          {pinnedProducts.length === 0 ? (
            <div className="empty-state pinned-empty-state">
              No pinned products yet. Pin a product from Search inventory to see it here.
            </div>
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
                    <th aria-label="Remove pin" />
                  </tr>
                </thead>
                <tbody>
                  {pinnedProducts.map((item) => (
                    <tr key={item.id ?? `${item.productName}-${item.company}-${item.godown}-${item.dateOfLoad}`}>
                      <td>{item.measurement}</td>
                      <td>
                        <strong>{item.productName}</strong>
                        {item.productCode && <small className="pinned-product-code">{item.productCode}</small>}
                      </td>
                      <td>{item.company}</td>
                      <td><span className="category-pill">{item.category}</span></td>
                      <td>{item.quantity}</td>
                      <td>{item.godown}</td>
                      <td>{item.dateOfLoad}</td>
                      <td className="pin-cell">
                        <button
                          type="button"
                          className="pin-button pinned"
                          onClick={() => togglePinned(item)}
                          aria-label={`Unpin ${item.productName}`}
                          title="Remove from pinned products"
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
    </>
  );
}
