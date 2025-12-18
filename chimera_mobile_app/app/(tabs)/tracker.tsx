import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { format, addDays, subDays } from 'date-fns';
import { api } from '../../services/api';
import { Colors, Layout, Typography } from '../../theme'; // 👈 Theme

export default function TrackerScreen() {
  const [date, setDate] = useState(new Date());
  
  // Metrics State
  const [metrics, setMetrics] = useState({
    sleep_total: '', deep_sleep: '', rem_sleep: '',
    resources_percent: '', hrv_score: '', min_sleep_hr: '',
    motivation: '', soreness: '', stress: '', body_weight_kg: '',
  });

  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    async function load() {
        const data = await api.getDailyLog(dateStr);
        if (data) {
            const newMetrics: any = {};
            Object.keys(metrics).forEach(key => {
                // @ts-ignore
                newMetrics[key] = data[key] ? String(data[key]) : '';
            });
            setMetrics(newMetrics);
        } else {
            // Reset if no data found for this day
            setMetrics({
                sleep_total: '', deep_sleep: '', rem_sleep: '',
                resources_percent: '', hrv_score: '', min_sleep_hr: '',
                motivation: '', soreness: '', stress: '', body_weight_kg: ''
            });
        }
    }
    load();
  }, [dateStr]);

  const handleSave = async () => {
    // Convert to numbers
    const payload: any = {};
    Object.keys(metrics).forEach((key) => {
        // @ts-ignore
        const val = metrics[key];
        if (val !== '') payload[key] = parseFloat(val);
    });

    // 🚀 Just fire and forget. API handles queue/offline.
    await api.updateDailyLog(dateStr, payload);
    
    // Optional: Tiny feedback if you want, or just nothing.
    // Alert.alert("Saved"); <--- Removed to be seamless
  };

  const updateMetric = (key: string, val: string) => {
    setMetrics(prev => ({ ...prev, [key]: val }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDate(subDays(date, 1))}>
            <Text style={styles.arrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.dateTitle}>{format(date, 'EEEE, MMM do')}</Text>
        <TouchableOpacity onPress={() => setDate(addDays(date, 1))}>
            <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        
        <Text style={styles.sectionHeader}>Sleep (Hours)</Text>
        <View style={styles.row}>
            <InputBox label="Total" val={metrics.sleep_total} setVal={(v:string) => updateMetric('sleep_total', v)} />
            <InputBox label="Deep" val={metrics.deep_sleep} setVal={(v:string) => updateMetric('deep_sleep', v)} />
            <InputBox label="REM" val={metrics.rem_sleep} setVal={(v:string) => updateMetric('rem_sleep', v)} />
        </View>

        <Text style={styles.sectionHeader}>Recovery</Text>
        <View style={styles.row}>
            <InputBox label="Body Batt %" val={metrics.resources_percent} setVal={(v:string) => updateMetric('resources_percent', v)} />
            <InputBox label="HRV (ms)" val={metrics.hrv_score} setVal={(v:string) => updateMetric('hrv_score', v)} />
            <InputBox label="Min Sleep HR" val={metrics.min_sleep_hr} setVal={(v:string) => updateMetric('min_sleep_hr', v)} />
        </View>

        <Text style={styles.sectionHeader}>Subjective (1-10)</Text>
        <View style={styles.row}>
            <InputBox label="Motivation" val={metrics.motivation} setVal={(v:string) => updateMetric('motivation', v)} />
            <InputBox label="Soreness" val={metrics.soreness} setVal={(v:string) => updateMetric('soreness', v)} />
            <InputBox label="Stress" val={metrics.stress} setVal={(v:string) => updateMetric('stress', v)} />
        </View>

        <Text style={styles.sectionHeader}>Physical</Text>
        <View style={styles.row}>
             <InputBox label="Weight (kg)" val={metrics.body_weight_kg} setVal={(v:string) => updateMetric('body_weight_kg', v)} width="30%" />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save Log</Text>
        </TouchableOpacity>
        
        <View style={{height: 100}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

const InputBox = ({ label, val, setVal, width = '30%' }: any) => (
    <View style={[styles.inputContainer, { width }]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput 
            style={styles.input} 
            value={val} 
            onChangeText={setVal} 
            keyboardType="numeric"
            placeholder="-"
            placeholderTextColor={Colors.iconInactive}
        />
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: Layout.spacing.l, backgroundColor: Colors.header, alignItems: 'center', borderBottomWidth: 1, borderColor: Colors.border },
  dateTitle: Typography.cardTitle,
  arrow: { fontSize: 24, paddingHorizontal: 20, color: Colors.primary },
  
  content: { padding: Layout.spacing.m },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  
  inputContainer: { backgroundColor: Colors.card, borderRadius: Layout.borderRadius.m, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  label: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  input: { fontSize: 18, fontWeight: 'bold', width: '100%', textAlign: 'center', padding: 4, color: Colors.textPrimary },
  
  saveButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 100, alignItems: 'center', marginTop: 30 },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
});