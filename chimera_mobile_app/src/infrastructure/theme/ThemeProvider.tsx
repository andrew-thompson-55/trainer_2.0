import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pkg } from '@infra/package';
import { STORAGE_KEYS } from '@infra/storage/keys';

const { colors: packageColors } = pkg;

type ColorMode = typeof packageColors.light;
type ActivityColors = typeof packageColors.activity;
type CheckinColors = typeof packageColors.checkin;
type CoachColors = typeof packageColors.coach.light;
type LoginColors = typeof packageColors.login.light;
type DashboardColors = typeof packageColors.dashboard;

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface ThemeValue {
  colors: ColorMode;
  activity: ActivityColors;
  checkin: CheckinColors;
  coach: CoachColors;
  login: LoginColors;
  dashboard: DashboardColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE).then(val => {
      if (val === 'light' || val === 'dark' || val === 'auto') {
        setThemeModeState(val);
      }
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
  }, []);

  const isDark = themeMode === 'auto' ? systemScheme === 'dark' : themeMode === 'dark';

  const value = useMemo<ThemeValue>(() => ({
    colors: isDark ? packageColors.dark : packageColors.light,
    activity: packageColors.activity,
    checkin: packageColors.checkin,
    coach: isDark ? packageColors.coach.dark : packageColors.coach.light,
    login: isDark ? packageColors.login.dark : packageColors.login.light,
    dashboard: packageColors.dashboard,
    isDark,
    themeMode,
    setThemeMode,
  }), [isDark, themeMode, setThemeMode]);

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
