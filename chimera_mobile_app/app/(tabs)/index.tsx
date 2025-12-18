import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, SectionList, SafeAreaView, TouchableOpacity, RefreshControl, ToastAndroid, Platform, Alert } from 'react-native';
import { format, parseISO, isSameDay } from 'date-fns';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons'; 
import { api } from '../../services/api';

// 👇 IMPORT THE THEME
import { Colors, Layout, Typography } from '../../theme';

export default function ItineraryScreen() {
  const router = useRouter(); 
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Helper to process raw data into sections
  // Inside app/(tabs)/index.tsx

  const processAndSetSections = (data: any[]) => {
      const grouped: any = {};
      data.forEach((workout: any) => {
        if (!workout.start_time) return;
        
        // 🐛 BUG FIX: 
        // Old way: workout.start_time.split('T')[0] (Uses UTC date)
        // New way: Parse to Object -> Format to Local String
        
        const localDate = parseISO(workout.start_time);
        const dateKey = format(localDate, 'yyyy-MM-dd'); // This returns "2023-12-17" based on YOUR phone's time
        
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

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    // 1. Cache
    const cachedData = await api.getCachedWorkouts();
    if (cachedData && cachedData.length > 0) {
        processAndSetSections(cachedData);
    }

    // 2. Network
    try {
      const netData = await api.getWorkouts();
      if (netData && Array.isArray(netData)) {
        processAndSetSections(netData);
      }
    } catch (e) {
      console.log("Network refresh failed");
    } finally {
      setLoading(false); 
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    // 1. Flush Offline Queue
    const processed = await api.processOfflineQueue();
    
    // 2. Sync Google Calendar
    try { await api.syncGCal(); } catch (e) {}

    // 3. Reload UI
    await loadData(true); 
    setRefreshing(false);
    
    if (Platform.OS === 'android') {
        const msg = processed > 0 ? `Synced ${processed} updates & GCal ✅` : "Up to date ✅";
        ToastAndroid.show(msg, ToastAndroid.SHORT);
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
        loadData(); 
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
            <View style={workout.status === 'completed' ? styles.lineCompleted : styles.linePending} />
        </View>
        
        <View style={[styles.details, workout.status === 'completed' ? styles.detailsCompleted : null]}>
            <Text style={styles.workoutTitle}>{workout.title || 'Untitled Workout'}</Text>
            <Text style={styles.workoutMeta} numberOfLines={4}>
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
                color={workout.status === 'completed' ? Colors.success : Colors.iconInactive} 
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
        refreshControl={
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={[Colors.primary]} 
                tintColor={Colors.primary}
            />
        }
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

// 👇 THEME-POWERED STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  
  header: { 
    padding: Layout.spacing.xl, 
    backgroundColor: Colors.header, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border 
  },
  
  titleText: Typography.header,
  
  content: { 
    paddingHorizontal: Layout.spacing.l, 
    paddingBottom: 100 
  },
  
  sectionHeader: { 
    paddingVertical: Layout.spacing.m, 
    backgroundColor: Colors.background, 
    marginBottom: Layout.spacing.s 
  },
  
  sectionHeaderText: Typography.subHeader,
  
  todayText: { color: Colors.primary }, 
  
  card: { flexDirection: 'row', marginBottom: Layout.spacing.m },
  
  timeContainer: { width: 70, alignItems: 'center', paddingTop: 4 },
  timeText: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  
  lineCompleted: { width: 2, flex: 1, backgroundColor: Colors.success },
  linePending: { width: 2, flex: 1, backgroundColor: Colors.border },
  
  details: { 
    flex: 1, 
    backgroundColor: Colors.card, 
    borderRadius: Layout.borderRadius.m, 
    padding: Layout.spacing.l, 
    marginRight: Layout.spacing.m, 
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 
  },
  
  detailsCompleted: { opacity: 0.6 },
  
  workoutTitle: Typography.cardTitle,
  
  workoutMeta: { fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },
  
  checkbox: { justifyContent: 'center', paddingLeft: Layout.spacing.s },
  
  emptyText: { textAlign: 'center', marginTop: 50, color: Colors.textSecondary },
  
  fab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 20, 
    backgroundColor: Colors.primary, 
    width: 56, 
    height: 56, 
    borderRadius: Layout.borderRadius.round, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 
  }
});