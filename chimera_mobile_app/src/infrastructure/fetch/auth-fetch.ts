// Auth fetch - platform-agnostic interface
// The actual implementation is provided by .web.ts or .native.ts files

// This base file re-exports from the native implementation as a fallback
// Metro/Webpack will automatically use the correct platform-specific file
export { authFetch } from './auth-fetch.native';
