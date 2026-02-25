import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { WorkoutForm } from '@features/workout';
import { useTheme } from '@infra/theme';

export default function AddWorkoutScreen() {
  const router = useRouter();
  const { colors } = useTheme();

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
      />
    </SafeAreaView>
  );
}
