import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { api } from '../../services/api';
import { useFocusEffect, useRouter } from 'expo-router'; 
import { format, parseISO } from 'date-fns';

const COLORS: any = {
  run: '#FF3B30',      
  bike: '#007AFF',     
  swim: '#5AC8FA',     
  strength: '#AF52DE', 
  other: '#8E8E93'     
};

export default function CalendarScreen() {
  const router = useRouter(); 
  const [selectedDate, setSelectedDate] = useState('');
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState({});

  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        // Helper to update state
        const updateUI = (data: any[]) => {
            setWorkouts(data);
            const marked: any = {};
            if (data && Array.isArray(data)) {
                data.forEach((workout: any) => {
                    const dateKey = workout.start_time.split('T')[0];
                    const dotColor = COLORS[workout.activity_type] || COLORS.other;
                    marked[dateKey] = { marked: true, dotColor: dotColor };
                });
            }
            setMarkedDates(marked);
        };

        // 1. Cache First
        const cached = await api.getCachedWorkouts();
        if (cached.length > 0) updateUI(cached);

        // 2. Network Second
        try {
            const fresh = await api.getWorkouts();
            updateUI(fresh);
        } catch (e) {
            console.log("Using cached calendar data");
        }
      }
      loadData();
    }, [])
  );

  const selectedWorkouts = workouts.filter(w => 
    w.start_time.startsWith(selectedDate)
  );

  const formattedSelectedDate = selectedDate 
    ? format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM do') 
    : 'Select a date';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Training Log</Text>
      </View>
      
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={{
            ...markedDates,
            [selectedDate]: { 
              ...(markedDates[selectedDate] || {}), 
              selected: true, 
              selectedDotColor: 'white' 
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
        <Text style={styles.summaryTitle}>{formattedSelectedDate}</Text>
        
        {selectedWorkouts.length > 0 ? (
            selectedWorkouts.map((w: any) => (
                <TouchableOpacity 
                    key={w.id} 
                    style={styles.workoutCard}
                    onPress={() => router.push({
                        pathname: "/workout_details",
                        params: {
                            id: w.id,
                            title: w.title,
                            description: w.description || '',
                            activity_type: w.activity_type,
                            start_time: w.start_time,
                            status: w.status
                        }
                    })}
                >
                    <View style={[styles.colorStrip, { backgroundColor: COLORS[w.activity_type] || COLORS.other }]} />
                    <View style={styles.workoutContent}>
                        <Text style={styles.workoutTitle}>{w.title}</Text>
                        <Text style={styles.workoutMeta}>
                            {format(parseISO(w.start_time), 'h:mm a')} • {w.activity_type.toUpperCase()}
                        </Text>
                    </View>
                </TouchableOpacity>
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
  workoutCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  colorStrip: { width: 6 },
  workoutContent: { padding: 16 },
  workoutTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  workoutMeta: { fontSize: 12, color: '#8E8E93' }
});