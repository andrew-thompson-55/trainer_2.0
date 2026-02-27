import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { pkg } from '@infra/package';
import { useTheme } from '@infra/theme';
import { resolveColor } from './resolve-color';
import { useOptimisticUpdate } from '@/hooks/useOptimisticUpdate';

const tokens = pkg.components.toggle;

interface ToggleProps {
  value: boolean;
  onToggle: (value: boolean) => Promise<void>;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ value: propValue, onToggle, disabled, label }: ToggleProps) {
  const { colors } = useTheme();

  const { value, update } = useOptimisticUpdate(propValue, {
    mutate: onToggle,
  });

  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value, progress]);

  const onColor = resolveColor(tokens.trackOnColor, colors);
  const offColor = resolveColor(tokens.trackOffColor, colors);
  const thumbEnd = tokens.trackWidth - tokens.thumbSize - tokens.thumbInset;

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offColor, onColor]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          tokens.thumbInset + progress.value * (thumbEnd - tokens.thumbInset),
      },
    ],
  }));

  return (
    <Pressable
      style={[styles.row, disabled && { opacity: tokens.disabledOpacity }]}
      onPress={() => !disabled && update(!value)}
      disabled={disabled}
    >
      {label ? (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
      ) : null}
      <Animated.View
        style={[
          styles.track,
          {
            width: tokens.trackWidth,
            height: tokens.trackHeight,
            borderRadius: tokens.trackHeight / 2,
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: tokens.thumbSize,
              height: tokens.thumbSize,
              borderRadius: tokens.thumbSize / 2,
              backgroundColor: resolveColor(tokens.thumbColor, colors),
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  track: {
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    flexShrink: 1,
  },
});
