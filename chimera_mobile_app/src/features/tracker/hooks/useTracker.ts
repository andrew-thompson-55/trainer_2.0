// useTracker - Business logic for daily metrics tracking
// Extracted from app/(tabs)/tracker.tsx

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, subDays } from 'date-fns';
import { api } from '../../../../services/api';
import type { DailyLog, WeightUnit } from '@domain/types';

const KG_TO_LBS = 2.20462;
const toDisplayWeight = (kg: number, unit: WeightUnit) =>
  unit === 'lbs' ? String(Math.round(kg * KG_TO_LBS * 10) / 10) : String(kg);
const toStorageKg = (val: string, unit: WeightUnit) => {
  const n = parseFloat(val);
  return unit === 'lbs' ? Math.round((n / KG_TO_LBS) * 100) / 100 : n;
};

interface TrackerMetrics {
  sleep_total: number;
  deep_sleep: number;
  rem_sleep: number;
  resources_percent: number;
  hrv_score: number;
  min_sleep_hr: number;
  motivation: number;
  soreness: number;
  stress: number;
  body_weight_kg: string;
}

interface UseTrackerReturn {
  date: Date;
  dateStr: string;
  metrics: TrackerMetrics;
  loading: boolean;
  weightUnit: WeightUnit;
  setDate: (date: Date) => void;
  updateMetric: (key: keyof TrackerMetrics, value: number | string) => void;
  handleSave: () => Promise<void>;
  navigateDay: (direction: -1 | 1) => void;
}

export function useTracker(): UseTrackerReturn {
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [metrics, setMetrics] = useState<TrackerMetrics>({
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
    AsyncStorage.getItem('chimera_weight_unit').then(val => {
      if (val === 'kg' || val === 'lbs') setWeightUnit(val as WeightUnit);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await api.getDailyLog(dateStr);

        if (isMounted) {
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
              body_weight_kg: data.body_weight_kg ? toDisplayWeight(data.body_weight_kg, weightUnit) : '',
            });
          } else {
            // Defaults
            setMetrics({
              sleep_total: 7,
              deep_sleep: 1,
              rem_sleep: 1.5,
              resources_percent: 50,
              hrv_score: 40,
              min_sleep_hr: 50,
              motivation: 5,
              soreness: 5,
              stress: 5,
              body_weight_kg: '',
            });
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [dateStr, weightUnit]);

  const handleSave = useCallback(async () => {
    const payload: any = { ...metrics };
    if (metrics.body_weight_kg !== '') {
      payload.body_weight_kg = toStorageKg(metrics.body_weight_kg, weightUnit);
    } else {
      delete payload.body_weight_kg;
    }
    await api.updateDailyLog(dateStr, payload);
  }, [dateStr, metrics, weightUnit]);

  const updateMetric = useCallback((key: keyof TrackerMetrics, val: number | string) => {
    setMetrics(prev => ({ ...prev, [key]: val }));
  }, []);

  const navigateDay = useCallback((direction: -1 | 1) => {
    setDate(prev => (direction === 1 ? addDays(prev, 1) : subDays(prev, 1)));
  }, []);

  return {
    date,
    dateStr,
    metrics,
    loading,
    weightUnit,
    setDate,
    updateMetric,
    handleSave,
    navigateDay,
  };
}
