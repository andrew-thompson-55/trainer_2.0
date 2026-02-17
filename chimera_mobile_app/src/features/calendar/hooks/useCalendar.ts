// useCalendar - Business logic for calendar view
// Extracted from app/(tabs)/calendar.tsx

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { api } from '../../../../services/api';
import type { Workout } from '@domain/types';

interface MarkedDates {
  [date: string]: {
    marked: boolean;
    dots: { color: string }[];
  };
}

interface UseCalendarReturn {
  workouts: Workout[];
  markedDates: MarkedDates;
  selectedDate: string | null;
  selectedWorkouts: Workout[];
  linkedActivity: any;
  selectDate: (date: string) => void;
  loadLinkedActivity: (workoutId: string) => Promise<void>;
}

export function useCalendar(): UseCalendarReturn {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [linkedActivity, setLinkedActivity] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getWorkouts();
      if (data && Array.isArray(data)) {
        setWorkouts(data);

        // Generate marked dates
        const marked: MarkedDates = {};
        data.forEach((workout: Workout) => {
          if (!workout.start_time) return;
          const dateKey = format(parseISO(workout.start_time), 'yyyy-MM-dd');

          if (!marked[dateKey]) {
            marked[dateKey] = { marked: true, dots: [] };
          }

          // Color by status
          const color = workout.status === 'completed' ? '#10b981' : '#3b82f6';
          marked[dateKey].dots.push({ color });
        });

        setMarkedDates(marked);
      }
    } catch (e) {
      console.log('Failed to load calendar data:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setLinkedActivity(null);
  }, []);

  const selectedWorkouts = workouts.filter(w => {
    if (!w.start_time || !selectedDate) return false;
    return format(parseISO(w.start_time), 'yyyy-MM-dd') === selectedDate;
  });

  const loadLinkedActivity = useCallback(async (workoutId: string) => {
    try {
      const activity = await api.getLinkedActivity(workoutId);
      setLinkedActivity(activity);
    } catch (e) {
      console.log('Failed to load linked activity:', e);
    }
  }, []);

  return {
    workouts,
    markedDates,
    selectedDate,
    selectedWorkouts,
    linkedActivity,
    selectDate,
    loadLinkedActivity,
  };
}
