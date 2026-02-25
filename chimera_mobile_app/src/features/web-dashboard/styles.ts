export const COLORS = {
  bg: '#0a0e17',
  surface: '#111827',
  surfaceHover: '#1a2234',
  border: '#1e293b',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  accent: '#3b82f6',
  accentDim: '#1e3a5f',
  green: '#22c55e',
  greenDim: '#14532d',
  red: '#ef4444',
  redDim: '#7f1d1d',
  orange: '#f59e0b',
  purple: '#a855f7',
  cyan: '#06b6d4',
} as const;

export const FONT = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', monospace",
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

export const ACTIVITY_COLORS: Record<string, string> = {
  run: '#3b82f6',
  trail_run: '#22c55e',
  hike: '#f59e0b',
  ride: '#a855f7',
  swim: '#06b6d4',
  walk: '#94a3b8',
  workout: '#ef4444',
  default: '#64748b',
};

export function getActivityColor(type: string | null): string {
  if (!type) return ACTIVITY_COLORS.default;
  return ACTIVITY_COLORS[type.toLowerCase()] || ACTIVITY_COLORS.default;
}
