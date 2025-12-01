import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';

import { api } from '../../services/api';
import { useFocusEffect } from 'expo-router'; // Reloads data when tab opens

// ... inside component ...
const [workouts, setWorkouts] = useState([]);

// Use useFocusEffect to refresh whenever you look at the tab
useFocusEffect(
  useCallback(() => {
    async function loadData() {
      const data = await api.getWorkouts();
      setWorkouts(data);
    }
    loadData();
  }, [])
);

// ... update your map function to use 'workouts' instead of 'TODAY_WORKOUTS' ...

export default function ItineraryScreen() {
  const todayDate = format(new Date(), 'EEEE, MMMM do');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{todayDate}</Text>
        <Text style={styles.titleText}>Today's Plan</Text>
      </View>

      <ScrollView style={styles.content}>
        {TODAY_WORKOUTS.map((workout) => (
          <View key={workout.id} style={styles.card}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{workout.time}</Text>
              {workout.status === 'completed' && <View style={styles.lineCompleted} />}
              {workout.status === 'pending' && <View style={styles.linePending} />}
            </View>
            
            <View style={[styles.details, workout.status === 'completed' ? styles.detailsCompleted : null]}>
              <Text style={styles.workoutTitle}>{workout.title}</Text>
              <Text style={styles.workoutMeta}>{workout.type} • {workout.duration}</Text>
            </View>
            
            <TouchableOpacity style={styles.checkbox}>
              <Text>{workout.status === 'completed' ? '✅' : '⬜'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  dateText: { fontSize: 14, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase' },
  titleText: { fontSize: 34, fontWeight: 'bold', color: '#000' },
  content: { padding: 16 },
  card: { flexDirection: 'row', marginBottom: 20 },
  timeContainer: { width: 70, alignItems: 'center' },
  timeText: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  lineCompleted: { width: 2, flex: 1, backgroundColor: '#34C759' },
  linePending: { width: 2, flex: 1, backgroundColor: '#E5E5EA' },
  details: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginRight: 12, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  detailsCompleted: { opacity: 0.6 },
  workoutTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  workoutMeta: { fontSize: 13, color: '#8E8E93' },
  checkbox: { justifyContent: 'center' },
});