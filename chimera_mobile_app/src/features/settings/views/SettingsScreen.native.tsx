// app/(tabs)/settings.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../../theme';
import { useAuth } from '@infra/auth/auth-provider';
import { authFetch } from '@infra/fetch/auth-fetch';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [useGraphView, setUseGraphView] = useState(false);
  const [defaultPage, setDefaultPage] = useState('/(tabs)'); // Default to Home

  // 1. HANDLE DEEP LINKS (Strava Redirect)
  const url = Linking.useURL();

  useEffect(() => {
    if (url) {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.code) {
        exchangeStravaCode(queryParams.code as string);
      } else if (queryParams?.error) {
        Alert.alert("Strava Error", "Connection denied.");
      }
    }
  }, [url]);

  // 2. LOAD PREFERENCES (Graph View + Default Page)
  useEffect(() => {
    // Load Graph Pref
    AsyncStorage.getItem('chimera_stats_view_pref').then(val => {
        setUseGraphView(val === 'graph');
    });

    // Load Default Page Pref
    AsyncStorage.getItem('chimera_default_route').then(val => {
       if (val) setDefaultPage(val);
    });
  }, []);

  // 3. ACTIONS
  const toggleStatsView = async (value: boolean) => {
      setUseGraphView(value);
      await AsyncStorage.setItem('chimera_stats_view_pref', value ? 'graph' : 'grid');
  };

  const handleSetDefault = async (route: string) => {
      setDefaultPage(route);
      await AsyncStorage.setItem('chimera_default_route', route);
  };

  const exchangeStravaCode = async (code: string) => {
    if (!user?.token) return;

    setLoading(true);
    try {
      const res = await authFetch('/integrations/strava/exchange', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Exchange failed");
      }

      const data = await res.json();
      Alert.alert("Success", `Connected to ${data.athlete?.firstname || 'Strava'}!`);
      
    } catch (e: any) {
      console.error("Strava Exchange Error:", e);
      Alert.alert("Connection Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStrava = async () => {
    if (!user || !user.token) {
      console.error("No user logged in");
      return;
    }

    const returnUrl = Linking.createURL('redirect');

    try {
      const response = await authFetch(
        `/integrations/strava/auth-url?return_url=${encodeURIComponent(returnUrl)}`
      );

      const data = await response.json();

      if (data.url) {
        Linking.openURL(data.url);
      } else {
        throw new Error("Backend returned success but no URL found.");
      }

    } catch (error) {
      console.error("Failed to start Strava auth:", error);
      Alert.alert("Error", "Could not reach Strava service.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* SECTION: APP STARTUP */}
        <Text style={styles.sectionTitle}>App Startup</Text>
        <View style={styles.startupContainer}>
            <Text style={styles.label}>Open App To:</Text>
            <View style={styles.pillContainer}>
                <TouchableOpacity 
                    style={[styles.pill, defaultPage === '/(tabs)' && styles.pillActive]}
                    onPress={() => handleSetDefault('/(tabs)')}
                >
                    <Text style={[styles.pillText, defaultPage === '/(tabs)' && styles.pillTextActive]}>Home</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.pill, defaultPage === '/(tabs)/itinerary' && styles.pillActive]}
                    onPress={() => handleSetDefault('/(tabs)/itinerary')}
                >
                    <Text style={[styles.pillText, defaultPage === '/(tabs)/itinerary' && styles.pillTextActive]}>Plan</Text>
                </TouchableOpacity>

                 <TouchableOpacity 
                    style={[styles.pill, defaultPage === '/(tabs)/chat' && styles.pillActive]}
                    onPress={() => handleSetDefault('/(tabs)/chat')}
                >
                    <Text style={[styles.pillText, defaultPage === '/(tabs)/chat' && styles.pillTextActive]}>Coach</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={{ height: 24 }} />

        {/* SECTION: PREFERENCES */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.row}>
            <View style={styles.rowLeft}>
                <Ionicons name="bar-chart" size={24} color={Colors.primary} />
                <Text style={styles.rowText}>Use Graph View</Text>
            </View>
            <Switch 
                value={useGraphView} 
                onValueChange={toggleStatsView}
                trackColor={{ false: '#C7C7CC', true: Colors.primary }}
            />
        </View>

        <View style={{ height: 24 }} />

        {/* SECTION: INTEGRATIONS */}
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

        {/* SECTION: ACCOUNT */}
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.row} onPress={signOut}>
            <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                <Text style={[styles.rowText, { color: '#FF3B30' }]}>Log Out</Text>
            </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  titleText: Typography.header,
  content: { padding: 20 },
  
  sectionTitle: { fontSize: 13, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  
  // Row Styles
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 17, color: '#000' },
  helperText: { marginTop: 8, marginLeft: 4, color: '#8E8E93', fontSize: 13 },

  // Startup Pills
  startupContainer: { backgroundColor: '#FFF', padding: 16, borderRadius: 12 },
  label: { fontSize: 17, marginBottom: 12, color: '#000' },
  pillContainer: { flexDirection: 'row', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: '#E5E5EA' },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { color: '#000', fontWeight: '500' },
  pillTextActive: { color: '#FFF' },
});