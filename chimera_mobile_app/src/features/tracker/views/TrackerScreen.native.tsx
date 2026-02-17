import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { format, addDays, subDays } from 'date-fns';
import Slider from '@react-native-community/slider';
import { api } from '../../../../services/api';
import { Colors, Layout, Typography } from '../../../../theme';

export default function TrackerScreen() {
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true); // 👈 1. Add Loading State

  // Metrics State
  const [metrics, setMetrics] = useState({
    sleep_total: 0, 
    deep_sleep: 0, 
    rem_sleep: 0,
    resources_percent: 0, 
    hrv_score: 0, 
    min_sleep_hr: 0,
    motivation: 0, 
    soreness: 0, 
    stress: 0, 
    body_weight_kg: '', 
  });

  const dateStr = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    let isMounted = true; // 👈 2. Safety flag for "Fast Clicking"

    async function load() {
        setLoading(true); // Start spinner
        try {
            const data = await api.getDailyLog(dateStr);
            
            if (isMounted) { // Only update if we are still on this date
                if (data) {
                    setMetrics({
                        sleep_total: Number(data.sleep_total) || 0,
                        deep_sleep: Number(data.deep_sleep) || 0,
                        rem_sleep: Number(data.rem_sleep) || 0,
                        resources_percent: Number(data.resources_percent) || 0,
                        hrv_score: Number(data.hrv_score) || 0,
                        min_sleep_hr: Number(data.min_sleep_hr) || 0,
                        motivation: Number(data.motivation) || 0,
                        soreness: Number(data.soreness) || 0,
                        stress: Number(data.stress) || 0,
                        body_weight_kg: data.body_weight_kg ? String(data.body_weight_kg) : '',
                    });
                } else {
                    // Defaults
                    setMetrics({
                        sleep_total: 7, deep_sleep: 1, rem_sleep: 1.5,
                        resources_percent: 50, hrv_score: 40, min_sleep_hr: 50,
                        motivation: 5, soreness: 5, stress: 5, 
                        body_weight_kg: ''
                    });
                }
            }
        } finally {
            if (isMounted) setLoading(false); // Stop spinner
        }
    }
    load();
    
    return () => { isMounted = false; }; // Cleanup
  }, [dateStr]);

  const handleSave = async () => {
    const payload: any = { ...metrics };
    if (metrics.body_weight_kg !== '') {
        payload.body_weight_kg = parseFloat(metrics.body_weight_kg);
    } else {
        delete payload.body_weight_kg;
    }
    await api.updateDailyLog(dateStr, payload);
  };

  const updateMetric = (key: string, val: number | string) => {
    setMetrics(prev => ({ ...prev, [key]: val }));
  };

  const formatDuration = (val: number) => {
      const hours = Math.floor(val);
      const minutes = Math.round((val - hours) * 60);
      if (minutes === 0) return `${hours}h`;
      return `${hours}h ${minutes}m`;
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

      {/* 3. SHOW SPINNER OR CONTENT */}
      {loading ? (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
            
            {/* SLEEP SECTION */}
            <Text style={styles.sectionHeader}>Sleep</Text>
            <View style={styles.card}>
                <MetricSlider 
                    label="Total" 
                    val={metrics.sleep_total} 
                    setVal={(v:number) => updateMetric('sleep_total', v)} 
                    min={0} max={12} step={0.25} 
                    formatLabel={formatDuration} 
                />
                <MetricSlider 
                    label="Deep" 
                    val={metrics.deep_sleep} 
                    setVal={(v:number) => updateMetric('deep_sleep', v)} 
                    min={0} max={4} step={0.25} 
                    formatLabel={formatDuration} 
                />
                <MetricSlider 
                    label="REM" 
                    val={metrics.rem_sleep} 
                    setVal={(v:number) => updateMetric('rem_sleep', v)} 
                    min={0} max={4} step={0.25} 
                    formatLabel={formatDuration} 
                />
            </View>

            {/* RECOVERY SECTION */}
            <Text style={styles.sectionHeader}>Recovery</Text>
            <View style={styles.card}>
                <MetricSlider label="Body Battery" val={metrics.resources_percent} setVal={(v:number) => updateMetric('resources_percent', v)} min={0} max={100} step={1} suffix="%" />
                <MetricSlider label="HRV" val={metrics.hrv_score} setVal={(v:number) => updateMetric('hrv_score', v)} min={10} max={150} step={1} suffix="ms" />
                <MetricSlider label="Resting HR" val={metrics.min_sleep_hr} setVal={(v:number) => updateMetric('min_sleep_hr', v)} min={30} max={100} step={1} suffix="bpm" />
            </View>

            {/* SUBJECTIVE SECTION */}
            <Text style={styles.sectionHeader}>Subjective (1-10)</Text>
            <View style={styles.card}>
                <MetricSlider label="Motivation" val={metrics.motivation} setVal={(v:number) => updateMetric('motivation', v)} min={1} max={10} step={1} color={Colors.activity.run} />
                <MetricSlider label="Soreness" val={metrics.soreness} setVal={(v:number) => updateMetric('soreness', v)} min={1} max={10} step={1} color={Colors.activity.strength} />
                <MetricSlider label="Stress" val={metrics.stress} setVal={(v:number) => updateMetric('stress', v)} min={1} max={10} step={1} color={Colors.activity.bike} />
            </View>

            {/* PHYSICAL SECTION */}
            <Text style={styles.sectionHeader}>Physical</Text>
            <View style={styles.card}>
                <View style={styles.inputRow}>
                    <Text style={styles.sliderLabel}>Body Weight</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <TextInput 
                            style={styles.textInput} 
                            value={metrics.body_weight_kg} 
                            onChangeText={v => updateMetric('body_weight_kg', v)} 
                            keyboardType="numeric" 
                            placeholder="--"
                            placeholderTextColor={Colors.iconInactive}
                        />
                        <Text style={styles.unitText}>kg</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save Log</Text>
            </TouchableOpacity>
            
            <View style={{height: 100}}/>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// 🎚️ UPDATED SLIDER COMPONENT
const MetricSlider = ({ label, val, setVal, min, max, step, suffix = '', color = Colors.primary, formatLabel }: any) => {
    const displayValue = formatLabel ? formatLabel(val) : `${val}${suffix}`;

    return (
        <View style={styles.sliderRow}>
            <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>{label}</Text>
                <Text style={[styles.sliderValue, { color }]}>{displayValue}</Text>
            </View>
            <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={min}
                maximumValue={max}
                step={step}
                value={val}
                onValueChange={setVal}
                minimumTrackTintColor={color}
                maximumTrackTintColor={Colors.border}
                thumbTintColor={Platform.OS === 'android' ? color : undefined}
            />
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: Layout.spacing.l, backgroundColor: Colors.header, alignItems: 'center', borderBottomWidth: 1, borderColor: Colors.border },
  dateTitle: Typography.cardTitle,
  arrow: { fontSize: 24, paddingHorizontal: 20, color: Colors.primary },
  
  // Loading State
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  content: { padding: Layout.spacing.m },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 },
  card: { backgroundColor: Colors.card, borderRadius: Layout.borderRadius.m, padding: 16, borderWidth: 1, borderColor: Colors.border },
  
  // Slider Styles
  sliderRow: { marginBottom: 16 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  sliderValue: { fontSize: 15, fontWeight: 'bold' },

  // Input Row
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textInput: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, borderBottomWidth: 1, borderBottomColor: Colors.border, width: 60, textAlign: 'center', padding: 4 },
  unitText: { fontSize: 15, color: Colors.textSecondary, marginLeft: 8 },

  saveButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 100, alignItems: 'center', marginTop: 30 },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
});