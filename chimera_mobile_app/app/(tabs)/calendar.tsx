import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { api } from '../../services/api';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';

// 1. Define your Color Palette
const COLORS = {
  run: '#FF3B30',      // Red for Run
  bike: '#007AFF',     // Blue
  swim: '#5AC8FA',     // Cyan
  strength: '#AF52DE', // Purple
  other: '#8E8E93'     // Gray
};

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState('');
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState({});

  // 2. Fetch Data when tab opens
  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        try {
          const data = await api.getWorkouts();
          setWorkouts(data);
          
          // 3. Transform API data into Calendar "dots"
          const marked = {};
          
          data.forEach(workout => {
            // Convert ISO string (2025-12-01T...) to YYYY-MM-DD
            const dateKey = workout.start_time.split('T')[0];
            
            // Pick color based on activity type (default to gray if unknown)
            const dotColor = COLORS[workout.activity_type] || COLORS.other;

            marked[dateKey] = {
              marked: true,
              dotColor: dotColor
            };
          });

          setMarkedDates(marked);
        } catch (e) {
          console.error("Failed to load calendar:", e);
        }
      }
      loadData();
    }, [])
  );

  // Filter workouts to show only the selected day's list
  const selectedWorkouts = workouts.filter(w => 
    w.start_time.startsWith(selectedDate)
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Training Log</Text>
      </View>
      
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={day => setSelectedDate(day.dateString)}
          // Combine our data dots with the blue circle for the "selected" day
          markedDates={{
            ...markedDates,
            [selectedDate]: { 
              ...(markedDates[selectedDate] || {}), 
              selected: true, 
              selectedDotColor: 'white' // Dot turns white if selected
            }
          }}
          theme={{
            todayTextColor: '#007AFF',
            arrowColor: '#007AFF',
            monthTextColor: '#000',
            textMonthFontWeight: 'bold',
            selectedDayBackgroundColor: '#007AFF',
            selectedDayTextColor: '#ffffff',
          }}
        />
      </View>

      <ScrollView style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>
            {selectedDate ? format(new Date(selectedDate), 'EEEE, MMMM do') : 'Select a date'}
        </Text>
        
        {selectedWorkouts.length > 0 ? (
            selectedWorkouts.map(w => (
                <View key={w.id} style={styles.workoutCard}>
                    <View style={[styles.colorStrip, { backgroundColor: COLORS[w.activity_type] || COLORS.other }]} />
                    <View style={styles.workoutContent}>
                        <Text style={styles.workoutTitle}>{w.title}</Text>
                        <Text style={styles.workoutMeta}>
                            {format(new Date(w.start_time), 'h:mm a')} • {w.activity_type.toUpperCase()}
                        </Text>
                    </View>
                </View>
            ))
        ) : (
            <Text style={styles.summaryText}>
                {selectedDate ? "No workouts logged." : "Tap a day to see details."}
            </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 20, backgroundColor: '#FFF' },
  titleText: { fontSize: 34, fontWeight: 'bold', color: '#000' },
  calendarContainer: { marginTop: 20, borderRadius: 10, overflow: 'hidden', marginHorizontal: 16, backgroundColor: '#fff' },
  summaryContainer: { padding: 20, marginTop: 20 },
  summaryTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, color: '#333' },
  summaryText: { fontSize: 16, color: '#8E8E93', fontStyle: 'italic' },
  
  // New Card Styles
  workoutCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  colorStrip: { width: 6 },
  workoutContent: { padding: 16 },
  workoutTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  workoutMeta: { fontSize: 12, color: '#8E8E93' }
});