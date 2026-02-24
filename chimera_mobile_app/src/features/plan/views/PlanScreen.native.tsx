import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, SectionList, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { format, parseISO, isSameDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Layout, Typography, useTheme } from '@infra/theme';
import { usePlan } from '@features/plan';
import { pkg } from '@infra/package';
import { STORAGE_KEYS } from '@infra/storage/keys';

const { strings } = pkg;

export default function ItineraryScreen() {
  const router = useRouter();
  const sectionListRef = useRef<SectionList>(null);
  const { colors } = useTheme();

  const { sections, refreshing, onRefresh, toggleStatus } = usePlan();

  // Auto-scroll to today's date
  useEffect(() => {
    if (sections.length === 0) return;

    const scroll = async () => {
        try {
            let targetDate = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_DATE);
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
            {isToday && (
                <View style={styles.todaySeparatorContainer}>
                    <View style={[styles.todayLine, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.todayTag, { color: colors.primary }]}>{strings['plan.today']}</Text>
                </View>
            )}

            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionHeaderText, isToday && { color: colors.primary, fontWeight: '800' }]}>
                    {headerText}
                </Text>
                {isToday && isEmpty && (
                    <Text style={[styles.restDayText, { color: colors.textSecondary }]}>{strings['plan.restDay']}</Text>
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
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {workout.start_time ? format(parseISO(workout.start_time), 'h:mm a') : '--:--'}
            </Text>
            <View style={workout.status === 'completed' ? [styles.lineCompleted, { backgroundColor: colors.success }] : [styles.linePending, { backgroundColor: colors.border }]} />
        </View>

        <View style={[styles.details, { backgroundColor: colors.card }, workout.status === 'completed' ? styles.detailsCompleted : null]}>
            <Text style={[styles.workoutTitle, { color: colors.textPrimary }]}>{workout.title || 'Untitled Workout'}</Text>
            <Text style={[styles.workoutMeta, { color: colors.textSecondary }]} numberOfLines={2}>
                {workout.activity_type || 'other'}
                {workout.description ? ` \u2022 ${workout.description}` : ''}
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
                color={workout.status === 'completed' ? colors.success : colors.iconInactive}
            />
        </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>{strings['plan.title']}</Text>
      </View>

      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{strings['plan.empty']}</Text>}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        onScrollToIndexFailed={() => {}}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => router.push('/add_workout')}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: Layout.spacing.xl,
    borderBottomWidth: 1,
    zIndex: 10
  },
  titleText: { ...Typography.header },
  content: {
    paddingHorizontal: Layout.spacing.l,
    paddingBottom: 100
  },

  // Section Headers
  sectionHeader: {
    paddingVertical: Layout.spacing.m,
    marginBottom: Layout.spacing.s,
  },
  sectionHeaderText: { ...Typography.subHeader },
  restDayText: { marginTop: 4, fontSize: 13, fontStyle: 'italic' },

  // Today separator
  todaySeparatorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 8,
      marginHorizontal: -Layout.spacing.l,
      paddingHorizontal: Layout.spacing.l,
  },
  todayLine: {
      flex: 1,
      height: 3,
      opacity: 0.3,
  },
  todayTag: {
      marginLeft: 12,
      fontSize: 12,
      fontWeight: 'bold',
      backgroundColor: '#E5F1FF',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      overflow: 'hidden'
  },

  card: { flexDirection: 'row', marginBottom: Layout.spacing.m },
  timeContainer: { width: 70, alignItems: 'center', paddingTop: 4 },
  timeText: { fontSize: 12, marginBottom: 4 },
  lineCompleted: { width: 2, flex: 1 },
  linePending: { width: 2, flex: 1 },
  details: {
    flex: 1,
    borderRadius: Layout.borderRadius.m,
    padding: Layout.spacing.l,
    marginRight: Layout.spacing.m,
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4
  },
  detailsCompleted: { opacity: 0.6 },
  workoutTitle: { ...Typography.cardTitle },
  workoutMeta: { fontSize: 13, textTransform: 'capitalize' },
  checkbox: { justifyContent: 'center', paddingLeft: Layout.spacing.s },
  emptyText: { textAlign: 'center', marginTop: 50 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56,
    borderRadius: Layout.borderRadius.round, justifyContent: 'center', alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8
  }
});
