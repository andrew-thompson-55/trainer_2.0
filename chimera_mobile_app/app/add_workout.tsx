import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';
import { WorkoutForm } from '@features/workout';
import { useTheme } from '@infra/theme';
import { authFetch } from '@infra/fetch/auth-fetch';
import * as userApi from '@domain/api/user';

export default function AddWorkoutScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const [defaultWorkoutTime, setDefaultWorkoutTime] = useState<string | undefined>();

  useEffect(() => {
    userApi.getUserSettings(authFetch).then(s => {
      setDefaultWorkoutTime(s.default_workout_time ?? '06:00');
    }).catch(() => {});
  }, []);

  // If a date was passed from the plan page (e.g. "2026-03-05"), create a Date object
  const initialValues = useMemo(() => {
    if (!params.date) return undefined;
    const parsed = new Date(params.date + 'T00:00:00');
    if (isNaN(parsed.getTime())) return undefined;
    return { date: parsed };
  }, [params.date]);

  const handleCreate = async (data: any) => {
    await api.createWorkout(data);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right', 'bottom']}>
      <WorkoutForm
        headerTitle="New Workout"
        submitLabel="Create"
        onSubmit={handleCreate}
        onCancel={() => router.back()}
        initialValues={initialValues}
        defaultWorkoutTime={defaultWorkoutTime}
      />
    </SafeAreaView>
  );
}
