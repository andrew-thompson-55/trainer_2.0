import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider } from '../src/infrastructure/auth/auth-provider';
import { ThemeProvider } from '../src/infrastructure/theme';
import { PostHogProvider } from '@infra/analytics';
import { ToastProvider } from '@/context/ToastContext';
import { Toast } from '@/components/ui';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <PostHogProvider>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="add_workout" options={{ headerShown: false }} />
                <Stack.Screen name="edit_workout" options={{ headerShown: false }} />
                <Stack.Screen name="workout_details" options={{ headerShown: false }} />
                <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <Toast />
              <StatusBar style="auto" />
            </NavThemeProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}
