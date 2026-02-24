import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../../../theme';

interface Props {
  streak: number;
}

export function StreakBadge({ streak }: Props) {
  if (streak <= 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{streak} day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.checkin.streakBg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.checkin.streakText,
  },
});
