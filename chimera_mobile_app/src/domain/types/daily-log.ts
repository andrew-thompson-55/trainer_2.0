// Daily Log types - Mirror backend schemas.py

export interface DailyLog {
  id?: string;
  user_id?: string;
  date: string;              // YYYY-MM-DD
  sleep_total?: number;
  deep_sleep?: number;
  rem_sleep?: number;
  resources_percent?: number;
  hrv_score?: number;
  min_sleep_hr?: number;
  motivation?: number;       // 1-10
  soreness?: number;         // 1-10
  stress?: number;           // 1-10
  body_weight_kg?: number;
}

export type DailyLogCreate = Omit<DailyLog, 'id' | 'user_id'>;
