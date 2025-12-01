import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';

import { api } from '../../services/api';
import { useFocusEffect } from 'expo-router'; 

export default function ItineraryScreen() {
  // 1. Define state INSIDE the component
  const [workouts, setWorkouts] = useState<any[]>([]);
  const todayDate = format(new Date(), 'EEEE, MMMM do');

  // 2. Use the effect INSIDE the component
  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        const data = await api.getWorkouts();
        console.log("Loaded workouts:", data); // Debug log to check data
        setWorkouts(data);
      }
      loadData();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{todayDate}</Text>
        <Text style={styles.titleText}>Today's Plan</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* 3. Map over the real 'workouts' state, not the mock data */}
        {workouts.length === 0 ? (
            <Text style={{padding: 20, color: '#8E8E93'}}>No workouts planned yet.</Text>
        ) : (
            workouts.map((workout) => (
            <View key={workout.id} style={styles.card}>
                <View style={styles.timeContainer}>
                {/* Format the API ISO time string to readable time */}
                <Text style={styles.timeText}>
                    {workout.start_time ? format(new Date(workout.start_time), 'h:mm a') : '--:--'}
                </Text>
                
                {workout.status === 'completed' && <View style={styles.lineCompleted} />}
                {workout.status === 'planned' && <View style={styles.linePending} />}
                </View>
                
                <View style={[styles.details, workout.status === 'completed' ? styles.detailsCompleted : null]}>
                <Text style={styles.workoutTitle}>{workout.title}</Text>
                <Text style={styles.workoutMeta}>
                    {workout.activity_type} 
                    {/* Only show description if it exists */}
                    {workout.description ? ` • ${workout.description}` : ''}
                </Text>
                </View>
                
                <TouchableOpacity style={styles.checkbox}>
                <Text>{workout.status === 'completed' ? '✅' : '⬜'}</Text>
                </TouchableOpacity>
            </View>
            ))
        )}
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
  workoutMeta: { fontSize: 13, color: '#8E8E93', textTransform: 'capitalize' },
  checkbox: { justifyContent: 'center' },
});