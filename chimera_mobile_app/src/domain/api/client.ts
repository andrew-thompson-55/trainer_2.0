// API Client Factory - Platform-agnostic API layer

export type FetchFn = (endpoint: string, options?: RequestInit) => Promise<Response>;

/**
 * Creates an API client that works with any fetch implementation.
 * Platform-specific fetch (with auth, network detection, etc.) is injected.
 */
export function createApiClient(fetchFn: FetchFn) {
  return {
    fetch: fetchFn,
  };
}
