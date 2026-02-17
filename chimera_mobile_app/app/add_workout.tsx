import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { WorkoutForm } from '@features/workout';
import { Colors } from '../theme';

export default function AddWorkoutScreen() {
  const router = useRouter();

  const handleCreate = async (data: any) => {
    // API logic (including offline queue) lives here
    await api.createWorkout(data);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'left', 'right', 'bottom']}>
      <WorkoutForm 
        headerTitle="New Workout"
        submitLabel="Create"
        onSubmit={handleCreate}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}