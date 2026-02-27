// app/(tabs)/settings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView,
  Switch, ScrollView, TextInput, Platform, ToastAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme, Typography } from '@infra/theme';
import { useAuth } from '@infra/auth/auth-provider';
import { authFetch } from '@infra/fetch/auth-fetch';
import type { WeightUnit, DistanceUnit, UserSettings } from '@domain/types';
import * as userApi from '@domain/api/user';
import { pkg } from '@infra/package';
import { STORAGE_KEYS } from '@infra/storage/keys';

const { strings } = pkg;

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'] as const;
const SPORT_OPTIONS = ['run', 'bike', 'swim', 'strength', 'other'] as const;
const REST_PREFERENCES = ['none', 'fixed', 'flexible'] as const;

function showToast(msg: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
}

export default function SettingsScreen() {
  const { signOut, user, deleteAccount } = useAuth();
  const { colors, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [useGraphView, setUseGraphView] = useState(false);
  const [defaultPage, setDefaultPage] = useState('/(tabs)');
  const [settings, setSettings] = useState<UserSettings>({ weight_unit: 'kg' });

  // Local state mirrors for quick UI
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('kg');
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>('mi');
  const [morningReminder, setMorningReminder] = useState(false);
  const [morningReminderTime, setMorningReminderTime] = useState('08:00');
  const [workoutReminder, setWorkoutReminder] = useState(false);
  const [streakReminder, setStreakReminder] = useState(false);
  const [streakReminderTime, setStreakReminderTime] = useState('10:00');
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [weeklySummaryDay, setWeeklySummaryDay] = useState('monday');
  const [weeklySummaryTime, setWeeklySummaryTime] = useState('09:00');

  // Training profile state
  const [trainingExperience, setTrainingExperience] = useState<string>('');
  const [primaryActivities, setPrimaryActivities] = useState<string[]>([]);
  const [weeklyTrainingDays, setWeeklyTrainingDays] = useState<number>(5);
  const [restDayPreference, setRestDayPreference] = useState<string>('flexible');
  const [restDays, setRestDays] = useState<string[]>([]);
  const [maxHeartRate, setMaxHeartRate] = useState<string>('');

  // Tracked activity types state
  const [allActivityTypes, setAllActivityTypes] = useState<string[]>([]);
  const [trackedActivityTypes, setTrackedActivityTypes] = useState<string[]>([]);
  const [trackedTypesLoading, setTrackedTypesLoading] = useState(false);

  // Strava state
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaAthleteName, setStravaAthleteName] = useState<string>('');

  // Google Calendar resync state
  const [gcalSyncing, setGcalSyncing] = useState(false);

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

  // 2. LOAD PREFERENCES
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.STATS_VIEW_PREF).then(val => {
      setUseGraphView(val === 'graph');
    });
    AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_ROUTE).then(val => {
      if (val) setDefaultPage(val);
    });
    AsyncStorage.getItem(STORAGE_KEYS.WEIGHT_UNIT).then(val => {
      if (val === 'kg' || val === 'lbs') setWeightUnitState(val);
    });

    userApi.getUserSettings(authFetch).then(s => {
      setSettings(s);
      setWeightUnitState(s.weight_unit);
      AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_UNIT, s.weight_unit);
      setDistanceUnitState(s.distance_unit ?? 'mi');
      setMorningReminder(s.morning_checkin_reminder ?? false);
      setMorningReminderTime(s.morning_checkin_reminder_time ?? '08:00');
      setWorkoutReminder(s.workout_update_reminder ?? false);
      setStreakReminder(s.streak_reminder ?? false);
      setStreakReminderTime(s.streak_reminder_time ?? '10:00');
      setWeeklySummary(s.notification_weekly_summary ?? false);
      setWeeklySummaryDay(s.notification_weekly_summary_day ?? 'monday');
      setWeeklySummaryTime(s.notification_weekly_summary_time ?? '09:00');
      // Training profile
      setTrainingExperience(s.training_experience ?? '');
      setPrimaryActivities(s.primary_activities ?? []);
      setWeeklyTrainingDays(s.weekly_training_days ?? 5);
      setRestDayPreference(s.rest_day_preference ?? 'flexible');
      setRestDays(s.rest_days ?? []);
      setMaxHeartRate(s.max_heart_rate ? String(s.max_heart_rate) : '');
      // Strava
      setStravaConnected(!!s.strava_athlete_id);
      setStravaAthleteName(s.strava_athlete_name ?? '');
      // Tracked activity types
      const types = s.tracked_activity_types ?? [];
      setTrackedActivityTypes(types);
      setAllActivityTypes(types); // initially, all known types = tracked types
      // Initialize tracked types if empty
      if (types.length === 0) {
        setTrackedTypesLoading(true);
        userApi.initializeTrackedTypes(authFetch)
          .then(initialized => {
            setTrackedActivityTypes(initialized);
            setAllActivityTypes(initialized);
          })
          .catch(() => {})
          .finally(() => setTrackedTypesLoading(false));
      }
    }).catch(() => {/* use cached */});
  }, []);

  // 3. ACTIONS
  const saveSetting = useCallback(async (update: Partial<UserSettings>) => {
    try {
      await userApi.updateUserSettings(authFetch, update);
    } catch (e) {
      console.log('Failed to sync setting:', e);
    }
  }, []);

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
    saveSetting({ weight_unit: unit });
  };

  const handleSetDistanceUnit = async (unit: DistanceUnit) => {
    setDistanceUnitState(unit);
    saveSetting({ distance_unit: unit });
  };

  const handleToggleNotification = async (
    key: keyof UserSettings,
    value: boolean,
    setter: (v: boolean) => void
  ) => {
    setter(value);
    try {
      await userApi.updateUserSettings(authFetch, { [key]: value } as Partial<UserSettings>);
    } catch (e) {
      console.log(`Failed to sync ${key}:`, e);
      setter(!value);
    }
  };

  const handleSetTrainingExperience = (level: string) => {
    setTrainingExperience(level);
    saveSetting({ training_experience: level });
  };

  const handleToggleActivity = (activity: string) => {
    const updated = primaryActivities.includes(activity)
      ? primaryActivities.filter(a => a !== activity)
      : [...primaryActivities, activity];
    setPrimaryActivities(updated);
    saveSetting({ primary_activities: updated });
  };

  const handleSetWeeklyDays = (days: number) => {
    setWeeklyTrainingDays(days);
    saveSetting({ weekly_training_days: days });
  };

  const handleSetRestPreference = (pref: string) => {
    setRestDayPreference(pref);
    saveSetting({ rest_day_preference: pref });
  };

  const handleToggleRestDay = (day: string) => {
    const updated = restDays.includes(day)
      ? restDays.filter(d => d !== day)
      : [...restDays, day];
    setRestDays(updated);
    saveSetting({ rest_days: updated });
  };

  const handleSaveMaxHR = () => {
    const val = maxHeartRate ? parseInt(maxHeartRate, 10) : null;
    saveSetting({ max_heart_rate: val ?? undefined });
  };

  const handleToggleTrackedType = (type: string, value: boolean) => {
    const updated = value
      ? [...trackedActivityTypes, type].sort()
      : trackedActivityTypes.filter(t => t !== type);
    setTrackedActivityTypes(updated);
    saveSetting({ tracked_activity_types: updated });
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
      const name = data.athlete?.firstname || 'Strava';
      setStravaConnected(true);
      setStravaAthleteName(name);
      Alert.alert("Success", `Connected to ${name}!`);
    } catch (e: any) {
      console.error("Strava Exchange Error:", e);
      Alert.alert("Connection Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStrava = async () => {
    if (!user || !user.token) return;
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

  const handleDisconnectStrava = () => {
    Alert.alert("Disconnect Strava", "Are you sure you want to disconnect your Strava account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect", style: "destructive", onPress: async () => {
          try {
            await authFetch('/integrations/strava', { method: 'DELETE' });
            setStravaConnected(false);
            setStravaAthleteName('');
          } catch (e) {
            Alert.alert("Error", "Failed to disconnect Strava.");
          }
        }
      },
    ]);
  };

  const handleResyncGcal = async () => {
    setGcalSyncing(true);
    try {
      const res = await authFetch('/v1/integrations/gcal/resync', { method: 'POST' });
      const data = await res.json();
      Alert.alert(
        "Sync Complete",
        `Created ${data.created}, updated ${data.updated} workouts.${data.errors ? ` ${data.errors} errors.` : ''}`
      );
    } catch (e) {
      Alert.alert("Sync Failed", "Could not resync Google Calendar.");
    } finally {
      setGcalSyncing(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.prompt
      ? Alert.prompt(
          strings['settings.deleteAccount'],
          strings['settings.deleteAccountWarning'] + '\n\n' + strings['settings.deleteAccountConfirm'],
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete", style: "destructive", onPress: async (text) => {
                if (text === 'DELETE') {
                  await deleteAccount();
                } else {
                  Alert.alert("Cancelled", "You must type DELETE to confirm.");
                }
              }
            },
          ],
          'plain-text'
        )
      : Alert.alert(
          strings['settings.deleteAccount'],
          strings['settings.deleteAccountWarning'],
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete My Account", style: "destructive", onPress: async () => {
                await deleteAccount();
              }
            },
          ]
        );
  };

  // Helper: get user initials
  const getInitials = () => {
    const name = user?.name || '';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  // ---- PILL SELECTOR COMPONENT ----
  const PillSelector = ({ options, value, onChange, capitalize = true }: {
    options: readonly string[];
    value: string;
    onChange: (v: string) => void;
    capitalize?: boolean;
  }) => (
    <View style={styles.pillContainer}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.pill,
            { backgroundColor: colors.background, borderColor: colors.border },
            value === opt && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => onChange(opt)}
        >
          <Text style={[
            styles.pillText,
            { color: colors.textPrimary },
            value === opt && styles.pillTextActive,
          ]}>
            {capitalize ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ---- CHIP MULTI-SELECT COMPONENT ----
  const ChipMultiSelect = ({ options, selected, onToggle }: {
    options: readonly string[];
    selected: string[];
    onToggle: (v: string) => void;
  }) => (
    <View style={[styles.pillContainer, { flexWrap: 'wrap' }]}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.pill,
            { backgroundColor: colors.background, borderColor: colors.border },
            selected.includes(opt) && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => onToggle(opt)}
        >
          <Text style={[
            styles.pillText,
            { color: colors.textPrimary },
            selected.includes(opt) && styles.pillTextActive,
          ]}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>{strings['settings.title']}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ===== PROFILE HEADER CARD ===== */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.card }]}
          onPress={() => router.push('/edit-profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.name || 'User'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.iconInactive} />
        </TouchableOpacity>

        <View style={{ height: 24 }} />

        {/* ===== APP STARTUP ===== */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.appStartup']}</Text>
        <View style={[styles.startupContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{strings['settings.openAppTo']}</Text>
          <View style={styles.pillContainer}>
            {[
              { route: '/(tabs)', label: strings['tabs.home'] },
              { route: '/(tabs)/plan', label: strings['tabs.plan'] },
              { route: '/(tabs)/coach', label: strings['tabs.coach'] },
            ].map(({ route, label }) => (
              <TouchableOpacity
                key={route}
                style={[
                  styles.pill,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  defaultPage === route && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => handleSetDefault(route)}
              >
                <Text style={[styles.pillText, { color: colors.textPrimary }, defaultPage === route && styles.pillTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />

        {/* ===== PREFERENCES ===== */}
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
            {(['kg', 'lbs'] as WeightUnit[]).map(unit => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.pill,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  weightUnit === unit && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => handleSetWeightUnit(unit)}
              >
                <Text style={[styles.pillText, { color: colors.textPrimary }, weightUnit === unit && styles.pillTextActive]}>{unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 12 }} />
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="speedometer-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.distanceUnit']}</Text>
          </View>
          <View style={styles.pillContainer}>
            {(['mi', 'km'] as DistanceUnit[]).map(unit => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.pill,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  distanceUnit === unit && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => handleSetDistanceUnit(unit)}
              >
                <Text style={[styles.pillText, { color: colors.textPrimary }, distanceUnit === unit && styles.pillTextActive]}>{unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 12 }} />
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="moon-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.darkMode']}</Text>
          </View>
          <View style={styles.pillContainer}>
            {(['auto', 'light', 'dark'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.pill,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  themeMode === mode && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setThemeMode(mode)}
              >
                <Text style={[styles.pillText, { color: colors.textPrimary }, themeMode === mode && styles.pillTextActive]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />

        {/* ===== TRAINING PROFILE ===== */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.trainingProfile']}</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>

          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{strings['settings.trainingExperience']}</Text>
          <PillSelector options={EXPERIENCE_LEVELS} value={trainingExperience} onChange={handleSetTrainingExperience} />

          <View style={{ height: 16 }} />
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{strings['settings.primaryActivity']}</Text>
          <ChipMultiSelect options={SPORT_OPTIONS} selected={primaryActivities} onToggle={handleToggleActivity} />

          <View style={{ height: 16 }} />
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{strings['settings.weeklyTrainingDays']}</Text>
          <View style={styles.pillContainer}>
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dayPill,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  weeklyTrainingDays === d && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => handleSetWeeklyDays(d)}
              >
                <Text style={[styles.pillText, { color: colors.textPrimary }, weeklyTrainingDays === d && styles.pillTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 16 }} />
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{strings['settings.restDayPreference']}</Text>
          <PillSelector options={REST_PREFERENCES} value={restDayPreference} onChange={handleSetRestPreference} />

          {restDayPreference === 'fixed' && (
            <>
              <View style={{ height: 12 }} />
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{strings['settings.restDays']}</Text>
              <View style={[styles.pillContainer, { flexWrap: 'wrap' }]}>
                {DAYS_OF_WEEK.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayPill,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      restDays.includes(day) && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => handleToggleRestDay(day)}
                  >
                    <Text style={[styles.pillText, { color: colors.textPrimary }, restDays.includes(day) && styles.pillTextActive]}>
                      {DAY_LABELS[day]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 16 }} />
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{strings['settings.maxHeartRate']}</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            value={maxHeartRate}
            onChangeText={setMaxHeartRate}
            onBlur={handleSaveMaxHR}
            keyboardType="number-pad"
            placeholder="e.g. 185"
            placeholderTextColor={colors.textSecondary}
            maxLength={3}
          />
          <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 4 }]}>{strings['settings.maxHeartRateHelper']}</Text>
        </View>

        <View style={{ height: 24 }} />

        {/* ===== TRACKED ACTIVITIES ===== */}
        {allActivityTypes.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tracked Activities</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              {trackedTypesLoading ? (
                <Text style={[{ color: colors.textSecondary, fontSize: 14 }]}>Loading activity types...</Text>
              ) : (
                [...allActivityTypes].sort().map(type => (
                  <View key={type} style={[styles.row, { paddingVertical: 10, paddingHorizontal: 0, borderRadius: 0 }]}>
                    <Text style={[styles.rowText, { color: colors.textPrimary, fontSize: 15 }]}>
                      {type}
                    </Text>
                    <Switch
                      value={trackedActivityTypes.includes(type)}
                      onValueChange={(v) => handleToggleTrackedType(type, v)}
                      trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
                    />
                  </View>
                ))
              )}
            </View>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Excluded types still appear on your calendar but won't count toward volume, metrics, or compliance.
            </Text>
            <View style={{ height: 24 }} />
          </>
        )}

        {/* ===== NOTIFICATIONS ===== */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.notifications']}</Text>

        {/* Morning Check-in */}
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
        {morningReminder && (
          <View style={[styles.subRow, { backgroundColor: colors.card }]}>
            <Text style={[styles.subRowLabel, { color: colors.textSecondary }]}>{strings['settings.morningCheckinTime']}</Text>
            <TextInput
              style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={morningReminderTime}
              onChangeText={setMorningReminderTime}
              onBlur={() => saveSetting({ morning_checkin_reminder_time: morningReminderTime })}
              placeholder="08:00"
              placeholderTextColor={colors.textSecondary}
              maxLength={5}
            />
          </View>
        )}

        <View style={{ height: 12 }} />

        {/* Workout Update */}
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

        {/* Streak Reminder */}
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
        {streakReminder && (
          <View style={[styles.subRow, { backgroundColor: colors.card }]}>
            <Text style={[styles.subRowLabel, { color: colors.textSecondary }]}>{strings['settings.streakReminderTime']}</Text>
            <TextInput
              style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={streakReminderTime}
              onChangeText={setStreakReminderTime}
              onBlur={() => saveSetting({ streak_reminder_time: streakReminderTime })}
              placeholder="10:00"
              placeholderTextColor={colors.textSecondary}
              maxLength={5}
            />
          </View>
        )}

        <View style={{ height: 12 }} />

        {/* Weekly Summary */}
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.weeklySummary']}</Text>
          </View>
          <Switch
            value={weeklySummary}
            onValueChange={(v) => handleToggleNotification('notification_weekly_summary', v, setWeeklySummary)}
            trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
          />
        </View>
        {weeklySummary && (
          <View style={[styles.subRow, { backgroundColor: colors.card }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subRowLabel, { color: colors.textSecondary, marginBottom: 8 }]}>{strings['settings.weeklySummaryDay']}</Text>
              <View style={[styles.pillContainer, { flexWrap: 'wrap' }]}>
                {DAYS_OF_WEEK.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayPill,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      weeklySummaryDay === day && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setWeeklySummaryDay(day);
                      saveSetting({ notification_weekly_summary_day: day });
                    }}
                  >
                    <Text style={[styles.pillText, { color: colors.textPrimary }, weeklySummaryDay === day && styles.pillTextActive]}>
                      {DAY_LABELS[day]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ height: 8 }} />
              <Text style={[styles.subRowLabel, { color: colors.textSecondary }]}>{strings['settings.weeklySummaryTime']}</Text>
              <TextInput
                style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary, marginTop: 4 }]}
                value={weeklySummaryTime}
                onChangeText={setWeeklySummaryTime}
                onBlur={() => saveSetting({ notification_weekly_summary_time: weeklySummaryTime })}
                placeholder="09:00"
                placeholderTextColor={colors.textSecondary}
                maxLength={5}
              />
            </View>
          </View>
        )}

        <Text style={[styles.helperText, { color: colors.textSecondary }]}>{strings['settings.notificationHelper']}</Text>

        <View style={{ height: 24 }} />

        {/* ===== INTEGRATIONS ===== */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.integrations']}</Text>

        {/* Strava */}
        {stravaConnected ? (
          <View style={[styles.row, { backgroundColor: colors.card }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="bicycle" size={24} color="#FC4C02" />
              <View>
                <Text style={[styles.rowText, { color: colors.textPrimary }]}>Strava</Text>
                <Text style={[{ fontSize: 13, color: colors.textSecondary }]}>
                  {strings['settings.stravaConnected']}{stravaAthleteName ? ` as ${stravaAthleteName}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleDisconnectStrava}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>{strings['settings.stravaDisconnect']}</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          {loading ? strings['settings.stravaConnecting'] : strings['settings.stravaHelper']}
        </Text>

        <View style={{ height: 12 }} />

        {/* Google Calendar */}
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <View>
              <Text style={[styles.rowText, { color: colors.textPrimary }]}>Google Calendar</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                Sync workouts to your Training calendar
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleResyncGcal} disabled={gcalSyncing}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              {gcalSyncing ? 'Syncing...' : 'Resync'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />

        {/* Apple Health - Coming Soon */}
        <View style={[styles.row, { backgroundColor: colors.card, opacity: 0.5 }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="heart-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.appleHealth']}</Text>
          </View>
          <Text style={[{ fontSize: 13, color: colors.textSecondary }]}>{strings['settings.comingSoon']}</Text>
        </View>

        <View style={{ height: 12 }} />

        {/* Garmin Connect - Coming Soon */}
        <View style={[styles.row, { backgroundColor: colors.card, opacity: 0.5 }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="watch-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.garminConnect']}</Text>
          </View>
          <Text style={[{ fontSize: 13, color: colors.textSecondary }]}>{strings['settings.comingSoon']}</Text>
        </View>

        <View style={{ height: 24 }} />

        {/* ===== SUPPORT & INFO ===== */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.supportInfo']}</Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card }]}
          onPress={() => Linking.openURL('mailto:support@chimeratraining.app?subject=Feedback')}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.sendFeedback']}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.iconInactive} />
        </TouchableOpacity>

        <View style={{ height: 12 }} />
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card }]}
          onPress={() => showToast(strings['settings.comingSoon'])}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.helpFaq']}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.iconInactive} />
        </TouchableOpacity>

        <View style={{ height: 12 }} />
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card }]}
          onPress={() => showToast(strings['settings.comingSoon'])}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="star-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.rateApp']}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.iconInactive} />
        </TouchableOpacity>

        <View style={{ height: 12 }} />
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card }]}
          onPress={() => showToast(strings['settings.comingSoon'])}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.termsOfService']}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.iconInactive} />
        </TouchableOpacity>

        <View style={{ height: 12 }} />
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card }]}
          onPress={() => showToast(strings['settings.comingSoon'])}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.privacyPolicy']}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.iconInactive} />
        </TouchableOpacity>

        <View style={{ height: 12 }} />
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.appVersion']}</Text>
          </View>
          <Text style={[{ fontSize: 15, color: colors.textSecondary }]}>{appVersion}</Text>
        </View>

        <View style={{ height: 24 }} />

        {/* ===== ACCOUNT ===== */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{strings['settings.account']}</Text>

        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card }]}
          onPress={() => showToast(strings['settings.comingSoon'])}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="download-outline" size={24} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>{strings['settings.exportData']}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.iconInactive} />
        </TouchableOpacity>

        <View style={{ height: 12 }} />
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.card }]}
          onPress={handleDeleteAccount}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="trash-outline" size={24} color={colors.danger} />
            <Text style={[styles.rowText, { color: colors.danger }]}>{strings['settings.deleteAccount']}</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 12 }} />
        <TouchableOpacity style={[styles.row, { backgroundColor: colors.card }]} onPress={signOut}>
          <View style={styles.rowLeft}>
            <Ionicons name="log-out-outline" size={24} color={colors.danger} />
            <Text style={[styles.rowText, { color: colors.danger }]}>{strings['settings.logOut']}</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  titleText: { ...Typography.header },
  content: { padding: 20 },

  // Profile Header
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },

  // Section card (for training profile etc.)
  sectionCard: {
    padding: 16,
    borderRadius: 12,
  },

  fieldLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },

  // Row Styles
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 17 },
  helperText: { marginTop: 8, marginLeft: 4, fontSize: 13 },

  // Sub-row (for time pickers under toggles)
  subRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -4,
  },
  subRowLabel: {
    fontSize: 13,
    marginBottom: 4,
  },

  // Startup Pills
  startupContainer: { padding: 16, borderRadius: 12 },
  label: { fontSize: 17, marginBottom: 12 },
  pillContainer: { flexDirection: 'row', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  dayPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, minWidth: 40, alignItems: 'center' },
  pillText: { fontWeight: '500', fontSize: 14 },
  pillTextActive: { color: '#FFF' },

  // Text input
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    width: 80,
  },
});
