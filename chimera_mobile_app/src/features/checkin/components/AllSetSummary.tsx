import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Layout } from '../../../../theme';
import { METRICS } from '../constants';
import type { MorningCheckin, WorkoutUpdate as CheckinWorkoutUpdate } from '../../../domain/types/checkin';

interface Props {
  morningCheckin: MorningCheckin | null;
  workoutUpdates: CheckinWorkoutUpdate[];
  streak: number;
}

export function AllSetSummary({ morningCheckin, workoutUpdates, streak }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.checkmark}>✅</Text>
      <Text style={styles.title}>You're all set!</Text>
      {streak > 0 && (
        <Text style={styles.streakText}>{streak} day streak</Text>
      )}

      {morningCheckin && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionLabel}>Morning Check-in</Text>
          <View style={styles.summaryRow}>
            {METRICS.map((metric) => {
              const value = (morningCheckin as any)[metric.key];
              if (!value) return null;
              const option = metric.options.find((o) => o.value === value);
              return (
                <View key={metric.key} style={styles.summaryItem}>
                  <Text style={styles.summaryEmoji}>{option?.emoji}</Text>
                  <Text style={styles.summaryLabel}>{metric.key}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {workoutUpdates.length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionLabel}>
            {workoutUpdates.length} workout{workoutUpdates.length > 1 ? 's' : ''} rated
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.checkin.savedBg,
    borderRadius: Layout.checkin.cardRadius,
    borderWidth: 1,
    borderColor: Colors.checkin.savedBorder,
    padding: 24,
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.checkin.savedText,
    marginBottom: 4,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.checkin.streakText,
    marginBottom: 16,
  },
  summarySection: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.checkin.savedBorder,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryEmoji: {
    fontSize: 24,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
