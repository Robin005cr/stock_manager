import { apiRequest } from './client.js';

export function fetchTransportMovements(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, value);
  });
  const query = params.toString();
  return apiRequest(`/api/transport-movements${query ? `?${query}` : ''}`);
}

export function createTransportMovement(payload) {
  return apiRequest('/api/transport-movements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
