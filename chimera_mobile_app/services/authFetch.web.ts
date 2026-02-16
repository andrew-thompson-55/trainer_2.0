// authFetch.ts - Authenticated fetch wrapper (WEB VERSION)
import { API_BASE } from './config';

export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Use localStorage for web instead of SecureStore
  const token = localStorage.getItem('chimera_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
}
