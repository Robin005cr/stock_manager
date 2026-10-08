import { apiRequest } from './client.js';

export function fetchStockBookings() {
  return apiRequest('/api/stock-bookings');
}

export function createStockBooking(payload) {
  return apiRequest('/api/stock-bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function releaseStockBooking(id) {
  return apiRequest(`/api/stock-bookings/${id}/release`, {
    method: 'PATCH',
  });
}
