import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout, Typography } from '../../theme';
import { useAuth } from '../../context/AuthContext'; // 👈 Import Auth Hook

const API_BASE = 'https://trainer-2-0.onrender.com/v1';
const STRAVA_CLIENT_ID = '176319'; 

export default function SettingsScreen() {
  const { signOut } = useAuth(); // 👈 Get signOut function
  const [loading, setLoading] = useState(false);
  const [useGraphView, setUseGraphView] = useState(false);

  // Load Setting on Mount
  useEffect(() => {
    AsyncStorage.getItem('chimera_stats_view_pref').then(val => {
        setUseGraphView(val === 'graph');
    });
  }, []);

  // Toggle Handler
  const toggleStatsView = async (value: boolean) => {
      setUseGraphView(value);
      await AsyncStorage.setItem('chimera_stats_view_pref', value ? 'graph' : 'grid');
  };

  const handleConnectStrava = async () => {
    setLoading(true);
    try {
      const returnUrl = Linking.createURL('redirect'); 
      const backendRedirect = `${API_BASE}/integrations/strava/redirect`;
      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(backendRedirect)}&approval_prompt=force&scope=read,activity:read_all&state=${encodeURIComponent(returnUrl)}`;
      await WebBrowser.openBrowserAsync(authUrl);
    } catch (error) {
      Alert.alert("Error", "Failed to launch browser.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Settings</Text>
      </View>

      <View style={styles.content}>
        
        {/* PREFERENCES SECTION */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.row}>
            <View style={styles.rowLeft}>
                <Ionicons name="bar-chart" size={24} color={Colors.primary} />
                <Text style={styles.rowText}>Use Graph View</Text>
            </View>
            <Switch 
                value={useGraphView} 
                onValueChange={toggleStatsView}
                trackColor={{ false: Colors.border, true: Colors.primary }}
            />
        </View>
        <Text style={styles.helperText}>
            Show workout stats as bars instead of a grid.
        </Text>

        <View style={{ height: 24 }} />

        {/* INTEGRATIONS SECTION */}
        <Text style={styles.sectionTitle}>Integrations</Text>
        
        <TouchableOpacity 
            style={styles.row} 
            onPress={handleConnectStrava}
            disabled={loading}
        >
            <View style={styles.rowLeft}>
                <Ionicons name="bicycle" size={24} color="#FC4C02" />
                <Text style={styles.rowText}>Connect Strava</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
        </TouchableOpacity>
        
        <Text style={styles.helperText}>
            {loading ? "Connecting..." : "Import your activities automatically."}
        </Text>

        <View style={{ height: 24 }} />

        {/* 👇 NEW ACCOUNT SECTION */}
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity 
            style={styles.row} 
            onPress={signOut}
        >
            <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                <Text style={[styles.rowText, { color: '#FF3B30' }]}>Log Out</Text>
            </View>
        </TouchableOpacity>
        <Text style={styles.helperText}>
            Sign out of your account on this device.
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: Colors.border },
  titleText: Typography.header,
  content: { padding: 20 },
  sectionTitle: { fontSize: 13, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 17, color: '#000' },
  helperText: { marginTop: 8, marginLeft: 4, color: '#8E8E93', fontSize: 13 },
});