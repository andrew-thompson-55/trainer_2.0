// app/(tabs)/settings.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography } from '@infra/theme';
import { useAuth } from '@infra/auth/auth-provider';
import { authFetch } from '@infra/fetch/auth-fetch';
import type { WeightUnit } from '@domain/types';
import * as userApi from '@domain/api/user';
import { pkg } from '@infra/package';
import { STORAGE_KEYS } from '@infra/storage/keys';

const { strings } = pkg;

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const { colors, themeMode, setThemeMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [useGraphView, setUseGraphView] = useState(false);
  const [defaultPage, setDefaultPage] = useState('/(tabs)'); // Default to Home
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('kg');
  const [morningReminder, setMorningReminder] = useState(false);
  const [workoutReminder, setWorkoutReminder] = useState(false);
  const [streakReminder, setStreakReminder] = useState(false);

  // 1. HANDLE DEEP LINKS (Strava Redirect)
  const url = Linking.useURL();

  useEffect(() => {
    if (url) {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.code) {
        exchangeStravaCode(queryParams.code as string);
      } else if (queryParams?.error) {
        Alert.alert("Strava Error", "Connection denied.");
      }
    }
  }, [url]);

  // 2. LOAD PREFERENCES (Graph View + Default Page)
  useEffect(() => {
    // Load Graph Pref
    AsyncStorage.getItem(STORAGE_KEYS.STATS_VIEW_PREF).then(val => {
        setUseGraphView(val === 'graph');
    });

    // Load Default Page Pref
    AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_ROUTE).then(val => {
       if (val) setDefaultPage(val);
    });

    // Load weight unit from cache, then verify with API
    AsyncStorage.getItem(STORAGE_KEYS.WEIGHT_UNIT).then(val => {
      if (val === 'kg' || val === 'lbs') setWeightUnitState(val);
    });
    userApi.getUserSettings(authFetch).then(settings => {
      setWeightUnitState(settings.weight_unit);
      AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_UNIT, settings.weight_unit);
      setMorningReminder(settings.morning_checkin_reminder ?? false);
      setWorkoutReminder(settings.workout_update_reminder ?? false);
      setStreakReminder(settings.streak_reminder ?? false);
    }).catch(() => {/* use cached */});
  }, []);

  // 3. ACTIONS
  const toggleStatsView = async (value: boolean) => {
      setUseGraphView(value);
      await AsyncStorage.setItem(STORAGE_KEYS.STATS_VIEW_PREF, value ? 'graph' : 'grid');
  };

  const handleSetDefault = async (route: string) => {
      setDefaultPage(route);
      await AsyncStorage.setItem(STORAGE_KEYS.DEFAULT_ROUTE, route);
  };

  const handleSetWeightUnit = async (unit: WeightUnit) => {
    setWeightUnitState(unit);
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_UNIT, unit);
    try {
      await userApi.updateUserSettings(authFetch, { weight_unit: unit });
    } catch (e) {
      console.log('Failed to sync weight unit:', e);
    }
  };

  const handleToggleNotification = async (
    key: 'morning_checkin_reminder' | 'workout_update_reminder' | 'streak_reminder',
    value: boolean,
    setter: (v: boolean) => void
  ) => {
    setter(value);
    try {
      await userApi.updateUserSettings(authFetch, { [key]: value });
    } catch (e) {
      console.log(`Failed to sync ${key}:`, e);
      setter(!value); // revert on failure
    }
  };

  const exchangeStravaCode = async (code: string) => {
    if (!user?.token) return;

    setLoading(true);
    try {
      const res = await authFetch('/integrations/strava/exchange', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Exchange failed");
      }

      const data = await res.json();
      Alert.alert("Success", `Connected to ${data.athlete?.firstname || 'Strava'}!`);

    } catch (e: any) {
      console.error("Strava Exchange Error:", e);
      Alert.alert("Connection Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStrava = async () => {
    if (!user || !user.token) {
      console.error("No user logged in");
      return;
    }

    const returnUrl = Linking.createURL('redirect');

    try {
      const response = await authFetch(
        `/integrations/strava/auth-url?return_url=${encodeURIComponent(returnUrl)}`
      );

      const data = await response.json();

      if (data.url) {
        Linking.openURL(data.url);
      } else {
        throw new Error("Backend returned success but no URL found.");
      }

    } catch (error) {
      console.error("Failed to start Strava auth:", error);
      Alert.alert("Error", "Could not reach Strava service.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>{strings['settings.title']}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* SECTION: APP STARTUP */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.appStartup']}</Text>
        <View style={[styles.startupContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{strings['settings.openAppTo']}</Text>
            <View style={styles.pillContainer}>
                <TouchableOpacity
                    style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }, defaultPage === '/(tabs)' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => handleSetDefault('/(tabs)')}
                >
                    <Text style={[styles.pillText, { color: colors.textPrimary }, defaultPage === '/(tabs)' && styles.pillTextActive]}>{strings['tabs.home']}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }, defaultPage === '/(tabs)/itinerary' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => handleSetDefault('/(tabs)/itinerary')}
                >
                    <Text style={[styles.pillText, { color: colors.textPrimary }, defaultPage === '/(tabs)/itinerary' && styles.pillTextActive]}>{strings['tabs.plan']}</Text>
                </TouchableOpacity>

                 <TouchableOpacity
                    style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }, defaultPage === '/(tabs)/chat' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => handleSetDefault('/(tabs)/chat')}
                >
                    <Text style={[styles.pillText, { color: colors.textPrimary }, defaultPage === '/(tabs)/chat' && styles.pillTextActive]}>{strings['tabs.coach']}</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={{ height: 24 }} />

        {/* SECTION: PREFERENCES */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.preferences']}</Text>
        <View style={[styles.row, { backgroundColor: colors.card }]}>
            <View style={styles.rowLeft}>
                <Ionicons name="bar-chart" size={24} color={colors.primary} />
                <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.useGraphView']}</Text>
            </View>
            <Switch
                value={useGraphView}
                onValueChange={toggleStatsView}
                trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
            />
        </View>

        <View style={{ height: 12 }} />
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="barbell-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.weightUnit']}</Text>
          </View>
          <View style={styles.pillContainer}>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }, weightUnit === 'kg' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => handleSetWeightUnit('kg')}
            >
              <Text style={[styles.pillText, { color: colors.textPrimary }, weightUnit === 'kg' && styles.pillTextActive]}>kg</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }, weightUnit === 'lbs' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => handleSetWeightUnit('lbs')}
            >
              <Text style={[styles.pillText, { color: colors.textPrimary }, weightUnit === 'lbs' && styles.pillTextActive]}>lbs</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 12 }} />
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="moon-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.darkMode']}</Text>
          </View>
          <View style={styles.pillContainer}>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }, themeMode === 'auto' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setThemeMode('auto')}
            >
              <Text style={[styles.pillText, { color: colors.textPrimary }, themeMode === 'auto' && styles.pillTextActive]}>Auto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }, themeMode === 'light' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setThemeMode('light')}
            >
              <Text style={[styles.pillText, { color: colors.textPrimary }, themeMode === 'light' && styles.pillTextActive]}>Light</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }, themeMode === 'dark' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setThemeMode('dark')}
            >
              <Text style={[styles.pillText, { color: colors.textPrimary }, themeMode === 'dark' && styles.pillTextActive]}>Dark</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 24 }} />

        {/* SECTION: NOTIFICATIONS */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.notifications']}</Text>
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="sunny-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.morningCheckin']}</Text>
          </View>
          <Switch
            value={morningReminder}
            onValueChange={(v) => handleToggleNotification('morning_checkin_reminder', v, setMorningReminder)}
            trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
          />
        </View>
        <View style={{ height: 12 }} />
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="fitness-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.workoutUpdate']}</Text>
          </View>
          <Switch
            value={workoutReminder}
            onValueChange={(v) => handleToggleNotification('workout_update_reminder', v, setWorkoutReminder)}
            trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
          />
        </View>
        <View style={{ height: 12 }} />
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="flame-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.streakReminder']}</Text>
          </View>
          <Switch
            value={streakReminder}
            onValueChange={(v) => handleToggleNotification('streak_reminder', v, setStreakReminder)}
            trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
          />
        </View>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>{strings['settings.notificationHelper']}</Text>

        <View style={{ height: 24 }} />

        {/* SECTION: INTEGRATIONS */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.integrations']}</Text>

        <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.card }]}
            onPress={handleConnectStrava}
            disabled={loading}
        >
            <View style={styles.rowLeft}>
                <Ionicons name="bicycle" size={24} color="#FC4C02" />
                <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.connectStrava']}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.iconInactive} />
        </TouchableOpacity>

        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            {loading ? strings['settings.stravaConnecting'] : strings['settings.stravaHelper']}
        </Text>

        <View style={{ height: 24 }} />

        {/* SECTION: ACCOUNT */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.account']}</Text>
        <TouchableOpacity style={[styles.row, { backgroundColor: colors.card }]} onPress={signOut}>
            <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={24} color={colors.danger} />
                <Text style={[styles.rowText, { color: colors.danger }]}>{strings['settings.logOut']}</Text>
            </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  titleText: { ...Typography.header },
  content: { padding: 20 },

  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },

  // Row Styles
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 17 },
  helperText: { marginTop: 8, marginLeft: 4, fontSize: 13 },

  // Startup Pills
  startupContainer: { padding: 16, borderRadius: 12 },
  label: { fontSize: 17, marginBottom: 12 },
  pillContainer: { flexDirection: 'row', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  pillText: { fontWeight: '500' },
  pillTextActive: { color: '#FFF' },
});
