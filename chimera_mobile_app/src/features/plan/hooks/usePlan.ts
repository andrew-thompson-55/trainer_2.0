// usePlan - Business logic for training plan screen
// Extracted from app/(tabs)/itinerary.tsx

import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { Alert } from 'react-native';
import { api } from '../../../../services/api';
import type { Workout, WorkoutUpdate } from '@domain/types';

interface PlanSection {
  title: string; // YYYY-MM-DD
  data: Workout[];
}

interface UsePlanReturn {
  sections: PlanSection[];
  refreshing: boolean;
  loadData: (isRefresh?: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
  toggleStatus: (workout: Workout) => Promise<void>;
}

export function usePlan(): UsePlanReturn {
  const [sections, setSections] = useState<PlanSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const processAndSetSections = (data: Workout[]) => {
    console.log('[usePlan] processAndSetSections called with data:', data);
    console.log('[usePlan] data length:', data?.length);
    console.log('[usePlan] data is array:', Array.isArray(data));

    const grouped: Record<string, Workout[]> = {};
    const todayKey = format(new Date(), 'yyyy-MM-dd');

    data.forEach((workout) => {
      if (!workout.start_time) return;
      const localDate = parseISO(workout.start_time);
      const dateKey = format(localDate, 'yyyy-MM-dd');

      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(workout);
    });

    // Force TODAY to exist (so the line always renders)
    if (!grouped[todayKey]) {
      grouped[todayKey] = [];
    }

    const sectionsArray = Object.keys(grouped).sort().map(date => ({
      title: date,
      data: grouped[date]
    }));

    console.log('[usePlan] sectionsArray:', sectionsArray);
    setSections(sectionsArray);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    console.log('[usePlan] loadData called, isRefresh:', isRefresh);

    // Load from cache first (if not refreshing)
    const cachedData = await api.getCachedWorkouts();
    console.log('[usePlan] cachedData:', cachedData);
    if (cachedData && cachedData.length > 0 && !isRefresh) {
      processAndSetSections(cachedData);
    }

    // Then fetch fresh data
    try {
      const netData = await api.getWorkouts();
      console.log('[usePlan] netData:', netData);
      if (netData && Array.isArray(netData)) {
        processAndSetSections(netData);
      } else {
        console.log('[usePlan] netData is not an array or is null');
      }
    } catch (e) {
      console.log('[usePlan] Failed to fetch workouts:', e);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Process offline queue first
    await api.processOfflineQueue();

    // Sync with Google Calendar
    try {
      await api.syncGCal();
    } catch (e) {
      console.log('GCal sync failed:', e);
    }

    // Reload data
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const toggleStatus = useCallback(async (workout: Workout) => {
    if (!workout || !workout.id) return;

    const newStatus = workout.status === 'completed' ? 'planned' : 'completed';

    try {
      await api.updateWorkout(workout.id, { status: newStatus });
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status.');
    }
  }, [loadData]);

  // Auto-load on screen focus
  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  return {
    sections,
    refreshing,
    loadData,
    onRefresh,
    toggleStatus,
  };
}
