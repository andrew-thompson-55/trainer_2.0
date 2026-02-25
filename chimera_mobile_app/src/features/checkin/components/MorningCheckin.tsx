import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@infra/theme';
import { Layout } from '../../../../theme';
import { METRICS } from '../constants';
import { MetricRow } from './MetricRow';

interface Props {
  selections: Record<string, number | null>;
  note: string;
  bodyWeight: string;
  weightUnit: string;
  onSelect: (key: string, value: number) => void;
  onNoteChange: (text: string) => void;
  onWeightChange: (text: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function MorningCheckin({
  selections,
  note,
  bodyWeight,
  weightUnit,
  onSelect,
  onNoteChange,
  onWeightChange,
  onSave,
  saving,
}: Props) {
  const { colors } = useTheme();
  const hasAnySelection = Object.values(selections).some((v) => v !== null);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Morning Check-in</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>How are you feeling today?</Text>

      {METRICS.map((metric) => (
        <MetricRow
          key={metric.key}
          metric={metric}
          selectedValue={selections[metric.key] ?? null}
          onSelect={onSelect}
        />
      ))}

      {/* Body Weight */}
      <View style={styles.weightRow}>
        <Text style={[styles.weightLabel, { color: colors.textPrimary }]}>Body Weight ({weightUnit})</Text>
        <TextInput
          style={[styles.weightInput, { borderColor: colors.border, color: colors.textPrimary }]}
          value={bodyWeight}
          onChangeText={onWeightChange}
          keyboardType="decimal-pad"
          placeholder="--"
          placeholderTextColor="#C7C7CC"
        />
      </View>

      {/* Note */}
      <TextInput
        style={[styles.noteInput, { borderColor: colors.border, color: colors.textPrimary }]}
        value={note}
        onChangeText={onNoteChange}
        placeholder="Add a note (optional)"
        placeholderTextColor="#C7C7CC"
        multiline
        numberOfLines={2}
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }, !hasAnySelection && styles.saveButtonDisabled]}
        onPress={onSave}
        disabled={!hasAnySelection || saving}
        activeOpacity={0.8}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Check-in'}</Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weightLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  weightInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: 100,
    fontSize: 17,
    textAlign: 'center',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 16,
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
