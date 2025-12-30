import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../../theme';
import { useAuth } from '../../context/AuthContext'; // 👈 Need this for the Token

const API_BASE = 'https://trainer-2-0.onrender.com/v1';

export default function SettingsScreen() {
  const { signOut, user } = useAuth(); // 👈 Grab 'user' to get the token
  const [loading, setLoading] = useState(false);
  const [useGraphView, setUseGraphView] = useState(false);
  
  // 👇 1. Listen for the Strava Redirect
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

  // 👇 2. The Missing Link: Exchange Code WITH Header
  const exchangeStravaCode = async (code: string) => {
    if (!user?.token) return; // Safety check

    setLoading(true);
    try {
      console.log("Exchanging Code:", code);
      const res = await fetch(`${API_BASE}/integrations/strava/exchange`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}` // 👈 THIS WAS MISSING!
        },
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

  // Load Preferences
  useEffect(() => {
    AsyncStorage.getItem('chimera_stats_view_pref').then(val => {
        setUseGraphView(val === 'graph');
    });
  }, []);

  const toggleStatsView = async (value: boolean) => {
      setUseGraphView(value);
      await AsyncStorage.setItem('chimera_stats_view_pref', value ? 'graph' : 'grid');
  };

  const handleConnectStrava = async () => {
    // Safety check: ensure user exists before trying to get the token
    if (!user || !user.token) {
      console.error("No user logged in");
      return;
    }

    const returnUrl = Linking.createURL('redirect');

    try {
      const response = await fetch(
        `${API_BASE}/integrations/strava/auth-url?return_url=${encodeURIComponent(returnUrl)}`,
        {
          method: 'GET',
          headers: {
            // 2. Use user.token here
            'Authorization': `Bearer ${user.token}`, 
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.url) {
        Linking.openURL(data.url);
      } else {
        console.error("Backend error:", data);
        // FAIL: We got a 200 OK, but no URL?
        throw new Error("Backend returned success but no URL found.");
      }

    } catch (error) {
      console.error("Failed to start Strava auth:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Settings</Text>
      </View>

      <View style={styles.content}>
        
        {/* PREFERENCES */}
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

        {/* INTEGRATIONS */}
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

        {/* ACCOUNT */}
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.row} onPress={signOut}>
            <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                <Text style={[styles.rowText, { color: '#FF3B30' }]}>Log Out</Text>
            </View>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  titleText: Typography.header,
  content: { padding: 20 },
  sectionTitle: { fontSize: 13, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 17, color: '#000' },
  helperText: { marginTop: 8, marginLeft: 4, color: '#8E8E93', fontSize: 13 },
});