export function metersToMiles(m: number): number {
  return m / 1609.34;
}

export function metersToKm(m: number): number {
  return m / 1000;
}

export function metersToFeet(m: number): number {
  return m * 3.28084;
}

export function formatDistance(meters: number, unit: 'mi' | 'km'): string {
  const val = unit === 'mi' ? metersToMiles(meters) : metersToKm(meters);
  return val.toFixed(1);
}

export function formatVert(meters: number, unit: 'mi' | 'km'): string {
  const val = unit === 'mi' ? metersToFeet(meters) : meters;
  return Math.round(val).toLocaleString();
}

export function vertUnit(unit: 'mi' | 'km'): string {
  return unit === 'mi' ? 'ft' : 'm';
}

export function distUnit(unit: 'mi' | 'km'): string {
  return unit;
}

export function secondsToPace(seconds: number, meters: number, unit: 'mi' | 'km'): string {
  if (!meters || !seconds) return '--:--';
  const dist = unit === 'mi' ? metersToMiles(meters) : metersToKm(meters);
  const paceSeconds = seconds / dist;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function secondsToHours(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function delta(current: number, previous: number): { pct: number; sign: '+' | '-' | '' } {
  if (!previous) return { pct: 0, sign: '' };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), sign: pct > 0 ? '+' : pct < 0 ? '-' : '' };
}
