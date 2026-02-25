import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@infra/theme';

interface Props {
  streak: number;
}

export function StreakBadge({ streak }: Props) {
  const { checkin } = useTheme();

  if (streak <= 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: checkin.streakBg }]}>
      <Text style={[styles.text, { color: checkin.streakText }]}>{streak} day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
