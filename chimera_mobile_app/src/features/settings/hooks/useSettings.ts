// useSettings - Business logic for settings screen
// Extracted from app/(tabs)/settings.tsx

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@infra/auth/auth-provider';
import { authFetch } from '@infra/fetch/auth-fetch';

interface UseSettingsReturn {
  loading: boolean;
  useGraphView: boolean;
  setUseGraphView: (value: boolean) => void;
  defaultPage: string;
  setDefaultPage: (value: string) => void;
  handleStravaConnect: (code: string) => Promise<void>;
  handleDeleteAccount: () => void;
  savePreferences: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const { signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [useGraphView, setUseGraphView] = useState(false);
  const [defaultPage, setDefaultPage] = useState('/(tabs)');

  // Load saved preferences
  useEffect(() => {
    async function loadPrefs() {
      try {
        const graph = await AsyncStorage.getItem('chimera_use_graph_view');
        const page = await AsyncStorage.getItem('chimera_default_route');
        if (graph) setUseGraphView(graph === 'true');
        if (page) setDefaultPage(page);
      } catch (e) {
        console.log('Failed to load preferences:', e);
      }
    }
    loadPrefs();
  }, []);

  const savePreferences = useCallback(async () => {
    try {
      await AsyncStorage.setItem('chimera_use_graph_view', String(useGraphView));
      await AsyncStorage.setItem('chimera_default_route', defaultPage);
      Alert.alert('Saved', 'Your preferences have been saved.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save preferences.');
    }
  }, [useGraphView, defaultPage]);

  const handleStravaConnect = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const response = await authFetch('/strava/connect', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Strava connected!');
      } else {
        throw new Error('Connection failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to connect Strava.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await authFetch('/users/account', { method: 'DELETE' });
              await signOut();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete account.');
            }
          },
        },
      ]
    );
  }, [signOut]);

  return {
    loading,
    useGraphView,
    setUseGraphView,
    defaultPage,
    setDefaultPage,
    handleStravaConnect,
    handleDeleteAccount,
    savePreferences,
  };
}
