import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  Text,
  View,
  StyleSheet,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { pkg } from '@infra/package';
import { useTheme } from '@infra/theme';
import { resolveColor } from './resolve-color';

const tokens = pkg.components.input;

const AnimatedView = Animated.createAnimatedComponent(View);

interface TextInputComponentProps extends Omit<RNTextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  error?: string;
}

export function TextInput({
  value,
  onChangeText,
  placeholder,
  label,
  multiline,
  error,
  ...rest
}: TextInputComponentProps) {
  const { colors } = useTheme();
  const focus = useSharedValue(0);

  const borderDefault = resolveColor(tokens.borderColor, colors);
  const borderFocus = resolveColor(tokens.focusBorderColor, colors);
  const borderError = resolveColor(tokens.errorColor, colors);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? borderError
      : interpolateColor(focus.value, [0, 1], [borderDefault, borderFocus]),
  }));

  return (
    <View style={styles.container}>
      {label ? (
        <Text
          style={[
            styles.label,
            { color: resolveColor(tokens.textColor, colors) },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <AnimatedView
        style={[
          styles.inputWrapper,
          {
            backgroundColor: resolveColor(tokens.background, colors),
            borderRadius: tokens.borderRadius,
            borderWidth: tokens.borderWidth,
          },
          borderStyle,
        ]}
      >
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={resolveColor(tokens.placeholderColor, colors)}
          multiline={multiline}
          style={[
            styles.input,
            {
              color: resolveColor(tokens.textColor, colors),
              fontSize: tokens.fontSize,
              paddingVertical: tokens.paddingVertical,
              paddingHorizontal: tokens.paddingHorizontal,
            },
            multiline && styles.multiline,
          ]}
          onFocus={() => {
            focus.value = withTiming(1, { duration: 200 });
          }}
          onBlur={() => {
            focus.value = withTiming(0, { duration: 200 });
          }}
          {...rest}
        />
      </AnimatedView>
      {error ? (
        <Text
          style={[
            styles.error,
            { color: resolveColor(tokens.errorColor, colors) },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    overflow: 'hidden',
  },
  input: {
    margin: 0,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: 13,
  },
});
