import React, { useState } from 'react';
import { COLORS, FONT, RADIUS, getActivityColor } from '../styles';
import { formatDistance, secondsToPace, formatVert, vertUnit, formatDate } from '../utils';
import type { RecentActivity } from '@domain/types/dashboard';

interface RecentActivitiesProps {
  activities: RecentActivity[];
  distanceUnit: 'mi' | 'km';
}

export function RecentActivities({ activities, distanceUnit }: RecentActivitiesProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!activities.length) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Recent Activities</div>
        <div style={styles.empty}>No recent activities</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Recent Activities</div>
      <div style={styles.list}>
        {activities.map((a, i) => (
          <div
            key={a.id}
            style={{
              ...styles.row,
              backgroundColor: hoveredIdx === i ? COLORS.surfaceHover : 'transparent',
              opacity: a.stats_included === false ? 0.5 : 1,
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div
              style={{
                ...styles.typeBar,
                backgroundColor: getActivityColor(a.activity_type),
              }}
            />
            <div style={styles.info}>
              <div style={styles.actName}>{a.name}</div>
              <div style={styles.actDate}>
                {formatDate(a.start_time)}
                {a.stats_included === false && (
                  <span style={styles.excludedLabel}> — Excluded from stats</span>
                )}
              </div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statValue}>{formatDistance(a.distance_meters, distanceUnit)}</div>
              <div style={styles.statLabel}>{distanceUnit}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statValue}>
                {secondsToPace(a.moving_time_seconds, a.distance_meters, distanceUnit)}
              </div>
              <div style={styles.statLabel}>/{distanceUnit}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statValue}>{formatVert(a.total_elevation_gain, distanceUnit)}</div>
              <div style={styles.statLabel}>{vertUnit(distanceUnit)}</div>
            </div>
            {a.average_heartrate && (
              <div style={styles.stat}>
                <div style={styles.statValue}>{Math.round(a.average_heartrate)}</div>
                <div style={styles.statLabel}>bpm</div>
              </div>
            )}
            <div style={styles.rpe}>
              {a.session_rpe !== null && a.session_rpe !== undefined ? (
                <div style={{
                  ...styles.rpeDot,
                  backgroundColor: rpeColor(a.session_rpe),
                }} title={`RPE ${a.session_rpe}`}>
                  {a.session_rpe}
                </div>
              ) : (
                <div style={styles.rpeDot} title="No RPE">--</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function rpeColor(rpe: number): string {
  if (rpe <= 2) return COLORS.green;
  if (rpe <= 3) return COLORS.accent;
  if (rpe <= 4) return COLORS.orange;
  return COLORS.red;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.md,
    padding: 20,
  },
  title: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 12px',
    borderRadius: 6,
    transition: 'background-color 0.1s',
    cursor: 'default',
  },
  typeBar: {
    width: 3,
    height: 32,
    borderRadius: 2,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  actName: {
    fontFamily: FONT.mono,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actDate: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 2,
  },
  excludedLabel: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  stat: {
    textAlign: 'right' as const,
    minWidth: 56,
  },
  statValue: {
    fontFamily: FONT.mono,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text,
  },
  statLabel: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: COLORS.textDim,
  },
  rpe: {
    width: 32,
    display: 'flex',
    justifyContent: 'center',
  },
  rpeDot: {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.bg,
    width: 24,
    height: 24,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.border,
  },
  empty: {
    fontFamily: FONT.mono,
    fontSize: 13,
    color: COLORS.textDim,
    padding: '20px 0',
    textAlign: 'center',
  },
};
