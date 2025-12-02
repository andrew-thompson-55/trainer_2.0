import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, SectionList, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { format, parseISO, isSameDay } from 'date-fns';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons'; 
import { api } from '../../services/api';

export default function ItineraryScreen() {
  const router = useRouter(); 
  const [sections, setSections] = useState<any[]>([]);

  // Helper to process raw data into sections
  const processAndSetSections = (data: any[]) => {
      const grouped: any = {};
      data.forEach((workout: any) => {
        if (!workout.start_time) return;
        const dateKey = workout.start_time.split('T')[0];
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(workout);
      });

      const sectionsArray = Object.keys(grouped).sort().map(date => ({
        title: date,
        data: grouped[date]
      }));

      setSections(sectionsArray);
  }

  const loadData = async () => {
    // 1. Load Cache FIRST (Instant)
    const cachedData = await api.getCachedWorkouts();
    if (cachedData && cachedData.length > 0) {
        processAndSetSections(cachedData);
    }

    // 2. Load Network SECOND (Updates UI)
    try {
      const netData = await api.getWorkouts();
      if (netData && Array.isArray(netData)) {
        processAndSetSections(netData);
      }
    } catch (e) {
      console.log("Network refresh failed, showing cached data.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const toggleStatus = async (workout: any) => {
    if (!workout || !workout.id) return;
    const newStatus = workout.status === 'completed' ? 'planned' : 'completed';
    try {
        await api.updateWorkout(workout.id, { status: newStatus });
        loadData(); // Refresh list
    } catch (error) {
        Alert.alert("Error", "Failed to update status.");
    }
  };

  const renderSectionHeader = ({ section: { title } }: any) => {
    const dateObj = new Date(title + 'T12:00:00');
    const isToday = isSameDay(dateObj, new Date());
    const headerText = format(dateObj, 'EEEE, MMMM do');

    return (
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderText, isToday && styles.todayText]}>
                {isToday ? `Today • ${headerText}` : headerText}
            </Text>
        </View>
    );
  };

  const renderItem = ({ item: workout }: any) => (
    <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push({
            pathname: "/workout_details",
            params: {
                id: workout.id,
                title: workout.title,
                description: workout.description || '',
                activity_type: workout.activity_type,
                start_time: workout.start_time,
                status: workout.status
            }
        })}
    >
        <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
                {workout.start_time ? format(parseISO(workout.start_time), 'h:mm a') : '--:--'}
            </Text>
            {workout.status === 'completed' ? <View style={styles.lineCompleted} /> : null}
            {workout.status === 'planned' ? <View style={styles.linePending} /> : null}
        </View>
        
        <View style={[styles.details, workout.status === 'completed' ? styles.detailsCompleted : null]}>
            <Text style={styles.workoutTitle}>{workout.title || 'Untitled Workout'}</Text>
            <Text style={styles.workoutMeta}>
                {workout.activity_type || 'other'} 
                {workout.description ? ` • ${workout.description}` : ''}
            </Text>
        </View>
        
        <TouchableOpacity 
            style={styles.checkbox}
            onPress={() => toggleStatus(workout)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
            <Ionicons 
                name={workout.status === 'completed' ? "checkbox" : "square-outline"} 
                size={28} 
                color={workout.status === 'completed' ? "#34C759" : "#C7C7CC"} 
            />
        </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Training Plan</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<Text style={styles.emptyText}>No workouts scheduled.</Text>}
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/add_workout')}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  titleText: { fontSize: 34, fontWeight: 'bold', color: '#000' },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionHeader: { paddingVertical: 12, backgroundColor: '#F2F2F7', marginBottom: 8 },
  sectionHeaderText: { fontSize: 14, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1 },
  todayText: { color: '#007AFF' }, 
  card: { flexDirection: 'row', marginBottom: 12 },
  timeContainer: { width: 70, alignItems: 'center', paddingTop: 4 },
  timeText: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  lineCompleted: { width: 2, flex: 1, backgroundColor: '#34C759' },
  linePending: { width: 2, flex: 1, backgroundColor: '#E5E5EA' },
  details: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginRight: 12, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  detailsCompleted: { opacity: 0.6 },
  workoutTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  workoutMeta: { fontSize: 13, color: '#8E8E93', textTransform: 'capitalize' },
  checkbox: { justifyContent: 'center', paddingLeft: 8 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#8E8E93' },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: '#007AFF', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 }
});