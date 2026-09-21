import { apiRequest } from './client.js';

export function fetchInventory(filters = {}) {
  const params = new URLSearchParams();
  const map = {
    searchTerm: filters.searchTerm,
    measurement: filters.measurementValue,
    company: filters.companyValue,
    category: filters.categoryValue,
    quantity: filters.quantityValue,
    godown: filters.godownValue,
    date: filters.dateValue,
  };

  Object.entries(map).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return apiRequest(`/api/inventory${query ? `?${query}` : ''}`);
}

export function fetchFilterOptions() {
  return apiRequest('/api/inventory/filter-options');
}

export function fetchInventoryItem(id) {
  return apiRequest(`/api/inventory/${id}`);
}

export function createInventoryItem(payload) {
  return apiRequest('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateInventoryItem(id, payload) {
  return apiRequest(`/api/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteInventoryItem(id) {
  return apiRequest(`/api/inventory/${id}`, {
    method: 'DELETE',
  });
}
