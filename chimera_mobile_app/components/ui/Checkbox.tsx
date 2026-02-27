import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { pkg } from '@infra/package';
import { useTheme } from '@infra/theme';
import { resolveColor } from './resolve-color';
import { useOptimisticUpdate } from '@/hooks/useOptimisticUpdate';

const tokens = pkg.components.checkbox;

interface CheckboxProps {
  checked: boolean;
  onToggle: (value: boolean) => Promise<void>;
  disabled?: boolean;
  label?: string;
}

export function Checkbox({ checked, onToggle, disabled, label }: CheckboxProps) {
  const { colors } = useTheme();

  const { value, update } = useOptimisticUpdate(checked, {
    mutate: onToggle,
  });

  // Sync from parent when not actively toggling
  useEffect(() => {
    // Only external prop changes
  }, [checked]);

  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value, progress]);

  const animatedBoxStyle = useAnimatedStyle(() => ({
    backgroundColor:
      progress.value > 0.5
        ? resolveColor(tokens.checkedBackground, colors)
        : 'transparent',
    borderColor:
      progress.value > 0.5
        ? resolveColor(tokens.checkedBorderColor, colors)
        : resolveColor(tokens.borderColor, colors),
  }));

  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Pressable
      style={[styles.row, disabled && { opacity: tokens.disabledOpacity }]}
      onPress={() => !disabled && update(!value)}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.box,
          {
            width: tokens.size,
            height: tokens.size,
            borderRadius: tokens.borderRadius,
            borderWidth: tokens.borderWidth,
          },
          animatedBoxStyle,
        ]}
      >
        <Animated.View style={animatedCheckStyle}>
          <Ionicons
            name="checkmark"
            size={tokens.size - 6}
            color={resolveColor(tokens.checkmarkColor, colors)}
          />
        </Animated.View>
      </Animated.View>
      {label ? (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
  },
});
