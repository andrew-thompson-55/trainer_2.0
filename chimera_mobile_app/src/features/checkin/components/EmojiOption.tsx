import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Layout } from '../../../../theme';
import type { MetricOption } from '../constants';

interface Props {
  option: MetricOption;
  selected: boolean;
  onPress: () => void;
}

export function EmojiOption({ option, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && { backgroundColor: option.color + '20', borderColor: option.color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{option.emoji}</Text>
      <Text style={[styles.label, selected && { color: option.color, fontWeight: '600' }]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: Layout.checkin.optionRadius,
    borderWidth: 2,
    borderColor: 'transparent',
    flex: 1,
    minWidth: 56,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
});
