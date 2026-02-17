// authFetch.ts - Authenticated fetch wrapper (NATIVE VERSION)
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './config';

export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Use SecureStore for native platforms
  const token = await SecureStore.getItemAsync('chimera_token');

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
