import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';
import { Calendar } from 'react-native-calendars';

// Mock Data: Dots on the calendar
const MARKED_DATES = {
  '2025-10-25': { marked: true, dotColor: 'red' },
  '2025-10-26': { marked: true, dotColor: 'blue' },
  '2025-10-27': { marked: true, dotColor: 'green' },
};

export default function CalendarScreen() {
  const [selected, setSelected] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Training Log</Text>
      </View>
      
      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={day => {
            setSelected(day.dateString);
            console.log('selected day', day);
          }}
          markedDates={{
            ...MARKED_DATES,
            [selected]: { selected: true, disableTouchEvent: true, selectedDotColor: 'orange' }
          }}
          theme={{
            todayTextColor: '#007AFF',
            arrowColor: '#007AFF',
            monthTextColor: '#000',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
          }}
        />
      </View>

      {selected ? (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Plan for {selected}</Text>
          <Text style={styles.summaryText}>No details loaded from database yet.</Text>
        </View>
      ) : (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>Select a date to view details.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 20, backgroundColor: '#FFF' },
  titleText: { fontSize: 34, fontWeight: 'bold', color: '#000' },
  calendarContainer: { marginTop: 20, borderRadius: 10, overflow: 'hidden', marginHorizontal: 16 },
  summaryContainer: { padding: 20, marginTop: 20 },
  summaryTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  summaryText: { fontSize: 16, color: '#8E8E93' },
});