import React, { useState, useCallback } from 'react'; // 👈 Import useCallback
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router'; 
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { Colors, Layout, Typography } from '../theme';

import { StatsGrid } from '../components/stats-grid';
import { StatsGraphs } from '../components/stats-graphs';
import { getActivityStats } from '@domain/utils/stats';

export default function WorkoutDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workoutId = params.id as string;

  // 1. STATE: Initialize with params for instant render, but allow updates
  const [workout, setWorkout] = useState({
    id: workoutId,
    title: (params.title as string) || '',
    description: (params.description as string) || '',
    activity_type: (params.activity_type as string) || 'other',
    start_time: (params.start_time as string) || new Date().toISOString(),
    status: (params.status as string) || 'planned',
  });

  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [useGraphView, setUseGraphView] = useState(false);

  // 2. THE FIX: Fetch fresh data every time screen focuses
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          // A. Load Prefs
          const pref = await AsyncStorage.getItem('chimera_stats_view_pref');
          if (isActive && pref) setUseGraphView(pref === 'graph');

          // B. Fetch Latest Workout Data (Title, Desc, etc.)
          // ⚠️ ensure api.getWorkout(id) exists in your services/api.ts!
          const freshWorkout = await api.getWorkout(workoutId);
          if (isActive && freshWorkout) {
            setWorkout(prev => ({ ...prev, ...freshWorkout }));
          }

          // C. Fetch Linked Strava Activity
          const linkedData = await api.getLinkedActivity(workoutId);
          if (isActive && linkedData) setActivity(linkedData);

        } catch (e) {
          console.log("Error refreshing details:", e);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadData();

      return () => { isActive = false; };
    }, [workoutId]) // Re-run if ID changes
  );

  const handleDelete = () => {
    Alert.alert("Delete Workout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setDeleting(true);
          try {
            await api.deleteWorkout(workout.id);
            router.back();
          } catch (e) {
            Alert.alert("Error", "Failed to delete");
            setDeleting(false);
          }
        }
      }
    ]);
  };

  const uiStats = getActivityStats(activity);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={{ width: 60 }} /> 
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        
        {/* Date */}
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.dateText}>
            {workout.start_time ? format(parseISO(workout.start_time), 'EEEE, MMM do • h:mm a') : 'No Date'}
          </Text>
        </View>

        {/* 👇 Uses state 'workout', so it updates automatically */}
        <Text style={styles.title}>{workout.title}</Text>
        <Text style={styles.type}>{workout.activity_type}</Text>

        <View style={[styles.statusTag, workout.status === 'completed' ? styles.statusComplete : styles.statusPlanned]}>
          <Text style={[styles.statusText, workout.status === 'completed' ? styles.textComplete : styles.textPlanned]}>
            {workout.status?.toUpperCase()}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Performance Data</Text>
        <View style={styles.statsContainer}>
            {loading ? (
                <ActivityIndicator color={Colors.primary} />
            ) : (
                useGraphView ? <StatsGraphs stats={uiStats} /> : <StatsGrid stats={uiStats} /> 
            )}
        </View>

        {workout.description ? (
            <View style={styles.descSection}>
                <Text style={styles.sectionLabel}>Notes</Text>
                <Text style={styles.description}>{workout.description}</Text>
            </View>
        ) : null}
        
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete} disabled={deleting}>
            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
            <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>

        {/* 👇 Updated Push Params:
           We still pass current state to Edit Screen so it pre-fills correctly. 
        */}
        <TouchableOpacity 
            style={[styles.button, styles.editButton]} 
            onPress={() => router.push({
                pathname: "/edit_workout",
                params: {
                    id: workout.id,
                    title: workout.title,
                    description: workout.description,
                    activity_type: workout.activity_type,
                    start_time: workout.start_time,
                    // If you have end_time in your state, pass it here too
                }
            })}
        >
            <Ionicons name="create-outline" size={20} color="#FFF" />
            <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ... styles remain the same
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    backButton: { flexDirection: 'row', alignItems: 'center' },
    backText: { color: Colors.primary, fontSize: 17, marginLeft: 4 },
    headerTitle: Typography.cardTitle,
    
    scrollContent: { flex: 1 },
    scrollInner: { padding: 20, paddingBottom: 40 }, 
   
    dateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16 },
    dateText: { marginLeft: 6, color: Colors.primary, fontWeight: '500' },
   
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4, color: '#000' },
    type: { fontSize: 18, color: '#8E8E93', marginBottom: 16, textTransform: 'capitalize' },
   
    statusTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, alignSelf: 'flex-start' },
    statusPlanned: { backgroundColor: '#E5E5EA' },
    statusComplete: { backgroundColor: '#E8F5E9' },
    statusText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    textPlanned: { color: '#8E8E93' },
    textComplete: { color: Colors.success },
   
    divider: { height: 1, backgroundColor: Colors.border, marginVertical: 24 },
    
    sectionLabel: { fontSize: 13, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 12 },
    
    statsContainer: { marginBottom: 24 },
    
    descSection: { marginBottom: 20 },
    description: { fontSize: 16, lineHeight: 24, color: '#333' },
   
    bottomActions: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: '#FFF' },
    button: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, marginHorizontal: 6 },
    deleteButton: { backgroundColor: '#FFF0F0' },
    editButton: { backgroundColor: Colors.primary },
    deleteText: { color: Colors.danger, fontWeight: '600', marginLeft: 8 },
    editText: { color: '#FFF', fontWeight: '600', marginLeft: 8 },
});