// 🎨 THEME SOURCE OF TRUTH
// To "Drag and Drop" a new look, you just replace this file!

export const Colors = {
  // Brand
  primary: '#007AFF',       // iOS Blue
  success: '#34C759',       // Green
  danger: '#FF3B30',        // Red
  
  // Backgrounds
  background: '#F2F2F7',    // Light Gray (App Background)
  card: '#FFFFFF',          // Pure White (Cards)
  header: '#FFFFFF',        // Top Bar
  
  // Text
  textPrimary: '#000000',   // Main Titles
  textSecondary: '#8E8E93', // Subtitles / Metadata
  
  // UI Elements
  border: '#E5E5EA',        // Thin lines
  iconInactive: '#C7C7CC',  // Unchecked boxes

  // Activity Specific Colors
  activity: {
    run: '#FF3B30',      // Red
    bike: '#007AFF',     // Blue
    swim: '#5AC8FA',     // Light Blue
    strength: '#AF52DE', // Purple
    other: '#8E8E93'     // Gray
  } as Record<string, string>,

  // Check-in Colors
  checkin: {
    worst: '#ef4444',      // Red
    low: '#f97316',        // Orange
    mid: '#eab308',        // Yellow
    good: '#22c55e',       // Green
    best: '#10b981',       // Emerald
    streakBg: '#fef3c7',   // Amber-50
    streakText: '#b45309',  // Amber-700
    savedBg: '#f0fdf4',    // Green-50
    savedBorder: '#bbf7d0', // Green-200
    savedText: '#166534',   // Green-800
  },
};

export const Layout = {
  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24
  },
  borderRadius: {
    s: 8,
    m: 12,
    round: 100,
  },
  checkin: {
    cardRadius: 20,
    optionRadius: 16,
    maxWidth: 420,
  },
};

export const Typography = {
  header: {
    fontSize: 34,
    fontWeight: 'bold' as 'bold',
    color: Colors.textPrimary,
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '700' as '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase' as 'uppercase',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600' as '600',
    color: Colors.textPrimary,
  }
};