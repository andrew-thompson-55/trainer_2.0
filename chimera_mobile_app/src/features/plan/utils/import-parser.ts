/**
 * Client-side import parsing: shape detection, field normalization,
 * type inference, phase extraction, and preview generation.
 * Mirrors backend alias/type maps for accurate preview.
 */

// --- Field alias map (matches backend FIELD_ALIASES) ---
const FIELD_ALIASES: Record<string, string> = {
  workout_date: 'date',
  day: 'date',
  scheduled_date: 'date',
  workout_name: 'title',
  name: 'title',
  workout: 'title',
  session: 'title',
  type: 'activity_type',
  sport: 'activity_type',
  discipline: 'activity_type',
  workout_type: 'activity_type',
  minutes: 'duration',
  duration_minutes: 'duration',
  target_duration_minutes: 'duration',
  time: 'duration',
  length: 'duration',
  notes: 'description',
  details: 'description',
  target_notes: 'description',
  instructions: 'description',
  block: 'phase',
  training_block: 'phase',
  mesocycle: 'phase',
  period: 'phase',
  state: 'status',
};

// --- Activity type map (matches backend ACTIVITY_TYPE_MAP) ---
const ACTIVITY_TYPE_MAP: Record<string, string> = {
  run: 'run',
  running: 'run',
  jog: 'run',
  swim: 'swim',
  swimming: 'swim',
  bike: 'bike',
  ride: 'bike',
  cycling: 'bike',
  cycle: 'bike',
  strength: 'strength',
  gym: 'strength',
  weights: 'strength',
  lifting: 'strength',
  rest: 'other',
  travel: 'other',
  race: 'other',
  other: 'other',
};

// --- Title keywords for type inference (matches backend) ---
const TITLE_TYPE_KEYWORDS: [string[], string][] = [
  [['run', 'tempo', 'interval', 'fartlek', 'mile', '5k', '10k', 'half', 'marathon', 'jog', 'strides', 'hill repeat'], 'run'],
  [['swim', 'pool', 'lap', 'freestyle', 'backstroke', 'open water'], 'swim'],
  [['bike', 'ride', 'cycling', 'spin', 'trainer', 'zwift', 'peloton'], 'bike'],
  [['gym', 'strength', 'weights', 'lifting', 'upper body', 'lower body', 'core', 'squat', 'deadlift', 'bench', 'plank', 'yoga', 'stretch', 'mobility', 'pilates'], 'strength'],
];

// --- Types ---

export interface NormalizedEntry {
  date: string;
  title: string;
  activity_type: string;
  duration?: number;
  description?: string;
  phase?: string;
  status?: string;
  distance?: number;
  distance_unit?: string;
  [key: string]: unknown;
}

export interface PhasePreview {
  title: string;
  startDate: string;
  endDate: string;
  count: number;
}

export interface ImportPreview {
  entries: NormalizedEntry[];
  phases: PhasePreview[];
  dateRange: { start: string; end: string } | null;
  workoutCount: number;
  phaseCount: number;
  hasDistances: boolean;
  parseErrors: string[];
}

// --- Helpers ---

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeEntry(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const cleanKey = normalizeKey(key);
    const canonical = FIELD_ALIASES[cleanKey] ?? cleanKey;
    result[canonical] = value;
  }
  return result;
}

function inferTypeFromTitle(title: string): string | null {
  if (!title) return null;
  const lower = title.toLowerCase();
  for (const [keywords, activityType] of TITLE_TYPE_KEYWORDS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return activityType;
    }
  }
  return null;
}

function mapActivityType(rawType: unknown): string {
  if (!rawType || typeof rawType !== 'string') return 'other';
  return ACTIVITY_TYPE_MAP[rawType.trim().toLowerCase()] ?? 'other';
}

