import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { api } from '../../../../services/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useTheme, Typography } from '@infra/theme';
import { Layout } from '../../../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@infra/storage/keys';

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, activity } = useTheme();
  const [selectedDate, setSelectedDate] = useState('');
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState({});

  const getActivityColor = (type: string) => activity[type] || activity.other;

  useFocusEffect(
    useCallback(() => {
      async function loadData() {

        const updateUI = (data: any[]) => {
            setWorkouts(data);
            const marked: any = {};

            if (data && Array.isArray(data)) {
                data.forEach((workout: any) => {
                    if (!workout.start_time) return;

                    // 1. Timezone Fix
                    const localDate = parseISO(workout.start_time);
                    const dateKey = format(localDate, 'yyyy-MM-dd');

                    // 2. Get Color
                    const type = workout.activity_type || 'other';
                    const color = activity[type] || activity.other;

                    // 3. Multi-Dot Logic
                    if (!marked[dateKey]) {
                        marked[dateKey] = { dots: [] };
                    }

                    // Add this workout as a dot
                    marked[dateKey].dots.push({
                        key: workout.id,
                        color: color,
                    });
                });
            }
            setMarkedDates(marked);
        };

        const cached = await api.getCachedWorkouts();
        if (cached.length > 0) updateUI(cached);

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

  const selectedWorkouts = workouts.filter(w => {
    if (!w.start_time) return false;
    const localDate = parseISO(w.start_time);
    return format(localDate, 'yyyy-MM-dd') === selectedDate;
  });

  const formattedSelectedDate = selectedDate
    ? format(parseISO(selectedDate), 'EEEE, MMMM do')
    : 'Select a date';

  const handleDayPress = async (day: any) => {
    setSelectedDate(day.dateString);
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_DATE, day.dateString);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>Training Log</Text>
      </View>

      <View style={[styles.calendarContainer, { backgroundColor: colors.card }]}>
        <Calendar

        // ENABLE MULTI-DOT MODE
          markingType={'multi-dot'}
          onDayPress={handleDayPress}

          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...(markedDates[selectedDate] || {}),
              selected: true,
              selectedColor: colors.primary,
            }
          }}

          theme={{
            calendarBackground: colors.card,
            dayTextColor: colors.textPrimary,
            textDisabledColor: colors.iconInactive,
            todayTextColor: colors.primary,
            arrowColor: colors.primary,
            monthTextColor: colors.textPrimary,
            textMonthFontWeight: 'bold',
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: '#ffffff',
          }}
        />
      </View>

      <ScrollView style={styles.summaryContainer}>
        <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>{formattedSelectedDate}</Text>

        {selectedWorkouts.length > 0 ? (
            selectedWorkouts.map((w: any) => (
                <TouchableOpacity
                    key={w.id}
                    style={[styles.workoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
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
                    <View style={[styles.colorStrip, { backgroundColor: getActivityColor(w.activity_type) }]} />
                    <View style={styles.workoutContent}>
                        <Text style={[styles.workoutTitle, { color: colors.textPrimary }]}>{w.title}</Text>
                        <Text style={[styles.workoutMeta, { color: colors.textSecondary }]}>
                            {format(parseISO(w.start_time), 'h:mm a')} • {w.activity_type.toUpperCase()}
                        </Text>
                    </View>
                </TouchableOpacity>
            ))
        ) : (
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                {selectedDate ? "No workouts logged." : "Tap a day to see details."}
            </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: Layout.spacing.xl,
    borderBottomWidth: 1,
  },
  titleText: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  calendarContainer: {
    marginTop: Layout.spacing.l,
    borderRadius: Layout.borderRadius.m,
    overflow: 'hidden',
    marginHorizontal: Layout.spacing.l,
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  summaryContainer: { padding: Layout.spacing.xl, marginTop: Layout.spacing.s },
  summaryTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  summaryText: { fontSize: 16, fontStyle: 'italic' },
  workoutCard: {
    flexDirection: 'row',
    borderRadius: Layout.borderRadius.m,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  colorStrip: { width: 6 },
  workoutContent: { padding: 16 },
  workoutTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  workoutMeta: { fontSize: 12 }
});
