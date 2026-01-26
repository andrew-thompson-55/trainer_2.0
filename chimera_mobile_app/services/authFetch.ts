// authFetch.ts - Authenticated fetch wrapper
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './config';

export async function authFetch(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = await SecureStore.getItemAsync('chimera_token');
  
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
