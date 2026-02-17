import React from 'react';
import {
  StyleSheet, View, Text, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Layout, Typography } from '../theme';
import { useWorkoutForm, ACTIVITY_TYPES } from '@features/workout';
import type { WorkoutCreate } from '@domain/types';

interface WorkoutFormProps {
  initialValues?: {
    title: string;
    type: string;
    date: Date;
    duration: string;
    description: string;
  };
  onSubmit: (data: WorkoutCreate) => Promise<void>;
  submitLabel: string;
  headerTitle: string;
  onCancel: () => void;
}

export const WorkoutForm = ({ initialValues, onSubmit, submitLabel, headerTitle, onCancel }: WorkoutFormProps) => {
  const {
    title, setTitle,
    type, setType,
    date,
    duration, setDuration,
    description, setDescription,
    saving,
    showDatePicker, setShowDatePicker,
    showTimePicker, setShowTimePicker,
    handleSubmit,
    onDateChange,
    onTimeChange,
  } = useWorkoutForm({ initialValues, onSubmit });

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      {/* HEADER */}
      <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={saving} style={styles.saveBtn}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{submitLabel}</Text>}
          </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
          
          {/* 1. TITLE */}
          <View style={styles.inputGroup}>
              <Text style={styles.label}>TITLE</Text>
              <TextInput 
                  style={styles.input} 
                  value={title} 
                  onChangeText={setTitle} 
                  placeholder="e.g. Tempo Run" 
                  placeholderTextColor={Colors.iconInactive}
                  // Only auto-focus on new workouts to avoid jarring edits
                  autoFocus={!initialValues} 
              />
          </View>

          {/* 2. ACTIVITY PILLS */}
          <View style={styles.inputGroup}>
              <Text style={styles.label}>ACTIVITY TYPE</Text>
              <View style={styles.typeContainer}>
                  {ACTIVITY_TYPES.map((t) => (
                      <TouchableOpacity 
                          key={t} 
                          style={[styles.typeButton, type === t && styles.typeButtonActive]}
                          onPress={() => setType(t)}
                      >
                          <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                              {t.toUpperCase()}
                          </Text>
                      </TouchableOpacity>
                  ))}
              </View>
          </View>

          {/* 3. DATE & TIME */}
          <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>DATE</Text>
                  <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                      <Text style={styles.pickerText}>{date.toLocaleDateString()}</Text>
                  </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>TIME</Text>
                  <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
                      <Text style={styles.pickerText}>
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                  </TouchableOpacity>
              </View>
          </View>

          {/* 4. DURATION */}
          <View style={styles.inputGroup}>
              <Text style={styles.label}>DURATION (MINUTES)</Text>
              <TextInput 
                  style={styles.input} 
                  value={duration} 
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  placeholder="60"
              />
          </View>

          {/* 5. NOTES */}
          <View style={styles.inputGroup}>
              <Text style={styles.label}>NOTES</Text>
              <TextInput 
                  style={styles.textArea} 
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add details..."
                  placeholderTextColor={Colors.iconInactive}
                  multiline={true} 
                  numberOfLines={10} 
                  textAlignVertical="top" 
              />
          </View>

          {/* Hidden Pickers */}
          {showDatePicker && (
              <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
          )}
          {showTimePicker && (
              <DateTimePicker value={date} mode="time" display="default" onChange={onTimeChange} />
          )}
          
          <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Reuse your exact styles
const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: Layout.spacing.l, backgroundColor: Colors.header, 
    borderBottomWidth: 1, borderBottomColor: Colors.border 
  },
  headerTitle: Typography.cardTitle,
  cancelBtn: { padding: 8 },
  cancelText: { fontSize: 17, color: Colors.primary },
  saveBtn: { paddingHorizontal: Layout.spacing.l, paddingVertical: 6, backgroundColor: Colors.primary, borderRadius: 100 },
  saveText: { fontSize: 15, fontWeight: '600', color: '#FFF' },

  content: { padding: Layout.spacing.xl },
  inputGroup: { marginBottom: Layout.spacing.xxl },
  row: { flexDirection: 'row' },
  
  label: { 
    fontSize: 12, color: Colors.textSecondary, marginBottom: 8, 
    textTransform: 'uppercase', marginLeft: 4, fontWeight: '600' 
  },
  
  input: { 
    backgroundColor: Colors.card, padding: Layout.spacing.l, 
    borderRadius: Layout.borderRadius.m, fontSize: 17, 
    color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border 
  },
  
  pickerButton: { 
    backgroundColor: Colors.card, padding: Layout.spacing.l, 
    borderRadius: Layout.borderRadius.m, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center'
  },
  pickerText: { fontSize: 17, color: Colors.textPrimary },

  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { 
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, 
    backgroundColor: Colors.border, borderWidth: 1, borderColor: Colors.border
  },
  typeButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeTextActive: { color: '#FFF' },

  textArea: { 
    backgroundColor: Colors.card, padding: Layout.spacing.l, 
    borderRadius: Layout.borderRadius.m, fontSize: 17, 
    color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
    minHeight: 150, textAlignVertical: 'top'
  }
});