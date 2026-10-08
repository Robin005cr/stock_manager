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
        totals.set(booking.product.toString(), (totals.get(booking.product.toString()) || 0) + booking.quantity);
      }
    });
    return totals;
  }, [bookings]);

  function updateForm(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }));
    setError('');
    setNotice('');
  }

  function availableQuantity(product) {
    return Math.max(0, product.quantity - (reservedByProduct.get(product.id) || 0));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    const quantity = Number(form.quantity);
    const daysToHold = Number(form.daysToHold);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setError('Quantity must be a positive whole number.');
      return;
    }
    if (!Number.isSafeInteger(daysToHold) || daysToHold < 1) {
      setError('Days to hold must be a positive whole number.');
      return;
    }

    setSaving(true);
    try {
      await createStockBooking({ ...form, quantity, daysToHold });
      setForm(initialForm);
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
      setNotice(`${booking.quantity} units released from inventory.`);
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
              <label htmlFor="booking-product">Product name <span aria-hidden="true">*</span></label>
              <select
                className="ui-select"
                id="booking-product"
                value={form.productId}
                onChange={(event) => updateForm('productId', event.target.value)}
                required
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id} disabled={availableQuantity(product) < 1}>
                    {product.productName} ({availableQuantity(product)} available)
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="booking-quantity">Quantity <span aria-hidden="true">*</span></label>
              <input
                className="ui-input"
                id="booking-quantity"
                type="number"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(event) => updateForm('quantity', event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="booking-daysToHold">Days to be held <span aria-hidden="true">*</span></label>
              <input
                className="ui-input"
                id="booking-daysToHold"
                type="number"
                min="1"
                step="1"
                value={form.daysToHold}
                onChange={(event) => updateForm('daysToHold', event.target.value)}
                required
              />
            </div>
            <div className="stock-booking-form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || loading || products.length === 0}>
                {saving ? 'Booking…' : 'Book stock'}
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
                  <th>Days held</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="stock-booking-empty">Loading bookings…</td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan="8" className="stock-booking-empty">No stock bookings yet.</td></tr>
                ) : bookings.map((booking) => {
                  const status = getBookingStatus(booking);
                  return (
                    <tr key={booking.id}>
                      <td>{booking.customerName}</td>
                      <td>{booking.customerPhone}</td>
                      <td>{booking.productName}</td>
                      <td>{booking.quantity}</td>
                      <td>{booking.daysToHold}</td>
                      <td>{displayDate(booking.expiresAt)}</td>
                      <td><span className={`stock-booking-status ${status}`}>{status}</span></td>
                      <td>
                        {status === 'held' ? (
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
