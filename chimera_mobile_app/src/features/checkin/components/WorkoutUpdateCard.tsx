import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@infra/theme';
import { Layout } from '../../../../theme';
import { RPE_OPTIONS } from '../constants';
import { EmojiOption } from './EmojiOption';
import type { PendingWorkout } from '../../../domain/types/checkin';

interface Props {
  workout: PendingWorkout;
  onSave: (stravaActivityId: string, rpe: number) => void;
  saving: boolean;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDistance(meters: number | null): string {
  if (!meters) return '';
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`;
}

export function WorkoutUpdateCard({ workout, onSave, saving }: Props) {
  const { colors } = useTheme();
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);

  const details = [
    formatDistance(workout.distance_meters),
    formatDuration(workout.moving_time_seconds),
  ].filter(Boolean);

  const activityLabel = workout.activity_type.charAt(0).toUpperCase() + workout.activity_type.slice(1);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>How was your workout?</Text>
      <View style={[styles.activityInfo, { backgroundColor: colors.background }]}>
        <Text style={[styles.activityType, { color: colors.primary }]}>{activityLabel}</Text>
        {details.length > 0 && (
          <Text style={[styles.activityDetails, { color: colors.textSecondary }]}>{details.join(' - ')}</Text>
        )}
      </View>

      <Text style={[styles.question, { color: colors.textPrimary }]}>Rate your effort (RPE)</Text>
      <View style={styles.options}>
        {RPE_OPTIONS.map((option) => (
          <EmojiOption
            key={option.value}
            option={option}
            selected={selectedRpe === option.value}
            onPress={() => setSelectedRpe(option.value)}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }, !selectedRpe && styles.saveButtonDisabled]}
        onPress={() => selectedRpe && onSave(workout.source_id, selectedRpe)}
        disabled={!selectedRpe || saving}
        activeOpacity={0.8}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save RPE'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.checkin.cardRadius,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    padding: 10,
    borderRadius: 10,
  },
  activityType: {
    fontSize: 15,
    fontWeight: '600',
  },
  activityDetails: {
    fontSize: 14,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  options: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 20,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
