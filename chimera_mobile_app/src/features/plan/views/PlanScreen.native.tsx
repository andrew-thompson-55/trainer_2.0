import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, SectionList, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { format, parseISO, isSameDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Layout, Typography } from '../../theme';
import { usePlan } from '@features/plan';

export default function ItineraryScreen() {
  const router = useRouter();
  const sectionListRef = useRef<SectionList>(null);

  const { sections, refreshing, onRefresh, toggleStatus } = usePlan();

  // Auto-scroll to today's date
  useEffect(() => {
    if (sections.length === 0) return;

    const scroll = async () => {
        try {
            let targetDate = await AsyncStorage.getItem('chimera_active_date');
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            if (!targetDate) targetDate = todayStr;

            let index = sections.findIndex((s) => s.title === targetDate);
            if (index === -1) index = sections.findIndex((s) => s.title >= targetDate!);

            if (index !== -1 && sectionListRef.current) {
                setTimeout(() => {
                    sectionListRef.current?.scrollToLocation({
                        sectionIndex: index,
                        itemIndex: 0,
                        viewOffset: 80,
                        animated: true
                    });
                }, 300);
            }
        } catch (e) { console.log("Scroll Error", e); }
    };
    scroll();
  }, [sections]);

  // --- HEADER RENDERER ---
  const renderSectionHeader = ({ section: { title, data } }: any) => {
    const dateObj = new Date(title + 'T12:00:00');
    const isToday = isSameDay(dateObj, new Date());
    const headerText = format(dateObj, 'EEEE, MMMM do');
    const isEmpty = data.length === 0;

    return (
        <View>
            {/* 🛑 THE BOLD LINE (Now guaranteed to show) */}
            {isToday && (
                <View style={styles.todaySeparatorContainer}>
                    <View style={styles.todayLine} />
                    <Text style={styles.todayTag}>TODAY</Text>
                </View>
            )}
            
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionHeaderText, isToday && styles.todayText]}>
                    {headerText}
                </Text>
                {/* 💤 REST DAY INDICATOR (Only shows if today is empty) */}
                {isToday && isEmpty && (
                    <Text style={styles.restDayText}>Rest Day • No scheduled workouts</Text>
                )}
            </View>
        </View>
    );
  };

  const renderItem = ({ item: workout }: any) => (
    <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push({ pathname: "/workout_details", params: { ...workout } })}
    >
        <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
                {workout.start_time ? format(parseISO(workout.start_time), 'h:mm a') : '--:--'}
            </Text>
            <View style={workout.status === 'completed' ? styles.lineCompleted : styles.linePending} />
        </View>
        
        <View style={[styles.details, workout.status === 'completed' ? styles.detailsCompleted : null]}>
            <Text style={styles.workoutTitle}>{workout.title || 'Untitled Workout'}</Text>
            <Text style={styles.workoutMeta} numberOfLines={2}>
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
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false} 
        ListEmptyComponent={<Text style={styles.emptyText}>No workouts scheduled.</Text>}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
        onScrollToIndexFailed={() => {}} 
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add_workout')}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    padding: Layout.spacing.xl, 
    backgroundColor: Colors.header, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border,
    zIndex: 10 
  },
  titleText: Typography.header,
  content: { 
    paddingHorizontal: Layout.spacing.l, 
    paddingBottom: 100 
  },
  
  // Section Headers
  sectionHeader: { 
    paddingVertical: Layout.spacing.m, 
    backgroundColor: Colors.background, 
    marginBottom: Layout.spacing.s,
  },
  sectionHeaderText: Typography.subHeader,
  todayText: { color: Colors.primary, fontWeight: '800' }, 
  restDayText: { marginTop: 4, fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },

  // 🛑 The Bold Line Styles
  todaySeparatorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 8,
      // Pull negative margin to stretch to screen edge, canceling the container padding
      marginHorizontal: -Layout.spacing.l, 
      paddingHorizontal: Layout.spacing.l,
  },
  todayLine: {
      flex: 1,
      height: 3, 
      backgroundColor: Colors.primary,
      opacity: 0.3, 
  },
  todayTag: {
      marginLeft: 12,
      fontSize: 12,
      fontWeight: 'bold',
      color: Colors.primary,
      backgroundColor: '#E5F1FF',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      overflow: 'hidden'
  },
  
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
    position: 'absolute', right: 20, bottom: 20, backgroundColor: Colors.primary, width: 56, height: 56, 
    borderRadius: Layout.borderRadius.round, justifyContent: 'center', alignItems: 'center', 
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 
  }
});