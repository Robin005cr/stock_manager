import { apiRequest } from './client.js';

export function login({ email, password, role }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export function register({ email, password, role }) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export function saveSession(token, user) {
  sessionStorage.setItem('sm_token', token);
  sessionStorage.setItem('sm_user', JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem('sm_token');
  sessionStorage.removeItem('sm_user');
}

export function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem('sm_user') || 'null');
  } catch {
    return null;
  }
}

export function hasSession() {
  return Boolean(sessionStorage.getItem('sm_token') && getSessionUser());
}
