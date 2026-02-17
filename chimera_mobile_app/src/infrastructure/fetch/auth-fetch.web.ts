// authFetch.ts - Authenticated fetch wrapper (WEB VERSION)
import { API_BASE } from './config';

export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Use localStorage for web instead of SecureStore
  const token = localStorage.getItem('chimera_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`[WEB authFetch] ${options.method || 'GET'} ${API_BASE}${endpoint}`);
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  console.log(`[WEB authFetch] Response status: ${response.status}`);

  // Clone the response so we can log it without consuming the body
  const clonedResponse = response.clone();
  try {
    const data = await clonedResponse.json();
    console.log(`[WEB authFetch] Response data:`, data);
  } catch (e) {
    console.log(`[WEB authFetch] Could not parse JSON response`);
  }

  return response;
}
