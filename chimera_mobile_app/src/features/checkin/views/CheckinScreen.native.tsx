import React from 'react';
import { SafeAreaView, ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme, Typography } from '@infra/theme';
import { useCheckin } from '../hooks/useCheckin';
import { MorningCheckin } from '../components/MorningCheckin';
import { WorkoutUpdateCard } from '../components/WorkoutUpdateCard';
import { StreakBadge } from '../components/StreakBadge';
import { AllSetSummary } from '../components/AllSetSummary';

export default function CheckinScreen() {
  const { colors } = useTheme();
  const {
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
  } = useCheckin();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.titleText, { color: colors.textPrimary }]}>Check-in</Text>
          {status && <StreakBadge streak={status.streak} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
          </View>
        ) : allDone ? (
          <AllSetSummary
            morningCheckin={status?.morning_checkin ?? null}
            workoutUpdates={status?.workout_updates ?? []}
            streak={status?.streak ?? 0}
          />
        ) : currentItem?.type === 'morning_checkin' ? (
          <MorningCheckin
            selections={selections}
            note={note}
            bodyWeight={bodyWeight}
            weightUnit={weightUnit}
            onSelect={handleSelect}
            onNoteChange={setNote}
            onWeightChange={setBodyWeight}
            onSave={saveMorning}
            saving={saving}
          />
        ) : currentItem?.type === 'workout_update' ? (
          <WorkoutUpdateCard
            workout={currentItem.workout}
            onSave={saveWorkoutUpdate}
            saving={saving}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
});
