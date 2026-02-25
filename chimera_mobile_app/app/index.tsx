import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@infra/auth/auth-provider';
import { useTheme } from '@infra/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../src/infrastructure/storage/keys';

export default function Index() {
  const { user, isLoading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [redirectRoute, setRedirectRoute] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkRoute() {
        try {
            const savedRoute = await AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_ROUTE);
            setRedirectRoute(savedRoute || '/(tabs)'); // Default to Home if nothing saved
        } catch (e) {
            setRedirectRoute('/(tabs)');
        } finally {
            setIsReady(true);
        }
    }
    checkRoute();
  }, []);

  // Wait for BOTH Auth and Storage check
  if (authLoading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If logged in -> Go to Preferred Route
  if (user) return <Redirect href={redirectRoute as any} />;

  // If not logged in -> Go Login
  return <Redirect href="/(auth)/login" />;
}
