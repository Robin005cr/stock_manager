import { apiRequest } from './client.js';

export function fetchMetadata(kind) {
  return apiRequest(`/api/metadata/${kind}`);
}

export function createMetadata(kind, value) {
  return apiRequest(`/api/metadata/${kind}`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  });
}

export function updateMetadata(kind, id, value) {
  return apiRequest(`/api/metadata/${kind}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export function deleteMetadata(kind, id) {
  return apiRequest(`/api/metadata/${kind}/${id}`, {
    method: 'DELETE',
  });
}
