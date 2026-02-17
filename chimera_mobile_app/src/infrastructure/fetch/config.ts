// config.ts - Single source of truth for API configuration
import Constants from 'expo-constants';

export const API_BASE = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE || 
  'https://trainer-2-0.onrender.com/v1';
