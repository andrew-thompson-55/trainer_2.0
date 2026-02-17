import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatItem } from '@domain/types/strava';

interface Props {
  stats: StatItem[];
}

export const StatsGrid = ({ stats }: Props) => {
  if (!stats || stats.length === 0) {
    return (
      <View style={styles.placeholderBox}>
        <Text style={styles.placeholderText}>No activity data available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.box}>
          <Text style={styles.label}>{stat.label}</Text>
          <Text style={styles.value}>
            {stat.value} <Text style={styles.unit}>{stat.unit}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  box: { 
    backgroundColor: '#F2F2F7', 
    borderRadius: 12, 
    padding: 16, 
    width: '48%', // Creates a 2-column grid
    alignItems: 'center',
    marginBottom: 0
  },
  label: { 
    fontSize: 11, 
    color: '#8E8E93', 
    marginBottom: 4, 
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  value: { 
    fontSize: 17, 
    fontWeight: 'bold', 
    color: '#000' 
  },
  unit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#8E8E93'
  },
  placeholderBox: { 
    padding: 20, 
    alignItems: 'center', 
    borderStyle: 'dashed', 
    borderWidth: 1, 
    borderColor: '#C7C7CC', 
    borderRadius: 12 
  },
  placeholderText: { color: '#8E8E93' },
});