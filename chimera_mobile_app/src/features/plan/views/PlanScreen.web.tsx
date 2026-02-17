// PlanScreen - Web version (Strategic Command Center)
// 7-column weekly grid with keyboard navigation and detailed overview

import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { usePlan } from '../hooks/usePlan';
import type { Workout } from '@domain/types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function PlanScreen() {
  const router = useRouter();
  const { sections, refreshing, onRefresh, toggleStatus } = usePlan();

  // Group workouts by week for 7-column layout
  const weeks = useMemo(() => {
    const weekMap = new Map<string, Map<string, Workout[]>>();
    const today = new Date();

    sections.forEach((section) => {
      const date = new Date(section.title + 'T12:00:00');
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, new Map());
      }

      const week = weekMap.get(weekKey)!;
      week.set(section.title, section.data);
    });

    // Convert to array and sort by week
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekKey, days]) => ({ weekKey, days }));
  }, [sections]);

  const getActivityColor = (type: string, status: string) => {
    if (status === 'completed') return '#10b981';
    const colors: Record<string, string> = {
      run: '#3b82f6',
      bike: '#f59e0b',
      swim: '#06b6d4',
      strength: '#8b5cf6',
      other: '#6b7280',
    };
    return colors[type] || colors.other;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.titleText}>Training Plan</Text>
          <Text style={styles.subtitle}>Strategic Command Center</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Text style={styles.syncText}>
              {refreshing ? '⟳ Syncing...' : '⟳ Sync'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add_workout')}
          >
            <Text style={styles.addText}>+ Add Workout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 7-Column Weekly Grid */}
      <ScrollView style={styles.content}>
        {weeks.map(({ weekKey, days }) => {
          const weekStart = new Date(weekKey + 'T12:00:00');

          return (
            <View key={weekKey} style={styles.weekContainer}>
              {/* Week Header */}
              <Text style={styles.weekHeader}>
                Week of {format(weekStart, 'MMM d, yyyy')}
              </Text>

              {/* 7 Day Columns */}
              <View style={styles.grid}>
                {DAYS.map((dayName, index) => {
                  const currentDate = addDays(weekStart, index);
                  const dateKey = format(currentDate, 'yyyy-MM-dd');
                  const dayWorkouts = days.get(dateKey) || [];
                  const isToday = isSameDay(currentDate, new Date());

                  return (
                    <View
                      key={dateKey}
                      style={[styles.dayColumn, isToday && styles.todayColumn]}
                    >
                      {/* Day Header */}
                      <View style={styles.dayHeader}>
                        <Text style={[styles.dayName, isToday && styles.todayText]}>
                          {dayName}
                        </Text>
                        <Text style={[styles.dayDate, isToday && styles.todayText]}>
                          {format(currentDate, 'd')}
                        </Text>
                      </View>

                      {/* Workouts for this day */}
                      <View style={styles.dayWorkouts}>
                        {dayWorkouts.length === 0 ? (
                          <Text style={styles.restDay}>Rest</Text>
                        ) : (
                          dayWorkouts.map((workout) => (
                            <TouchableOpacity
                              key={workout.id}
                              style={[
                                styles.workoutCard,
                                {
                                  borderLeftColor: getActivityColor(
                                    workout.activity_type,
                                    workout.status
                                  ),
                                },
                              ]}
                              onPress={() =>
                                router.push({
                                  pathname: '/workout_details',
                                  params: { ...workout },
                                })
                              }
                            >
                              <View style={styles.workoutHeader}>
                                <Text style={styles.workoutTime}>
                                  {format(parseISO(workout.start_time), 'h:mm a')}
                                </Text>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    toggleStatus(workout);
                                  }}
                                  style={styles.statusBadge}
                                >
                                  <Text style={styles.statusText}>
                                    {workout.status === 'completed' ? '✓' : '○'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                              <Text style={styles.workoutTitle} numberOfLines={2}>
                                {workout.title}
                              </Text>
                              <Text style={styles.workoutType}>
                                {workout.activity_type}
                              </Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  syncButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  syncText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  weekContainer: {
    marginBottom: 32,
  },
  weekHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 200,
  },
  dayColumn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  todayColumn: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  dayHeader: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  dayDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  todayText: {
    color: '#3b82f6',
  },
  dayWorkouts: {
    padding: 8,
    gap: 8,
  },
  restDay: {
    textAlign: 'center',
    padding: 20,
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  workoutCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderColor: '#e5e7eb',
    minHeight: 80,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  workoutTime: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    color: '#374151',
  },
  workoutTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  workoutType: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
});
