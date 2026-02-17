// PlanScreen - Platform-agnostic entry point
// The bundler will automatically use the correct platform-specific implementation

// Re-export from native as fallback (bundler will use .web.tsx or .native.tsx as needed)
export { default } from './PlanScreen.native';
