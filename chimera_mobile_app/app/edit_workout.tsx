import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';

const ACTIVITY_TYPES = ['run', 'bike', 'swim', 'strength', 'other'];

export default function EditWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Initialize state with passed params
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(params.title as string);
  const [type, setType] = useState(params.activity_type as string);
  const [description, setDescription] = useState(params.description as string);
  
  // Parse dates
  const initialStart = new Date(params.start_time as string);
  const initialEnd = new Date(params.end_time as string || params.start_time as string);
  
  const [date, setDate] = useState(initialStart);
  // Calculate initial duration in minutes
  const initialDuration = Math.round((initialEnd.getTime() - initialStart.getTime()) / 60000).toString();
  const [duration, setDuration] = useState(initialDuration);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);

    const startTime = new Date(date);
    const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);

    const payload = {
      title,
      description,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      activity_type: type,
    };

    try {
      // Call the UPDATE endpoint
      await api.updateWorkout(params.id as string, payload);
      
      // Navigate all the way back to the list to force a refresh
      router.dismissTo('/'); 
    } catch (error) {
      Alert.alert("Error", "Failed to update workout.");
      setIsSubmitting(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
        const newDate = new Date(date);
        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Workout</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSubmitting}>
            <Text style={[styles.saveText, isSubmitting && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Activity Type</Text>
        <View style={styles.typeContainer}>
            {ACTIVITY_TYPES.map((t) => (
                <TouchableOpacity 
                    key={t} 
                    style={[styles.typeButton, type === t && styles.typeButtonActive]}
                    onPress={() => setType(t)}
                >
                    <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
            ))}
        </View>

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

        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="numeric" />

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline />

        {showDatePicker && <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />}
        {showTimePicker && <DateTimePicker value={date} mode="time" display="default" onChange={onTimeChange} />}
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
  row: { flexDirection: 'row' },
  pickerButton: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, justifyContent: 'center' },
  pickerText: { fontSize: 16 },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E5E5EA' },
  typeButtonActive: { backgroundColor: '#007AFF' },
  typeText: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  typeTextActive: { color: '#FFF' },
});