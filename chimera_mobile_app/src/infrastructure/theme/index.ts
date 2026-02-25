export { ThemeProvider, useTheme } from './ThemeProvider';
export type { ThemeValue, ThemeMode } from './ThemeProvider';

// Re-export Layout and Typography from the legacy theme for gradual migration
export { Layout, Typography } from '../../../theme';
