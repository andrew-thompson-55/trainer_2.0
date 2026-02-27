// useWorkoutForm - Form state management for workout creation/editing
// Extracted from components/WorkoutForm.tsx

import { useState } from 'react';
import { Alert } from 'react-native';
import type { WorkoutCreate } from '@domain/types';
import { pkg } from '@infra/package';

const { config, strings } = pkg;

export const ACTIVITY_TYPES = config.activityTypes;

interface WorkoutFormValues {
  title: string;
  type: string;
  date: Date;
  duration: string;
  description: string;
}

interface UseWorkoutFormOptions {
  initialValues?: Partial<WorkoutFormValues>;
  onSubmit: (data: WorkoutCreate) => Promise<void>;
  defaultWorkoutTime?: string;  // "HH:MM" format
}

interface UseWorkoutFormReturn {
  // Form state
  title: string;
  setTitle: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  date: Date;
  setDate: (value: Date) => void;
  duration: string;
  setDuration: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;

  // UI state
  saving: boolean;
  showDatePicker: boolean;
  setShowDatePicker: (value: boolean) => void;
  showTimePicker: boolean;
  setShowTimePicker: (value: boolean) => void;

  // Handlers
  handleSubmit: () => Promise<void>;
  onDateChange: (event: any, selectedDate?: Date) => void;
  onTimeChange: (event: any, selectedDate?: Date) => void;
}

export function useWorkoutForm({
  initialValues,
  onSubmit,
  defaultWorkoutTime,
}: UseWorkoutFormOptions): UseWorkoutFormReturn {
  // Form state
  const [title, setTitle] = useState(initialValues?.title || '');
  const [type, setType] = useState(initialValues?.type || config.defaultActivityType);
  const [date, setDate] = useState(() => {
    if (initialValues?.date) return initialValues.date;
    const now = new Date();
    if (defaultWorkoutTime) {
      const [h, m] = defaultWorkoutTime.split(':').map(Number);
      now.setHours(h, m, 0, 0);
    }
    return now;
  });
  const [duration, setDuration] = useState(initialValues?.duration || '60');
  const [description, setDescription] = useState(initialValues?.description || '');

  // UI state
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert(strings['workout.missingTitle'], strings['workout.missingTitleMessage']);
      return;
    }

    setSaving(true);

    // Calculate times
    const startTime = new Date(date);
    const endTime = new Date(startTime.getTime() + parseInt(duration || '0') * 60000);

    const payload: WorkoutCreate = {
      title,
      description,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      activity_type: type as any, // Type-safe from ACTIVITY_TYPES
      status: 'planned',
    };

    try {
      await onSubmit(payload);
      // Don't turn off saving - parent usually navigates away
    } catch (e) {
      Alert.alert(strings['workout.saveError'], strings['workout.saveErrorMessage']);
      setSaving(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      setDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setDate(newDate);
    }
  };

  return {
    // Form state
    title,
    setTitle,
    type,
    setType,
    date,
    setDate,
    duration,
    setDuration,
    description,
    setDescription,

    // UI state
    saving,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,

    // Handlers
    handleSubmit,
    onDateChange,
    onTimeChange,
  };
}
