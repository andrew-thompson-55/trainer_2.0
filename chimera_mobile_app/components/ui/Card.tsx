import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { pkg } from '@infra/package';
import { useTheme } from '@infra/theme';
import { resolveColor } from './resolve-color';

const tokens = pkg.components.card;

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  const { colors } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: resolveColor(tokens.background, colors),
    borderRadius: tokens.borderRadius,
    borderWidth: tokens.borderWidth,
    borderColor: resolveColor(tokens.borderColor, colors),
    padding: tokens.padding,
  };

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [cardStyle, pressed && styles.pressed, style]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
  },
});
