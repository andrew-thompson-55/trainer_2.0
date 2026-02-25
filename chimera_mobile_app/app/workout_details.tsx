import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { useTheme, Typography } from '@infra/theme';
import { Layout } from '../theme';
import { STORAGE_KEYS } from '../src/infrastructure/storage/keys';

import { StatsGrid } from '../components/stats-grid';
import { StatsGraphs } from '../components/stats-graphs';
import { getActivityStats } from '@domain/utils/stats';

export default function WorkoutDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workoutId = params.id as string;
  const { colors } = useTheme();

  // 1. STATE: Initialize with params for instant render, but allow updates
  const [workout, setWorkout] = useState({
    id: workoutId,
    title: (params.title as string) || '',
    description: (params.description as string) || '',
    activity_type: (params.activity_type as string) || 'other',
    start_time: (params.start_time as string) || new Date().toISOString(),
    status: (params.status as string) || 'planned',
  });

  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [useGraphView, setUseGraphView] = useState(false);

  // 2. THE FIX: Fetch fresh data every time screen focuses
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          // A. Load Prefs
          const pref = await AsyncStorage.getItem(STORAGE_KEYS.STATS_VIEW_PREF);
          if (isActive && pref) setUseGraphView(pref === 'graph');

          // B. Fetch Latest Workout Data (Title, Desc, etc.)
          const freshWorkout = await api.getWorkout(workoutId);
          if (isActive && freshWorkout) {
            setWorkout(prev => ({ ...prev, ...freshWorkout }));
          }

          // C. Fetch Linked Strava Activity
          const linkedData = await api.getLinkedActivity(workoutId);
          if (isActive && linkedData) setActivity(linkedData);

        } catch (e) {
          console.log("Error refreshing details:", e);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadData();

      return () => { isActive = false; };
    }, [workoutId])
  );

  const handleDelete = () => {
    Alert.alert("Delete Workout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setDeleting(true);
          try {
            await api.deleteWorkout(workout.id);
            router.back();
          } catch (e) {
            Alert.alert("Error", "Failed to delete");
            setDeleting(false);
          }
        }
      }
    ]);
  };

  const uiStats = getActivityStats(activity);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]} edges={['top', 'left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>

        {/* Date */}
        <View style={[styles.dateBadge, { backgroundColor: colors.background }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.primary }]}>
            {workout.start_time ? format(parseISO(workout.start_time), 'EEEE, MMM do • h:mm a') : 'No Date'}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{workout.title}</Text>
        <Text style={styles.type}>{workout.activity_type}</Text>

        <View style={[styles.statusTag, workout.status === 'completed' ? styles.statusComplete : styles.statusPlanned]}>
          <Text style={[styles.statusText, workout.status === 'completed' ? { color: colors.success } : styles.textPlanned]}>
            {workout.status?.toUpperCase()}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={styles.sectionLabel}>Performance Data</Text>
        <View style={styles.statsContainer}>
            {loading ? (
                <ActivityIndicator color={colors.primary} />
            ) : (
                useGraphView ? <StatsGraphs stats={uiStats} /> : <StatsGrid stats={uiStats} />
            )}
        </View>

        {workout.description ? (
            <View style={styles.descSection}>
                <Text style={styles.sectionLabel}>Notes</Text>
                <Text style={[styles.description, { color: colors.textPrimary }]}>{workout.description}</Text>
            </View>
        ) : null}

      </ScrollView>

      <View style={[styles.bottomActions, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete} disabled={deleting}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
                pathname: "/edit_workout",
                params: {
                    id: workout.id,
                    title: workout.title,
                    description: workout.description,
                    activity_type: workout.activity_type,
                    start_time: workout.start_time,
                }
            })}
        >
            <Ionicons name="create-outline" size={20} color="#FFF" />
            <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    backButton: { flexDirection: 'row', alignItems: 'center' },
    backText: { fontSize: 17, marginLeft: 4 },
    headerTitle: { fontSize: 17, fontWeight: '600' },

    scrollContent: { flex: 1 },
    scrollInner: { padding: 20, paddingBottom: 40 },

    dateBadge: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16 },
    dateText: { marginLeft: 6, fontWeight: '500' },

    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
    type: { fontSize: 18, color: '#8E8E93', marginBottom: 16, textTransform: 'capitalize' },

    statusTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, alignSelf: 'flex-start' },
    statusPlanned: { backgroundColor: '#E5E5EA' },
    statusComplete: { backgroundColor: '#E8F5E9' },
    statusText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    textPlanned: { color: '#8E8E93' },

    divider: { height: 1, marginVertical: 24 },

    sectionLabel: { fontSize: 13, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 12 },

    statsContainer: { marginBottom: 24 },

    descSection: { marginBottom: 20 },
    description: { fontSize: 16, lineHeight: 24 },

    bottomActions: { flexDirection: 'row', padding: 16, borderTopWidth: 1 },
    button: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, marginHorizontal: 6 },
    deleteButton: { backgroundColor: '#FFF0F0' },
    deleteText: { fontWeight: '600', marginLeft: 8 },
    editText: { color: '#FFF', fontWeight: '600', marginLeft: 8 },
});
