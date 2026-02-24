import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@infra/auth/auth-provider';
import { useTheme } from '@infra/theme';
import { pkg } from '@infra/package';

const { strings } = pkg;

export default function LoginScreen() {
  const { signInWithGoogle, isLoading } = useAuth();
  const { login, colors } = useTheme();

  return (
      <View style={[styles.container, { backgroundColor: login.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.hero, { backgroundColor: login.heroBackground }]}>
          <Ionicons name={strings['login.icon'] as any} size={80} color={colors.primary} />
          <Text style={[styles.title, { color: login.titleColor }]}>{strings['login.title']}</Text>
          <Text style={[styles.subtitle, { color: login.subtitleColor }]}>{strings['login.subtitle']}</Text>
        </View>

        <View style={[styles.bottomSection, { backgroundColor: login.bottomBackground }]}>

          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: login.buttonBackground }, isLoading && styles.buttonDisabled]}
            onPress={() => signInWithGoogle()}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={24} color={login.buttonText} style={styles.icon} />
            <Text style={[styles.buttonText, { color: login.buttonText }]}>
              {isLoading ? strings['login.loading'] : strings['login.continueWithGoogle']}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: login.disclaimerColor }]}>
              {strings['login.disclaimer']}
          </Text>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 42, fontWeight: '900', letterSpacing: 2 },
  subtitle: { fontSize: 16, fontWeight: '700', letterSpacing: 4, marginTop: 4 },
  bottomSection: { padding: 30, paddingBottom: 60, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginBottom: 20 },
  buttonDisabled: { opacity: 0.7 },
  icon: { marginRight: 12 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  disclaimer: { fontSize: 12, textAlign: 'center' }
});
