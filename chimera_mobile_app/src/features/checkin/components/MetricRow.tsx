import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EmojiOption } from './EmojiOption';
import type { MetricConfig } from '../constants';

interface Props {
  metric: MetricConfig;
  selectedValue: number | null;
  onSelect: (key: string, value: number) => void;
}

export function MetricRow({ metric, selectedValue, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{metric.question}</Text>
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
    color: '#000',
    marginBottom: 10,
  },
  options: {
    flexDirection: 'row',
    gap: 4,
  },
});
