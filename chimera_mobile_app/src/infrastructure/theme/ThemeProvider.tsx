import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { pkg } from '@infra/package';

const { colors: packageColors } = pkg;

type ColorMode = typeof packageColors.light;
type ActivityColors = typeof packageColors.activity;
type CheckinColors = typeof packageColors.checkin;
type CoachColors = typeof packageColors.coach.light;
type LoginColors = typeof packageColors.login.light;
type DashboardColors = typeof packageColors.dashboard;

export interface ThemeValue {
  colors: ColorMode;
  activity: ActivityColors;
  checkin: CheckinColors;
  coach: CoachColors;
  login: LoginColors;
  dashboard: DashboardColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const value = useMemo<ThemeValue>(() => ({
    colors: isDark ? packageColors.dark : packageColors.light,
    activity: packageColors.activity,
    checkin: packageColors.checkin,
    coach: isDark ? packageColors.coach.dark : packageColors.coach.light,
    login: isDark ? packageColors.login.dark : packageColors.login.light,
    dashboard: packageColors.dashboard,
    isDark,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
