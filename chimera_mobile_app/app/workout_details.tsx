import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

export default function WorkoutDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const workout = {
    id: params.id as string,
    title: params.title as string,
    description: params.description as string,
    activity_type: (params.activity_type as string) || 'other',
    start_time: params.start_time as string,
    status: (params.status as string) || 'planned',
  };

  const formattedDate = workout.start_time 
    ? format(parseISO(workout.start_time), 'EEEE, MMMM do, yyyy') 
    : '';
    
  const formattedTime = workout.start_time 
    ? format(parseISO(workout.start_time), 'h:mm a') 
    : '';

  useEffect(() => {
    async function loadActivity() {
        const data = await api.getLinkedActivity(workout.id);
        if (data && data.id) {
            setActivity(data);
        }
        setLoading(false);
    }
    loadActivity();
  }, []);

  // Helper to format duration (seconds -> mm:ss or hh:mm)
  const formatDuration = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m ${s}s`;
  };

  // Helper to format distance (meters -> miles/km)
  const formatDistance = (meters: number) => {
      // Default to miles for US user, could be config later
      const miles = meters * 0.000621371;
      return `${miles.toFixed(2)} mi`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
            <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Details</Text>
        <View style={{ width: 60 }} /> 
      </View>

      <ScrollView style={styles.content}>
        {/* Main Card */}
        <View style={styles.card}>
            <View style={styles.iconRow}>
                 <Ionicons name={getIconName(workout.activity_type)} size={40} color="#007AFF" />
                 <View style={styles.badge}>
                    <Text style={styles.badgeText}>{workout.status.toUpperCase()}</Text>
                 </View>
            </View>
            <Text style={styles.title}>{workout.title}</Text>
            <View style={styles.row}>
                <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
                <Text style={styles.metaText}>{formattedDate} at {formattedTime}</Text>
            </View>
        </View>

        {/* Description */}
        {workout.description ? (
             <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.bodyText}>{workout.description}</Text>
             </View>
        ) : null}

        {/* Performance Data Section */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Data</Text>
            
            {loading ? (
                <ActivityIndicator color="#007AFF" />
            ) : activity ? (
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Distance</Text>
                        <Text style={styles.statValue}>{formatDistance(activity.distance_meters)}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Duration</Text>
                        <Text style={styles.statValue}>{formatDuration(activity.moving_time_seconds)}</Text>
                    </View>
                    {activity.average_heartrate && (
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Avg HR</Text>
                            <Text style={styles.statValue}>{activity.average_heartrate} bpm</Text>
                        </View>
                    )}
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Source</Text>
                        <Text style={styles.statValue}>{activity.source_type.toUpperCase()}</Text>
                    </View>
                </View>
            ) : (
                <View style={styles.placeholderBox}>
                    <Ionicons name="stats-chart" size={30} color="#C7C7CC" />
                    <Text style={styles.placeholderText}>
                        No activity data linked yet.{'\n'}
                        (Sync with Strava to populate)
                    </Text>
                </View>
            )}
        </View>

        <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({
                pathname: "/edit_workout",
                params: {
                    id: workout.id,
                    title: workout.title,
                    description: workout.description,
                    activity_type: workout.activity_type,
                    start_time: workout.start_time,
                    end_time: workout.start_time 
                }
            })}
        >
            <Text style={styles.actionButtonText}>Edit Workout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function getIconName(type: string) {
    switch(type) {
        case 'run': return 'walk';
        case 'bike': return 'bicycle';
        case 'swim': return 'water';
        case 'strength': return 'barbell';
        default: return 'fitness';
    }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 17, color: '#007AFF', marginLeft: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, marginBottom: 20, alignItems: 'center' },
  iconRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10, alignItems: 'flex-start' },
  badge: { backgroundColor: '#E5E5EA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#8E8E93' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 15, color: '#8E8E93' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  bodyText: { fontSize: 16, color: '#000', backgroundColor: '#FFF', padding: 16, borderRadius: 12, lineHeight: 22 },
  placeholderBox: { backgroundColor: '#FFF', borderRadius: 12, padding: 30, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#C7C7CC' },
  placeholderText: { textAlign: 'center', color: '#8E8E93', marginTop: 10 },
  actionButton: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  actionButtonText: { color: '#007AFF', fontSize: 17, fontWeight: '600' },
  
  // New Stats Styles
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, width: '48%', alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#000' },
});