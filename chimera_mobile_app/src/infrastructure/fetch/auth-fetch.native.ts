// authFetch.ts - Authenticated fetch wrapper (NATIVE VERSION)
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './config';
import { STORAGE_KEYS } from '../storage/keys';
import { captureEvent } from '../analytics/capture';

export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Use SecureStore for native platforms
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    captureEvent('api_error', { endpoint, status: response.status });
  }

  return response;
}
