import React, { useEffect, useState } from 'react';
import { authFetch } from '@infra/fetch/auth-fetch';
import { getDashboard } from '@domain/api/dashboard';
import type { DashboardData } from '@domain/types/dashboard';
import { COLORS, FONT, RADIUS } from './styles';
import { Header } from './components/Header';
import { MetricCard, buildMetricCards } from './components/MetricCard';
import { VolumeCharts } from './components/VolumeCharts';
import { WeekSummary } from './components/WeekSummary';
import { RecentActivities } from './components/RecentActivities';
import { TodayCheckin } from './components/TodayCheckin';
import { UpcomingWorkouts } from './components/UpcomingWorkouts';

export function WebDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDashboard(authFetch)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.error}>Failed to load dashboard: {error}</div>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <Header race={null} />
          <div style={styles.skeletonRow}>
            {[1, 2, 3, 4].map(i => <div key={i} style={styles.skeleton} />)}
          </div>
          <div style={styles.skeletonRow}>
            <div style={{ ...styles.skeleton, height: 220, flex: 1 }} />
            <div style={{ ...styles.skeleton, height: 220, flex: 1 }} />
          </div>
          <div style={{ ...styles.skeleton, height: 300 }} />
        </div>
      </div>
    );
  }

  const unit = data.settings.distance_unit;
  const metricCards = buildMetricCards(data.weekly_metrics, unit);

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <Header race={data.race} />

        {/* Metric cards row */}
        <div style={styles.metricRow}>
          {metricCards.map((mc) => (
            <MetricCard key={mc.label} {...mc} />
          ))}
        </div>

        {/* Week summary */}
        <div style={styles.section}>
          <WeekSummary
            runs={data.week_summary.runs}
            miles={data.week_summary.miles}
            vertFt={data.week_summary.vert_ft}
            distanceUnit={unit}
          />
        </div>

        {/* Volume charts */}
        <div style={styles.section}>
          <VolumeCharts metrics={data.weekly_metrics} distanceUnit={unit} />
        </div>

        {/* Bottom grid: activities + sidebar */}
        <div className="dash-bottom-grid" style={styles.bottomGrid}>
          <div style={styles.mainCol}>
            <RecentActivities activities={data.recent_activities} distanceUnit={unit} />
          </div>
          <div style={styles.sideCol}>
            <TodayCheckin checkin={data.today.checkin} streak={data.today.streak} />
            <UpcomingWorkouts workouts={data.upcoming_workouts} />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: COLORS.bg,
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 24px',
    boxSizing: 'border-box',
  },
  shell: {
    width: '100%',
    maxWidth: 1200,
  },
  metricRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  section: {
    marginBottom: 24,
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: 24,
  },
  mainCol: {
    minWidth: 0,
  },
  sideCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  error: {
    fontFamily: FONT.mono,
    fontSize: 14,
    color: COLORS.red,
    textAlign: 'center',
    padding: '60px 0',
  },
  skeletonRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
  },
  skeleton: {
    flex: 1,
    height: 120,
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.md,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};
