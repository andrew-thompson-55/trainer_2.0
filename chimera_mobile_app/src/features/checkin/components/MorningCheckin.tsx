import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Layout } from '../../../../theme';
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
  const hasAnySelection = Object.values(selections).some((v) => v !== null);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Morning Check-in</Text>
      <Text style={styles.subtitle}>How are you feeling today?</Text>

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
        <Text style={styles.weightLabel}>Body Weight ({weightUnit})</Text>
        <TextInput
          style={styles.weightInput}
          value={bodyWeight}
          onChangeText={onWeightChange}
          keyboardType="decimal-pad"
          placeholder="--"
          placeholderTextColor="#C7C7CC"
        />
      </View>

      {/* Note */}
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={onNoteChange}
        placeholder="Add a note (optional)"
        placeholderTextColor="#C7C7CC"
        multiline
        numberOfLines={2}
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, !hasAnySelection && styles.saveButtonDisabled]}
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
    backgroundColor: Colors.card,
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
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
  },
  weightInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: 100,
    fontSize: 17,
    textAlign: 'center',
    color: Colors.textPrimary,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
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
