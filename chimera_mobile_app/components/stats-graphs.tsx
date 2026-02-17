import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatItem } from '@domain/types/strava';
import { Colors } from '../theme';

interface Props {
  stats: StatItem[];
}

export const StatsGraphs = ({ stats }: Props) => {
  if (!stats || stats.length === 0) {
    return (
      <View style={styles.placeholderBox}>
        <Text style={styles.placeholderText}>No activity data available.</Text>
      </View>
    );
  }

  // Helper to normalize values for bars (0-100%)
  // We make a rough guess on max values based on unit types for visualization
  const getProgress = (stat: StatItem) => {
    const val = parseFloat(stat.value);
    if (isNaN(val)) return 0;
    
    // Heuristic max values for visualization
    if (stat.unit === 'bpm') return Math.min(val / 200, 1);
    if (stat.unit === 'mph') return Math.min(val / 25, 1);
    if (stat.unit === 'w') return Math.min(val / 400, 1);
    if (stat.unit === 'min/mi') return Math.min(15 / val, 1); // Inverse for pace (lower is faster)
    
    return 0.5; // Default to half-bar
  };

  return (
    <View style={styles.container}>
      {stats.map((stat) => (
        <View key={stat.id} style={styles.row}>
            {/* Label Column */}
            <View style={styles.labelCol}>
                <Text style={styles.label}>{stat.label}</Text>
                <Text style={styles.value}>
                    {stat.value} <Text style={styles.unit}>{stat.unit}</Text>
                </Text>
            </View>

            {/* Bar Column */}
            <View style={styles.barContainer}>
                <View 
                    style={[
                        styles.barFill, 
                        { width: `${getProgress(stat) * 100}%`, backgroundColor: Colors.primary }
                    ]} 
                />
            </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  labelCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' },
  label: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  value: { fontSize: 17, fontWeight: 'bold', color: Colors.textPrimary },
  unit: { fontSize: 13, fontWeight: 'normal', color: Colors.textSecondary },
  
  barContainer: { height: 8, backgroundColor: '#F2F2F7', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  placeholderBox: { padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#C7C7CC', borderRadius: 12 },
  placeholderText: { color: '#8E8E93' },
});