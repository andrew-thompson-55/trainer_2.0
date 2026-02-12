import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authFetch } from '../services/authFetch';

export default function RedirectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    async function handleAuth() {
      const { code, error } = params;

      if (error) {
        Alert.alert("Strava Error", error as string);
        router.replace('/(tabs)/settings');
        return;
      }

      if (code) {
        try {
          // Send code to backend
          const response = await authFetch('/integrations/strava/exchange', {
            method: 'POST',
            body: JSON.stringify({ code })
          });

          if (response.ok) {
            Alert.alert("Success", "Strava connected successfully!");
          } else {
            throw new Error("Backend exchange failed");
          }
        } catch (e) {
          Alert.alert("Error", "Failed to exchange token.");
        } finally {
          // Go back to settings
          router.replace('/(tabs)/settings');
        }
      }
    }

    handleAuth();
  }, [params]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FC4C02" />
      <Text style={{ marginTop: 20 }}>Connecting to Strava...</Text>
    </View>
  );
}