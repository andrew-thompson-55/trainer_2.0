import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pkg } from '@infra/package';
import { useTheme } from '@infra/theme';
import { resolveColor } from './resolve-color';

const tokens = pkg.components.button;

type Variant = keyof typeof tokens.variants;

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const { colors } = useTheme();
  const v = tokens.variants[variant];

  const bg = resolveColor(v.background, colors);
  const textColor = resolveColor(v.text, colors);
  const borderColor = resolveColor(v.borderColor, colors);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderRadius: tokens.borderRadius,
          paddingVertical: tokens.paddingVertical,
          paddingHorizontal: tokens.paddingHorizontal,
          opacity: disabled || loading ? tokens.disabledOpacity : pressed ? 0.8 : 1,
        },
        fullWidth && styles.fullWidth,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={textColor}
              style={styles.icon}
            />
          ) : null}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    marginRight: -2,
  },
});