function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const v = value.trim();

  // ISO / YYYY-MM-DD
  const isoMatch = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const usMatch = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YY
  const usShortMatch = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (usShortMatch) {
    const [, m, d, yy] = usShortMatch;
    const y = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Month D, YYYY or Month D YYYY
  const namedMatch = v.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (namedMatch) {
    const [, monthStr, d, y] = namedMatch;
    const monthIdx = parseMonthName(monthStr);
    if (monthIdx !== null) {
      return `${y}-${String(monthIdx + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // YYYYMMDD
  const compactMatch = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    const [, y, m, d] = compactMatch;
    return `${y}-${m}-${d}`;
  }

  return null;
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseMonthName(name: string): number | null {
  const lower = name.toLowerCase();
  let idx = MONTHS.indexOf(lower);
  if (idx >= 0) return idx;
  idx = MONTHS_SHORT.indexOf(lower);
  if (idx >= 0) return idx;
  return null;
}

// --- Shape detection ---

function detectShape(raw: unknown): 'A' | 'B' | 'C' | 'single' | 'unknown' {
  if (Array.isArray(raw)) return 'A';
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if ('workouts' in obj) return 'C';
    if ('entries' in obj) return 'B';
    if ('title' in obj || 'name' in obj || 'workout' in obj) return 'single';
  }
  return 'unknown';
}

function extractEntries(raw: unknown): Record<string, unknown>[] {
  const shape = detectShape(raw);
  switch (shape) {
    case 'A':
      return raw as Record<string, unknown>[];
    case 'B':
      return (raw as Record<string, unknown>).entries as Record<string, unknown>[];
    case 'C':
      return (raw as Record<string, unknown>).workouts as Record<string, unknown>[];
    case 'single':
      return [raw as Record<string, unknown>];
    default:
      return [];
  }
}

// --- Main export ---

export function parseImportData(raw: unknown): ImportPreview {
  const errors: string[] = [];

  if (!raw) {
    return { entries: [], phases: [], dateRange: null, workoutCount: 0, phaseCount: 0, hasDistances: false, parseErrors: ['No data provided'] };
  }

  const rawEntries = extractEntries(raw);
  if (!rawEntries || rawEntries.length === 0) {
    return { entries: [], phases: [], dateRange: null, workoutCount: 0, phaseCount: 0, hasDistances: false, parseErrors: ['No entries found in data'] };
  }

  const entries: NormalizedEntry[] = [];
  let hasDistances = false;

  for (let i = 0; i < rawEntries.length; i++) {
    const normalized = normalizeEntry(rawEntries[i]);

    // Parse date
    const dateStr = parseDate(normalized.date);
    if (!dateStr) {
      errors.push(`Row ${i + 1}: missing or unparseable date`);
      continue;
    }

    // Title
    const title = normalized.title as string | undefined;
    if (!title) {
      errors.push(`Row ${i + 1}: missing title`);
      continue;
    }

    // Activity type: explicit > inferred from title > other
    let activityType: string;
    if (normalized.activity_type) {
      activityType = mapActivityType(normalized.activity_type);
    } else {
      activityType = inferTypeFromTitle(title) ?? 'other';
    }

    // Duration
    let duration: number | undefined;
    if (normalized.duration !== undefined && normalized.duration !== null) {
      const d = Number(normalized.duration);
      if (!isNaN(d)) duration = d;
    }

    // Distance check
    if (normalized.distance !== undefined && normalized.distance !== null) {
      hasDistances = true;
    }

    entries.push({
      date: dateStr,
      title,
      activity_type: activityType,
      duration,
      description: normalized.description as string | undefined,
      phase: normalized.phase as string | undefined,
      status: normalized.status as string | undefined,
      distance: normalized.distance as number | undefined,
      distance_unit: normalized.distance_unit as string | undefined,
    });
  }

  // Extract phases
  const phaseGroups = new Map<string, string[]>();
  for (const entry of entries) {
    if (entry.phase) {
      if (!phaseGroups.has(entry.phase)) phaseGroups.set(entry.phase, []);
      phaseGroups.get(entry.phase)!.push(entry.date);
    }
  }

  const phases: PhasePreview[] = [];
  for (const [title, dates] of phaseGroups) {
    const sorted = [...dates].sort();
    phases.push({
      title,
      startDate: sorted[0],
      endDate: sorted[sorted.length - 1],
      count: dates.length,
    });
  }
  phases.sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Date range
  let dateRange: ImportPreview['dateRange'] = null;
  if (entries.length > 0) {
    const allDates = entries.map(e => e.date).sort();
    dateRange = { start: allDates[0], end: allDates[allDates.length - 1] };
  }

  return {
    entries,
    phases,
    dateRange,
    workoutCount: entries.length,
    phaseCount: phases.length,
    hasDistances,
    parseErrors: errors,
  };
}
