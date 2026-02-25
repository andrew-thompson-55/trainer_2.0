import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authFetch } from '@infra/fetch/auth-fetch';
import { STORAGE_KEYS } from '@infra/storage/keys';
import { useAnalytics } from '@infra/analytics';
import * as checkinApi from '@domain/api/checkin';
import type { CheckinStatus, PendingWorkout, MorningCheckin, WorkoutUpdate } from '@domain/types/checkin';

type StackItem =
  | { type: 'morning_checkin' }
  | { type: 'workout_update'; workout: PendingWorkout };

export function useCheckin() {
  const { track } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [stack, setStack] = useState<StackItem[]>([]);
  const [weightUnit, setWeightUnit] = useState('lbs');

  // Morning checkin form state
  const [selections, setSelections] = useState<Record<string, number | null>>({
    readiness: null,
    soreness: null,
    energy: null,
    mood: null,
  });
  const [note, setNote] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Load weight unit preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.WEIGHT_UNIT).then((val) => {
      if (val === 'kg' || val === 'lbs') setWeightUnit(val);
    });
  }, []);

  // Fetch status on mount
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await checkinApi.getCheckinStatus(authFetch, today);
      setStatus(data);

      // Build stack: pending workouts (newest first) + morning checkin if not done
      const newStack: StackItem[] = [];

      // Add pending workouts (FILO: newest at top)
      for (const workout of data.pending_workouts) {
        newStack.push({ type: 'workout_update', workout });
      }

      // Morning checkin at bottom of stack (shown last or if already done, not shown)
      if (!data.morning_checkin) {
        newStack.push({ type: 'morning_checkin' });
      } else {
        // Pre-fill form with existing data
        setSelections({
          readiness: data.morning_checkin.readiness,
          soreness: data.morning_checkin.soreness,
          energy: data.morning_checkin.energy,
          mood: data.morning_checkin.mood,
        });
        setNote(data.morning_checkin.note || '');
        setBodyWeight(data.morning_checkin.body_weight?.toString() || '');
      }

      setStack(newStack);
      if (newStack.length > 0) {
        track('checkin_started', { items: newStack.length });
      }
    } catch (e) {
      console.log('Failed to fetch checkin status:', e);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSelect = (key: string, value: number) => {
    track('checkin_metric_selected', { metric: key, value });
    setSelections((prev) => ({ ...prev, [key]: value }));
  };

  const saveMorning = async () => {
    setSaving(true);
    try {
      const data: any = {};
      if (selections.readiness) data.readiness = selections.readiness;
      if (selections.soreness) data.soreness = selections.soreness;
      if (selections.energy) data.energy = selections.energy;
      if (selections.mood) data.mood = selections.mood;
      if (note.trim()) data.note = note.trim();
      if (bodyWeight.trim()) {
        data.body_weight = parseFloat(bodyWeight);
        data.body_weight_unit = weightUnit;
      }

      await checkinApi.saveMorningCheckin(authFetch, today, data);
      track('checkin_saved', { date: today });

      // Pop morning checkin from stack
      setStack((prev) => prev.filter((item) => item.type !== 'morning_checkin'));

      // Refresh status to get updated data
      const updated = await checkinApi.getCheckinStatus(authFetch, today);
      setStatus(updated);
    } catch (e) {
      console.log('Failed to save morning checkin:', e);
    } finally {
      setSaving(false);
    }
  };

  const saveWorkoutUpdate = async (stravaActivityId: string, rpe: number) => {
    setSaving(true);
    try {
      await checkinApi.saveWorkoutUpdate(authFetch, stravaActivityId, { session_rpe: rpe });
      track('workout_update_saved', { strava_activity_id: stravaActivityId, rpe });

      // Pop this workout from stack
      setStack((prev) =>
        prev.filter(
          (item) =>
            item.type !== 'workout_update' ||
            item.workout.source_id !== stravaActivityId
        )
      );

      // Refresh status
      const updated = await checkinApi.getCheckinStatus(authFetch, today);
      setStatus(updated);
    } catch (e) {
      console.log('Failed to save workout update:', e);
    } finally {
      setSaving(false);
    }
  };

  const currentItem = stack.length > 0 ? stack[0] : null;
  const allDone = !loading && stack.length === 0;

  return {
    loading,
    saving,
    status,
    currentItem,
    allDone,
    selections,
    note,
    bodyWeight,
    weightUnit,
    handleSelect,
    setNote,
    setBodyWeight,
    saveMorning,
    saveWorkoutUpdate,
  };
}
