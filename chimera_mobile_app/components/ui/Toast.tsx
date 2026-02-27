import React, { useEffect } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pkg } from '@infra/package';
import { useTheme } from '@infra/theme';
import { useToast, ToastVariant } from '@/context/ToastContext';
import { resolveColor } from './resolve-color';

const tokens = pkg.components.toast;

export function Toast() {
  const { toast, hideToast } = useToast();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast.visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withDelay(200, withTiming(100, { duration: 1 }));
    }
  }, [toast.visible, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const variant = tokens.variants[toast.variant];

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: insets.bottom + 16 },
        animatedStyle,
      ]}
      pointerEvents={toast.visible ? 'auto' : 'none'}
    >
      <Pressable
        style={[
          styles.toast,
          {
            backgroundColor: resolveColor(variant.background, colors),
            borderRadius: tokens.borderRadius,
            paddingVertical: tokens.paddingVertical,
            paddingHorizontal: tokens.paddingHorizontal,
          },
        ]}
        onPress={hideToast}
      >
        <Text
          style={[
            styles.text,
            { color: resolveColor(variant.text, colors) },
          ]}
        >
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
