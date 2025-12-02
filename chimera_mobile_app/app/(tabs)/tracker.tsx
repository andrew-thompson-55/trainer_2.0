import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { format, addDays, subDays } from 'date-fns';
import { api } from '../../services/api';

export default function TrackerScreen() {
  const [date, setDate] = useState(new Date());
  
  // Metrics State
  const [metrics, setMetrics] = useState({
    sleep_total: '',
    deep_sleep: '',
    rem_sleep: '',
    resources_percent: '',
    hrv_score: '',
    min_sleep_hr: '',
    motivation: '',
    soreness: '',
    stress: '',
    body_weight_kg: '',
  });

  const dateStr = format(date, 'yyyy-MM-dd');

  // Load data when date changes
  useEffect(() => {
    async function load() {
        const data = await api.getDailyLog(dateStr);
        if (data) {
            // Convert numbers to strings for inputs
            const newMetrics: any = {};
            Object.keys(metrics).forEach(key => {
                newMetrics[key] = data[key] ? String(data[key]) : '';
            });
            setMetrics(newMetrics);
        } else {
            // Reset if no data
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
    // Convert non-empty strings back to numbers
    const payload: any = {};
    Object.keys(metrics).forEach((key: string) => {
        // @ts-ignore
        const val = metrics[key];
        if (val !== '') payload[key] = parseFloat(val);
    });

    try {
        await api.updateDailyLog(dateStr, payload);
        Alert.alert("Saved", "Daily metrics updated.");
    } catch (e) {
        Alert.alert("Error", "Failed to save.");
    }
  };

  const updateMetric = (key: string, val: string) => {
    setMetrics(prev => ({ ...prev, [key]: val }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Date Header */}
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
            <InputBox label="Total" val={metrics.sleep_total} setVal={v => updateMetric('sleep_total', v)} />
            <InputBox label="Deep" val={metrics.deep_sleep} setVal={v => updateMetric('deep_sleep', v)} />
            <InputBox label="REM" val={metrics.rem_sleep} setVal={v => updateMetric('rem_sleep', v)} />
        </View>

        <Text style={styles.sectionHeader}>Recovery</Text>
        <View style={styles.row}>
            <InputBox label="Body Batt %" val={metrics.resources_percent} setVal={v => updateMetric('resources_percent', v)} />
            <InputBox label="HRV (ms)" val={metrics.hrv_score} setVal={v => updateMetric('hrv_score', v)} />
            <InputBox label="Min Sleep HR" val={metrics.min_sleep_hr} setVal={v => updateMetric('min_sleep_hr', v)} 
            />
        </View>

        <Text style={styles.sectionHeader}>Subjective (1-10)</Text>
        <View style={styles.row}>
            <InputBox label="Motivation" val={metrics.motivation} setVal={v => updateMetric('motivation', v)} />
            <InputBox label="Soreness" val={metrics.soreness} setVal={v => updateMetric('soreness', v)} />
            <InputBox label="Stress" val={metrics.stress} setVal={v => updateMetric('stress', v)} />
        </View>

        <Text style={styles.sectionHeader}>Physical</Text>
        <InputBox label="Weight (kg)" val={metrics.body_weight_kg} setVal={v => updateMetric('body_weight_kg', v)} width="30%" />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save Log</Text>
        </TouchableOpacity>
        
        <View style={{height: 50}}/>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Component for inputs
const InputBox = ({ label, val, setVal, width = '30%' }: any) => (
    <View style={[styles.inputContainer, { width }]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput 
            style={styles.input} 
            value={val} 
            onChangeText={setVal} 
            keyboardType="numeric"
            placeholder="-"
        />
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', alignItems: 'center' },
  dateTitle: { fontSize: 18, fontWeight: 'bold' },
  arrow: { fontSize: 24, paddingHorizontal: 20, color: '#007AFF' },
  content: { padding: 16 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#8E8E93', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  inputContainer: { backgroundColor: '#FFF', borderRadius: 10, padding: 10, alignItems: 'center' },
  label: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  input: { fontSize: 18, fontWeight: 'bold', width: '100%', textAlign: 'center', padding: 4 },
  saveButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  saveText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});