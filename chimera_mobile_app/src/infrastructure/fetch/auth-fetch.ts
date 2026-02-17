// Auth fetch - Platform-agnostic interface
// The bundler will automatically use the correct platform-specific implementation

// Re-export from native as fallback (bundler will use .web.ts or .native.ts as needed)
export { authFetch } from './auth-fetch.native';
