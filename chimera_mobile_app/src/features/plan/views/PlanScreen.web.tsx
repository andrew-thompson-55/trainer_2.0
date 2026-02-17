// PlanScreen - Web version (stub, will be enhanced in Phase 5)
// For now, renders same as native but optimized for web

import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { format, parseISO, isSameDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { usePlan } from '../hooks/usePlan';

export default function PlanScreen() {
  const router = useRouter();
  const { sections, refreshing, onRefresh } = usePlan();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Training Plan</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <Text style={styles.refreshText}>{refreshing ? 'Loading...' : 'Refresh'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionHeader}>
              {format(new Date(section.title + 'T12:00:00'), 'EEEE, MMMM do')}
            </Text>
            {section.data.length === 0 ? (
              <Text style={styles.emptyText}>Rest Day</Text>
            ) : (
              section.data.map((workout: any) => (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.card}
                  onPress={() => router.push({ pathname: '/workout_details', params: { ...workout } })}
                >
                  <Text style={styles.workoutTitle}>{workout.title}</Text>
                  <Text style={styles.workoutMeta}>
                    {format(parseISO(workout.start_time), 'h:mm a')} • {workout.activity_type}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add_workout')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5'
  },
  titleText: { fontSize: 24, fontWeight: 'bold' },
  refreshText: { color: '#007AFF', fontSize: 16 },
  content: { padding: 20 },
  sectionHeader: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5'
  },
  workoutTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  workoutMeta: { fontSize: 14, color: '#666', textTransform: 'capitalize' },
  emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: { fontSize: 32, color: '#fff', fontWeight: '300' },
});
