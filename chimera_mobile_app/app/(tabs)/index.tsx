import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../../theme';

export default function DashboardScreen() {
  const router = useRouter();

  const menuItems = [
    { title: 'Training Plan', icon: 'list', route: '/(tabs)/itinerary', color: Colors.primary },
    { title: 'Calendar', icon: 'calendar', route: '/(tabs)/calendar', color: '#FF9500' }, // Orange
    { title: 'AI Coach', icon: 'chatbubbles', route: '/(tabs)/chat', color: '#5856D6' }, // Purple
    { title: 'Stats & Tracker', icon: 'stats-chart', route: '/(tabs)/tracker', color: '#34C759' }, // Green
    { title: 'Settings', icon: 'settings', route: '/(tabs)/settings', color: '#8E8E93' }, // Gray
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header / Welcome Area */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome Back,</Text>
          <Text style={styles.title}>Ready to train?</Text>
        </View>

        {/* Grid of Big Buttons */}
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.card} 
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={32} color={item.color} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 20 },
  header: { marginBottom: 30, marginTop: 20 },
  greeting: { fontSize: 16, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 34, fontWeight: 'bold', color: '#000' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { 
    width: '47%', 
    aspectRatio: 1, 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 20, 
    justifyContent: 'space-between',
    shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 8
  },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#000' }
});