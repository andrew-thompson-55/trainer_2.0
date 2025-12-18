import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';
import { WorkoutForm } from '../components/WorkoutForm';
import { Colors } from '../theme';
import { parseISO, differenceInMinutes } from 'date-fns';

export default function EditWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // 1. Prepare Initial Data
  const start = params.start_time ? parseISO(params.start_time as string) : new Date();
  
  // Calculate duration if end_time exists, otherwise default to 60
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
    // API logic (including offline queue) lives here
    await api.updateWorkout(params.id as string, data);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'left', 'right', 'bottom']}>
      <WorkoutForm 
        headerTitle="Edit Workout"
        submitLabel="Save"
        initialValues={initialValues} // 👈 Pre-fills the form!
        onSubmit={handleUpdate}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}