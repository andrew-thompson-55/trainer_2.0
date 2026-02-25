import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';
import { WorkoutForm } from '@features/workout';
import { useTheme } from '@infra/theme';
import { parseISO, differenceInMinutes } from 'date-fns';

export default function EditWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  // 1. Prepare Initial Data
  const start = params.start_time ? parseISO(params.start_time as string) : new Date();

  let initialDuration = '60';
  if (params.end_time && params.start_time) {
      const end = parseISO(params.end_time as string);
      const diff = differenceInMinutes(end, start);
      if (diff > 0) initialDuration = diff.toString();
  }

  const initialValues = {
    title: params.title as string,
    type: (params.activity_type as string) || 'run',
    description: (params.description as string) || '',
    date: start,
    duration: initialDuration
  };

  // 2. Handle Update
  const handleUpdate = async (data: any) => {
    setIsSaving(true);
    try {
      await api.updateWorkout(params.id as string, data);
      router.back();
    } catch (e) {
      console.error("Failed to update workout", e);
      alert("Failed to save changes.");
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right', 'bottom']}>
      <WorkoutForm
        headerTitle="Edit Workout"
        submitLabel={isSaving ? "Saving..." : "Save"}
        initialValues={initialValues}
        onSubmit={handleUpdate}
        onCancel={() => router.back()}
        isLoading={isSaving}
      />
    </SafeAreaView>
  );
}
