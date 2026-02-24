import { Colors } from '../../../theme';

export interface MetricOption {
  value: number;
  emoji: string;
  label: string;
  color: string;
}

export interface MetricConfig {
  key: string;
  question: string;
  options: MetricOption[];
}

const SCALE_COLORS = [
  Colors.checkin.worst,
  Colors.checkin.low,
  Colors.checkin.mid,
  Colors.checkin.good,
  Colors.checkin.best,
];

export const METRICS: MetricConfig[] = [
  {
    key: 'readiness',
    question: 'How ready do you feel to train?',
    options: [
      { value: 1, emoji: '😫', label: 'Wiped', color: SCALE_COLORS[0] },
      { value: 2, emoji: '😕', label: 'Low', color: SCALE_COLORS[1] },
      { value: 3, emoji: '😐', label: 'OK', color: SCALE_COLORS[2] },
      { value: 4, emoji: '😊', label: 'Good', color: SCALE_COLORS[3] },
      { value: 5, emoji: '🔥', label: 'Ready', color: SCALE_COLORS[4] },
    ],
  },
  {
    key: 'soreness',
    question: 'How sore are you?',
    options: [
      { value: 1, emoji: '😭', label: 'Wrecked', color: SCALE_COLORS[0] },
      { value: 2, emoji: '😣', label: 'Sore', color: SCALE_COLORS[1] },
      { value: 3, emoji: '😐', label: 'Mild', color: SCALE_COLORS[2] },
      { value: 4, emoji: '😌', label: 'Light', color: SCALE_COLORS[3] },
      { value: 5, emoji: '💪', label: 'Fresh', color: SCALE_COLORS[4] },
    ],
  },
  {
    key: 'energy',
    question: 'How is your energy level?',
    options: [
      { value: 1, emoji: '🪫', label: 'Empty', color: SCALE_COLORS[0] },
      { value: 2, emoji: '😴', label: 'Tired', color: SCALE_COLORS[1] },
      { value: 3, emoji: '😐', label: 'OK', color: SCALE_COLORS[2] },
      { value: 4, emoji: '⚡', label: 'Good', color: SCALE_COLORS[3] },
      { value: 5, emoji: '🚀', label: 'Wired', color: SCALE_COLORS[4] },
    ],
  },
  {
    key: 'mood',
    question: 'How is your mood?',
    options: [
      { value: 1, emoji: '😢', label: 'Bad', color: SCALE_COLORS[0] },
      { value: 2, emoji: '😟', label: 'Meh', color: SCALE_COLORS[1] },
      { value: 3, emoji: '😐', label: 'OK', color: SCALE_COLORS[2] },
      { value: 4, emoji: '😄', label: 'Good', color: SCALE_COLORS[3] },
      { value: 5, emoji: '🤩', label: 'Great', color: SCALE_COLORS[4] },
    ],
  },
];

export const RPE_OPTIONS: MetricOption[] = [
  { value: 1, emoji: '😴', label: 'Easy', color: SCALE_COLORS[4] },
  { value: 2, emoji: '😊', label: 'Light', color: SCALE_COLORS[3] },
  { value: 3, emoji: '😤', label: 'Moderate', color: SCALE_COLORS[2] },
  { value: 4, emoji: '🥵', label: 'Hard', color: SCALE_COLORS[1] },
  { value: 5, emoji: '💀', label: 'Max', color: SCALE_COLORS[0] },
];
