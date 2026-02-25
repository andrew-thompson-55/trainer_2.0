import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@infra/theme';
import { EmojiOption } from './EmojiOption';
import type { MetricConfig } from '../constants';

interface Props {
  metric: MetricConfig;
  selectedValue: number | null;
  onSelect: (key: string, value: number) => void;
}

export function MetricRow({ metric, selectedValue, onSelect }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.question, { color: colors.textPrimary }]}>{metric.question}</Text>
      <View style={styles.options}>
        {metric.options.map((option) => (
          <EmojiOption
            key={option.value}
            option={option}
            selected={selectedValue === option.value}
            onPress={() => onSelect(metric.key, option.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    // color set dynamically via useTheme
    marginBottom: 10,
  },
  options: {
    flexDirection: 'row',
    gap: 4,
  },
});
