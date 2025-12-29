import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme';

export default function LoginScreen() {
  const { signInWithGoogle, isLoading } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Ionicons name="flash" size={80} color={Colors.primary} />
        <Text style={styles.title}>CHIMERA</Text>
        <Text style={styles.subtitle}>TRAINING</Text>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[styles.googleButton, isLoading && styles.buttonDisabled]} 
          onPress={() => signInWithGoogle()}
          disabled={isLoading}
        >
          <Ionicons name="logo-google" size={24} color="#000" style={styles.icon} />
          <Text style={styles.buttonText}>
             {isLoading ? "Loading..." : "Continue with Google"}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.disclaimer}>
            By continuing, you agree to sweat, suffer, and improve.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 42, fontWeight: '900', color: '#FFF', letterSpacing: 2 },
  subtitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, letterSpacing: 4, marginTop: 4 },
  bottomSection: { padding: 30, paddingBottom: 60, backgroundColor: '#1C1C1E', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 20 },
  buttonDisabled: { opacity: 0.7 },
  icon: { marginRight: 12 },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#000' },
  disclaimer: { color: '#48484A', fontSize: 12, textAlign: 'center' }
});