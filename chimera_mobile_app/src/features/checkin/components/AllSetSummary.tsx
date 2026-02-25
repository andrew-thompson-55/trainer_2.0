import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@infra/theme';
import { Layout } from '../../../../theme';
import { METRICS } from '../constants';
import type { MorningCheckin, WorkoutUpdate as CheckinWorkoutUpdate } from '../../../domain/types/checkin';

interface Props {
  morningCheckin: MorningCheckin | null;
  workoutUpdates: CheckinWorkoutUpdate[];
  streak: number;
}

export function AllSetSummary({ morningCheckin, workoutUpdates, streak }: Props) {
  const { colors, checkin } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: checkin.savedBg, borderColor: checkin.savedBorder }]}>
      <Text style={styles.checkmark}>✅</Text>
      <Text style={[styles.title, { color: checkin.savedText }]}>You're all set!</Text>
      {streak > 0 && (
        <Text style={[styles.streakText, { color: checkin.streakText }]}>{streak} day streak</Text>
      )}

      {morningCheckin && (
        <View style={[styles.summarySection, { borderTopColor: checkin.savedBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Morning Check-in</Text>
          <View style={styles.summaryRow}>
            {METRICS.map((metric) => {
              const value = (morningCheckin as any)[metric.key];
              if (!value) return null;
              const option = metric.options.find((o) => o.value === value);
              return (
                <View key={metric.key} style={styles.summaryItem}>
                  <Text style={styles.summaryEmoji}>{option?.emoji}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{metric.key}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {workoutUpdates.length > 0 && (
        <View style={[styles.summarySection, { borderTopColor: checkin.savedBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {workoutUpdates.length} workout{workoutUpdates.length > 1 ? 's' : ''} rated
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.checkin.cardRadius,
    borderWidth: 1,
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
    marginBottom: 4,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  summarySection: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
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
    marginTop: 2,
    textTransform: 'capitalize',
  },
});
