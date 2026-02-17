// authFetch.ts - Authenticated fetch wrapper (WEB VERSION)
import { API_BASE } from './config';

export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  console.log('[auth-fetch.web] Running WEB version using localStorage');
  // Use localStorage for web instead of SecureStore
  const token = localStorage.getItem('chimera_token');
  console.log('[auth-fetch.web] Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
}
