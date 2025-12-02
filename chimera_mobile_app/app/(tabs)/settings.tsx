import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

// !!! YOUR RENDER URL !!!
const API_BASE = 'https://trainer-2-0.onrender.com/v1';
// !!! YOUR STRAVA CLIENT ID !!!
const STRAVA_CLIENT_ID = '176319'; 

export default function SettingsScreen() {
  const [loading, setLoading] = useState(false);

  const handleConnectStrava = async () => {
    setLoading(true);
    try {
      // 1. Define the Redirect URL (chimera://redirect)
      const redirectUrl = Linking.createURL('redirect');
      
      // 2. Open Strava Auth Page
      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${redirectUrl}&approval_prompt=force&scope=read,activity:read_all`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      // 3. Handle the Result
      if (result.type === 'success' && result.url) {
        // Extract the 'code' from the URL
        const params = new URL(result.url).searchParams;
        const code = params.get('code');

        if (code) {
            // 4. Send code to Backend
            await sendCodeToBackend(code);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to connect to Strava.");
    } finally {
      setLoading(false);
    }
  };

  const sendCodeToBackend = async (code: string) => {
    try {
        const response = await fetch(`${API_BASE}/integrations/strava/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        
        if (response.ok) {
            Alert.alert("Success", "Strava Connected!");
        } else {
            throw new Error("Backend failed");
        }
    } catch (e) {
        Alert.alert("Error", "Backend exchange failed.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleText}>Settings</Text>
      </View>

      <View style={styles.content}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  titleText: { fontSize: 34, fontWeight: 'bold', color: '#000' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 13, color: '#8E8E93', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 17, color: '#000' },
  helperText: { marginTop: 8, marginLeft: 4, color: '#8E8E93', fontSize: 13 },
});