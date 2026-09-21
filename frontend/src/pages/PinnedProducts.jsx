import PageHeader from '../components/PageHeader';
import { usePinnedProducts } from '../state/PinnedProductsContext';
import './PinnedProducts.css';

export default function PinnedProducts() {
  const { pinnedProducts, togglePinned } = usePinnedProducts();

  return (
    <>
      <PageHeader
        title="Pinned Products"
        description="Your saved products are kept here for quick access."
      />
      <div className="app-content">
        <div className="page-card pinned-products-card">
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
