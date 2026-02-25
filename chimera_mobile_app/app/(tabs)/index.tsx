import React from 'react';
import { Platform, StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@infra/theme';
import { pkg } from '@infra/package';

const { strings } = pkg;

const WebDashboard = Platform.OS === 'web'
  ? require('@features/web-dashboard/WebDashboard').WebDashboard as React.ComponentType
  : null;

export default function DashboardScreen() {
  if (Platform.OS === 'web' && WebDashboard) {
    return <WebDashboard />;
  }

  return <NativeDashboard />;
}

function NativeDashboard() {
  const router = useRouter();
  const { colors, dashboard } = useTheme();

  const menuItems = [
    { title: strings['dashboard.menu.trainingPlan'], icon: 'list', route: '/(tabs)/plan', color: dashboard.trainingPlan },
    { title: strings['dashboard.menu.calendar'], icon: 'calendar', route: '/(tabs)/calendar', color: dashboard.calendar },
    { title: strings['dashboard.menu.aiCoach'], icon: 'chatbubbles', route: '/(tabs)/coach', color: dashboard.aiCoach },
    { title: strings['dashboard.menu.checkIn'], icon: 'checkmark-circle', route: '/(tabs)/tracker', color: dashboard.checkIn },
    { title: strings['dashboard.menu.settings'], icon: 'settings', route: '/(tabs)/settings', color: dashboard.settings },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header / Welcome Area */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{strings['dashboard.greeting']}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{strings['dashboard.title']}</Text>
        </View>

        {/* Grid of Big Buttons */}
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={32} color={item.color} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: { marginBottom: 30, marginTop: 20 },
  greeting: { fontSize: 16, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 34, fontWeight: 'bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8
  },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '600' }
});
