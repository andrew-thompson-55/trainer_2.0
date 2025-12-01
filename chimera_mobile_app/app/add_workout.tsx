import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const ACTIVITY_TYPES = ['run', 'bike', 'swim', 'strength', 'other'];

export default function AddWorkoutScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('run');
  const [date, setDate] = useState(new Date());
  const [duration, setDuration] = useState('60'); // Minutes
  const [description, setDescription] = useState('');

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = async () => {
    if (!title) {
      Alert.alert("Missing Info", "Please enter a workout title.");
      return;
    }

    setIsSubmitting(true);

    // Calculate start and end times
    const startTime = new Date(date);
    const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);

    const payload = {
      title,
      description,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      activity_type: type,
      status: 'planned'
    };

    try {
      await api.createWorkout(payload);
      router.back(); // Go back to the previous screen
    } catch (error) {
      Alert.alert("Error", "Failed to save workout.");
      setIsSubmitting(false);
    }
  };

  // Helper to handle date changes
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
        // Keep the current time, just change the date
        const newDate = new Date(date);
        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        setDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
        // Keep the current date, just change the time
        const newDate = new Date(date);
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        setDate(newDate);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Workout</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSubmitting}>
            <Text style={[styles.saveText, isSubmitting && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        {/* TITLE INPUT */}
        <Text style={styles.label}>Title</Text>
        <TextInput 
            style={styles.input} 
            placeholder="e.g., Tempo Run" 
            value={title} 
            onChangeText={setTitle} 
        />

        {/* TYPE SELECTOR */}
        <Text style={styles.label}>Activity Type</Text>
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

        {/* DATE & TIME PICKERS */}
        <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.pickerText}>{date.toLocaleDateString()}</Text>
                </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>Time</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.pickerText}>
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* DURATION INPUT */}
        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput 
            style={styles.input} 
            placeholder="60" 
            value={duration} 
            onChangeText={setDuration}
            keyboardType="numeric"
        />

        {/* DESCRIPTION INPUT */}
        <Text style={styles.label}>Notes</Text>
        <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Details about the session..." 
            value={description} 
            onChangeText={setDescription}
            multiline
        />

        {/* HIDDEN PICKERS (Show only when requested) */}
        {showDatePicker && (
            <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
        )}
        {showTimePicker && (
            <DateTimePicker value={date} mode="time" display="default" onChange={onTimeChange} />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { fontSize: 16, color: '#FF3B30' },
  saveText: { fontSize: 16, color: '#007AFF', fontWeight: 'bold' },
  form: { padding: 20 },
  label: { fontSize: 14, color: '#8E8E93', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  
  // Type Buttons
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E5E5EA' },
  typeButtonActive: { backgroundColor: '#007AFF' },
  typeText: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  typeTextActive: { color: '#FFF' },

  // Picker Buttons
  row: { flexDirection: 'row' },
  pickerButton: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, justifyContent: 'center' },
  pickerText: { fontSize: 16 },
});