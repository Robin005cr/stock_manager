import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { fetchInventory } from '../api/inventory';
import { createStockBooking, fetchStockBookings, releaseStockBooking } from '../api/stockBookings';
import './StockBooking.css';

const initialForm = {
  customerName: '',
  customerPhone: '',
  productId: '',
  quantity: '',
  daysToHold: '',
};

function displayDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function getBookingStatus(booking) {
  if (booking.status === 'held' && new Date(booking.expiresAt) <= new Date()) return 'expired';
  return booking.status;
}

export default function StockBooking() {
  const [form, setForm] = useState(initialForm);
  const [bookingItems, setBookingItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [releasingId, setReleasingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    const [inventoryData, bookingData] = await Promise.all([
      fetchInventory(),
      fetchStockBookings(),
    ]);
    setProducts(inventoryData.items || []);
    setBookings(bookingData.items || []);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchInventory(), fetchStockBookings()])
      .then(([inventoryData, bookingData]) => {
        if (!active) return;
        setProducts(inventoryData.items || []);
        setBookings(bookingData.items || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load stock bookings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const reservedByProduct = useMemo(() => {
    const totals = new Map();
    bookings.forEach((booking) => {
      if (getBookingStatus(booking) === 'held') {
        totals.set(
          booking.product.toString(),
          (totals.get(booking.product.toString()) || 0) + (booking.reservedQuantity ?? booking.quantity),
        );
      }
    });
    return totals;
  }, [bookings]);

  const bookingQuantityByProduct = useMemo(() => {
    const totals = new Map();
    bookingItems.forEach((item) => {
      totals.set(item.productId, (totals.get(item.productId) || 0) + item.reservedQuantity);
    });
    return totals;
  }, [bookingItems]);

  function updateForm(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }));
    setError('');
    setNotice('');
  }

  function availableQuantity(product, includeBookingItems = true) {
    const reserved = reservedByProduct.get(product.id) || 0;
    const inCurrentBooking = includeBookingItems ? bookingQuantityByProduct.get(product.id) || 0 : 0;
    return Math.max(0, product.quantity - reserved - inCurrentBooking);
  }

  function handleAddItem() {
    setError('');
    setNotice('');
    const product = products.find((item) => item.id === form.productId);
    const quantity = Number(form.quantity);
    if (!product) {
      setError('Select a product to add.');
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setError('Quantity must be a positive whole number.');
      return;
    }
    const available = availableQuantity(product);
    const existingItem = bookingItems.find((item) => item.productId === product.id);
    if (existingItem && !Number.isSafeInteger(existingItem.quantity + quantity)) {
      setError('Combined product quantity is outside the supported range.');
      return;
    }

    setBookingItems((previous) => {
      if (existingItem) {
        const reservedQuantity = Math.min(quantity, available);
        return previous.map((item) => (
          item.productId === product.id
            ? {
              ...item,
              quantity: item.quantity + quantity,
              reservedQuantity: item.reservedQuantity + reservedQuantity,
            }
            : item
        ));
      }
      return [...previous, {
        productId: product.id,
        productName: product.productName,
        quantity,
        reservedQuantity: Math.min(quantity, available),
      }];
    });
    setForm((previous) => ({ ...previous, productId: '', quantity: '' }));
  }

  function handleRemoveItem(productId) {
    setBookingItems((previous) => previous.filter((item) => item.productId !== productId));
    setError('');
    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    const daysToHold = Number(form.daysToHold);
    if (!Number.isSafeInteger(daysToHold) || daysToHold < 1 || daysToHold > 60) {
      setError('Days to hold must be a whole number from 1 to 60.');
      return;
    }
    if (bookingItems.length === 0) {
      setError('Add at least one product to the booking.');
      return;
    }

    setSaving(true);
    try {
      await createStockBooking({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        items: bookingItems.map(({ productId, quantity }) => ({ productId, quantity })),
        daysToHold,
      });
      setForm(initialForm);
      setBookingItems([]);
      setNotice('Stock booking created successfully.');
      try {
        await loadData();
      } catch (refreshError) {
        setError(`Booking was created, but the latest stock data could not be refreshed: ${refreshError.message}`);
      }
    } catch (err) {
      setError(err.message || 'Could not create the stock booking.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease(booking) {
    setError('');
    setNotice('');
    setReleasingId(booking.id);
    try {
      await releaseStockBooking(booking.id);
      setNotice(`${booking.reservedQuantity ?? booking.quantity} units released from inventory.`);
      try {
        await loadData();
      } catch (refreshError) {
        setError(`The booking was released, but the latest stock data could not be refreshed: ${refreshError.message}`);
      }
    } catch (err) {
      setError(err.message || 'Could not release this stock booking.');
    } finally {
      setReleasingId('');
    }
  }

  return (
    <>
      <PageHeader
        title="Stock booking"
        description="Reserve inventory for customers and release it when a purchase is completed."
      />
      <div className="app-content stock-booking-page">
        {error && <div className="alert-banner entry-error-banner" role="alert">{error}</div>}
        {notice && <div className="alert-banner success" role="status">{notice}</div>}

        <section className="page-card stock-booking-form-card" aria-label="Create stock booking">
          <h2>Book stock for a customer</h2>
          <form className="form-grid stock-booking-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="booking-customerName">Customer name <span aria-hidden="true">*</span></label>
              <input
                className="ui-input"
                id="booking-customerName"
                value={form.customerName}
                onChange={(event) => updateForm('customerName', event.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="booking-customerPhone">Customer phone number <span aria-hidden="true">*</span></label>
              <input
                className="ui-input"
                id="booking-customerPhone"
                type="tel"
                value={form.customerPhone}
                onChange={(event) => updateForm('customerPhone', event.target.value)}
                maxLength={40}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="booking-product">Product name</label>
              <select
                className="ui-select"
                id="booking-product"
                value={form.productId}
                onChange={(event) => updateForm('productId', event.target.value)}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.productName} ({availableQuantity(product)} available)
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="booking-quantity">Quantity</label>
              <input
                className="ui-input"
                id="booking-quantity"
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(event) => updateForm('quantity', event.target.value)}
              />
            </div>
            <div className="stock-booking-add-item">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddItem}
                disabled={saving || loading || products.length === 0}
              >
                Add item
              </button>
            </div>
            <div className="field">
              <label htmlFor="booking-daysToHold">Days to be held (maximum 60) <span aria-hidden="true">*</span></label>
              <input
                className="ui-input"
                id="booking-daysToHold"
                type="number"
                min="1"
                max="60"
                step="1"
                value={form.daysToHold}
                onChange={(event) => updateForm('daysToHold', event.target.value)}
                required
              />
            </div>
            <div className="stock-booking-cart">
              <h3>Items in this booking</h3>
              {bookingItems.length === 0 ? (
                <p className="stock-booking-cart-empty">Add one or more products above.</p>
              ) : (
                <ul>
                  {bookingItems.map((item) => (
                    <li key={item.productId}>
                      <span>
                        {item.productName} <strong>× {item.quantity}</strong>
                        <span className="stock-booking-cart-details">
                          Reserved now: {item.reservedQuantity} · To be booked (deficient quantity):{' '}
                          <strong className={item.quantity > item.reservedQuantity ? 'stock-booking-deficit' : ''}>
                            {item.quantity - item.reservedQuantity}
                          </strong>
                        </span>
                      </span>
                      <button
                        type="button"
                        className="stock-booking-remove-item"
                        onClick={() => handleRemoveItem(item.productId)}
                        aria-label={`Remove ${item.productName} from booking`}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="stock-booking-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || loading || products.length === 0 || bookingItems.length === 0}
              >
                {saving
                  ? 'Booking…'
                  : bookingItems.length
                    ? `Book ${bookingItems.length} item${bookingItems.length === 1 ? '' : 's'}`
                    : 'Book stock'}
              </button>
            </div>
          </form>
          {!loading && products.length === 0 && (
            <p className="stock-booking-empty" role="status">Add inventory products before creating a booking.</p>
          )}
        </section>

        <section className="page-card stock-booking-results-card" aria-label="Stock bookings">
          <div className="stock-booking-heading">
            <div>
              <h2>Bookings</h2>
              <p>Active bookings reserve stock until their hold period ends.</p>
            </div>
            <span>{bookings.length} total</span>
          </div>
          <div className="stock-booking-table-wrap">
            <table className="stock-booking-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone number</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Reserved</th>
                  <th title="Deficient quantity not currently available in stock">To be booked</th>
                  <th>Days held</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" className="stock-booking-empty">Loading bookings…</td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan="10" className="stock-booking-empty">No stock bookings yet.</td></tr>
                ) : bookings.map((booking) => {
                  const status = getBookingStatus(booking);
                  return (
                    <tr key={booking.id}>
                      <td>{booking.customerName}</td>
                      <td>{booking.customerPhone}</td>
                      <td>{booking.productName}</td>
                      <td>{booking.quantity}</td>
                      <td>{booking.reservedQuantity ?? booking.quantity}</td>
                      <td
                        className={(booking.deficientQuantity ?? 0) > 0 ? 'stock-booking-deficit' : ''}
                        title="Deficient quantity not currently available in stock"
                      >
                        {booking.deficientQuantity ?? 0}
                      </td>
                      <td>{booking.daysToHold}</td>
                      <td>{displayDate(booking.expiresAt)}</td>
                      <td><span className={`stock-booking-status ${status}`}>{status}</span></td>
                      <td>
                        {status === 'held' && (booking.reservedQuantity ?? booking.quantity) > 0 ? (
                          <button
                            type="button"
                            className="btn btn-primary stock-booking-release"
                            onClick={() => handleRelease(booking)}
                            disabled={Boolean(releasingId)}
                          >
                            {releasingId === booking.id ? 'Releasing…' : 'Release'}
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
