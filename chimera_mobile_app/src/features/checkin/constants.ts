import { pkg } from '@infra/package';

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

const checkinColors = pkg.colors.checkin;
const { metrics, rpeOptions, scaleColorKeys, rpeScaleColorKeys } = pkg.checkin;

const SCALE_COLORS = scaleColorKeys.map(
  (key: string) => checkinColors[key as keyof typeof checkinColors]
);

const RPE_SCALE_COLORS = rpeScaleColorKeys.map(
  (key: string) => checkinColors[key as keyof typeof checkinColors]
);

export const METRICS: MetricConfig[] = metrics.map((metric: any) => ({
  key: metric.key,
  question: metric.question,
  options: metric.options.map((opt: any, i: number) => ({
    ...opt,
    color: SCALE_COLORS[i],
  })),
}));

export const RPE_OPTIONS: MetricOption[] = rpeOptions.map((opt: any, i: number) => ({
  ...opt,
  color: RPE_SCALE_COLORS[i],
}));
