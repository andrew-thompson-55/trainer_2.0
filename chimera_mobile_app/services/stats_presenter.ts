export interface StatItem {
  id: string;
  label: string;
  value: string;
  unit?: string; // Optional (e.g., "bpm")
}

// Helper: Format Seconds to "1h 30m" or "45m 12s"
const formatDuration = (seconds: number) => {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
};

// Helper: Meters to Miles
const formatDistance = (meters: number) => {
  if (!meters) return '--';
  const miles = meters * 0.000621371;
  return `${miles.toFixed(2)} mi`;
};

// 🧠 THE MAIN FUNCTION
// You pass in the raw Strava data, this returns exactly what should be displayed.
export const getActivityStats = (activity: any): StatItem[] => {
  if (!activity) return [];

  const stats: StatItem[] = [
    {
      id: 'distance',
      label: 'Distance',
      value: formatDistance(activity.distance_meters),
    },
    {
      id: 'duration',
      label: 'Duration',
      value: formatDuration(activity.moving_time_seconds),
    },
  ];

  // Conditional Logic: Only show HR if it exists
  if (activity.average_heartrate) {
    stats.push({
      id: 'hr',
      label: 'Avg Heart Rate',
      value: Math.round(activity.average_heartrate).toString(),
      unit: 'bpm'
    });
  }

  // Always show source at the end
  stats.push({
    id: 'source',
    label: 'Source',
    value: activity.source_type ? activity.source_type.toUpperCase() : 'MANUAL',
  });

  return stats;
};