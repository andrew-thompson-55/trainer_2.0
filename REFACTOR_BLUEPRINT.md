# Chimera Refactor Blueprint: Concept-First Architecture

**Version:** 1.1
**Date:** 2026-02-16
**Status:** Draft for Review
**Supersedes:** `plans/refactor_plan.md` (Operation Stabilize — fully executed, can be archived)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Target Architecture](#3-target-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Platform Splitting Protocol](#5-platform-splitting-protocol)
6. [Shared Domain Layer](#6-shared-domain-layer)
7. [Feature Specifications](#7-feature-specifications)
8. [State Management & Sync](#8-state-management--sync)
9. [Migration Plan](#9-migration-plan)
10. [File Migration Map](#10-file-migration-map)
11. [Testing & Verification](#11-testing--verification)
12. [Rollback Strategy](#12-rollback-strategy)
13. [Deferred Items](#13-deferred-items)

---

## 0. Prior Work: Operation Stabilize (Complete)

The previous refactor plan (`plans/refactor_plan.md`) addressed security and auth foundations. All items have been verified as complete:

- **Gitignore hardening** — `.env`, `__pycache__/`, `google-services.json` all ignored
- **Silent failure elimination** — No `except: pass` patterns remain in backend
- **Profile update Pydantic validation** — `ProfileUpdate` schema enforces field whitelist
- **Auth dependency injection** — `dependencies.py` provides `get_current_user()`, all endpoints use `Depends()`
- **Hardcoded user IDs removed** — `hard_coded_values.py` deleted, zero references
- **Authenticated API client** — `authFetch.web.ts` / `authFetch.native.ts` + centralized `config.ts`

**Operational reminder (from old plan):** The Firebase API key `AIzaSyAPo...` is in git history permanently. Even though `google-services.json` is now gitignored, the key in Firebase Console **must** be restricted by Android package name + SHA-1 fingerprint. Verify this has been done.

---

## 1. Executive Summary

### The Problem

The current `chimera_mobile_app/` has a flat Expo Router `app/` directory where screens contain business logic, API calls, state management, and UI rendering in single files. Platform divergence is handled ad-hoc (`.web.ts` / `.native.ts` for services only). There is no separation between **what the app does** (domain) and **how it looks** (platform view).

### The Solution

Adopt a **Concept-First** architecture:

```
Feature (concept) → Domain (shared logic) → Platform View (native OR web)
```

Each feature owns its domain logic (types, hooks, API calls) in platform-agnostic code. The **view layer** is the only thing that diverges per platform. Web and mobile share the same data pipeline but render completely different UIs optimized for their context.

### Platform Philosophy

| Platform | Role | Metaphor |
|----------|------|----------|
| **Web** | Strategic Command Center | The coach's desk — plan blocks, drag weeks, analyze volume trends, see the full picture |
| **Mobile** | Tactical Field Terminal | The athlete's wrist — today's workout, log how you feel, talk to your coach |

---

## 2. Current State Analysis

### Type Inventory (Scanned 2026-02-16)

**Current frontend type definitions:**
- `StatItem` - services/stats_presenter.ts (presentation layer)
- `QueueItem` - services/offline_queue.ts (infrastructure)
- `User`, `AuthContextType` - context/AuthContext.*.tsx (duplicated across .web/.native)
- `WorkoutFormProps` - components/WorkoutForm.tsx (component-specific)

**Types used as `any` throughout:**
- Workout data (activity_type, status, timestamps) - used in api.ts, screens, everywhere
- DailyLog data (sleep metrics, HRV, motivation) - used in tracker, api.ts
- Strava activities - used in workout_details, calendar
- Chat messages - used in chat screen

**Canonical source:** Backend `chimera_api/schemas.py` Pydantic models define the data contracts. Frontend types will mirror these exactly.

### What Exists (chimera_mobile_app/)

```
app/                          # Flat routing — screens own everything
├── (auth)/login.tsx          # Auth UI + logic mixed
├── (tabs)/
│   ├── index.tsx             # Dashboard (67 LOC)
│   ├── itinerary.tsx         # Training plan (266 LOC) ← heaviest screen
│   ├── calendar.tsx          # Calendar view (188 LOC)
│   ├── chat.tsx              # AI coach (100 LOC)
│   ├── tracker.tsx           # Daily metrics (232 LOC)
│   └── settings.tsx          # User prefs (218 LOC)
├── add_workout.tsx           # Modal wrapper
├── edit_workout.tsx          # Modal wrapper
├── workout_details.tsx       # Detail view (212 LOC)
└── redirect.tsx              # Strava OAuth callback

services/                     # Already platform-split (good)
├── config.ts                 # Shared
├── authFetch.web.ts          # Web auth fetch
├── authFetch.native.ts       # Native auth fetch
├── api.web.ts                # Web API client (361 LOC)
├── api.native.ts             # Native API client (358 LOC)
├── offline_queue.ts          # Native-only concept
└── stats_presenter.ts        # Pure transform

context/                      # Platform-split auth
├── AuthContext.web.tsx
└── AuthContext.native.tsx

components/                   # Shared UI (mostly mobile-oriented)
├── WorkoutForm.tsx
├── stats-grid.tsx
├── stats-graphs.tsx
└── ...boilerplate
```

### What's Wrong

1. **Screens own business logic.** `itinerary.tsx` (266 LOC) fetches data, manages cache, handles pull-to-refresh, processes offline queue, toggles workout status, AND renders the UI.
2. **Duplicated API clients.** `api.web.ts` and `api.native.ts` are 98% identical — only network detection differs. 719 LOC that should be ~380.
3. **No feature boundaries.** Workout CRUD, daily logging, Strava, and calendar are all interleaved in the same flat directory.
4. **Components are mobile-only.** `WorkoutForm.tsx` uses React Native primitives — cannot render on web.
5. **No shared types.** Frontend has no TypeScript interfaces mirroring the backend Pydantic schemas.
6. **Web is an afterthought.** The web "experience" is just the mobile app rendered in a browser.

---

## 3. Target Architecture

### Layer Model

```
┌─────────────────────────────────────────────────────┐
│                    app/ (Routes)                     │  ← Expo Router: URL → Screen
│         Thin shells that compose feature views       │
├─────────────────────────────────────────────────────┤
│              src/features/*/views/                   │  ← Platform Views
│     .native.tsx  │  .web.tsx  │  shared .tsx         │     (React components)
├─────────────────────────────────────────────────────┤
│              src/features/*/hooks/                   │  ← Feature Hooks
│         useWorkouts(), useDailyLog(), etc.           │     (Business logic)
├─────────────────────────────────────────────────────┤
│                  src/domain/                         │  ← Shared Domain
│          types/ │ api/ │ hooks/ │ utils/             │     (Platform-agnostic)
├─────────────────────────────────────────────────────┤
│                src/infrastructure/                   │  ← Platform Services
│       auth/ │ network/ │ storage/ │ offline/         │     (.web / .native)
└─────────────────────────────────────────────────────┘
```

### Key Principles

1. **Domain is platform-agnostic.** Types, API calls, and business-logic hooks never import from `react-native` or browser APIs.
2. **Infrastructure abstracts platform.** Storage, network detection, and auth are behind interfaces with `.web` / `.native` implementations.
3. **Features compose domain + infrastructure.** Each feature folder owns its views and wires domain hooks to platform UI.
4. **Routes are thin.** `app/` files are 5-15 lines — import a view, render it, done.
5. **Web and mobile are peers.** Neither is primary. Each gets purpose-built views.

---

## 4. Directory Structure

### Complete Target Tree

```
chimera_mobile_app/
├── app/                                    # ROUTES ONLY (thin shells)
│   ├── _layout.tsx                         # Root layout (AuthProvider, theme)
│   ├── index.tsx                           # Splash → redirect
│   ├── redirect.tsx                        # Strava OAuth callback
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx                       # <LoginScreen />
│   ├── (tabs)/
│   │   ├── _layout.tsx                     # Tab bar config
│   │   ├── index.tsx                       # <DashboardScreen />
│   │   ├── plan.tsx                        # <PlanScreen />      (was itinerary)
│   │   ├── calendar.tsx                    # <CalendarScreen />
│   │   ├── coach.tsx                       # <CoachScreen />     (was chat)
│   │   ├── tracker.tsx                     # <TrackerScreen />
│   │   └── settings.tsx                    # <SettingsScreen />
│   ├── workout/
│   │   ├── [id].tsx                        # <WorkoutDetailScreen />
│   │   ├── new.tsx                         # <WorkoutNewScreen />
│   │   └── edit/[id].tsx                   # <WorkoutEditScreen />
│
├── src/
│   ├── domain/                             # SHARED DOMAIN (platform-agnostic)
│   │   ├── types/
│   │   │   ├── workout.ts                  # Workout, WorkoutCreate, WorkoutUpdate, WorkoutStatus, ActivityType
│   │   │   ├── daily-log.ts                # DailyLog, DailyLogCreate
│   │   │   ├── chat.ts                     # ChatMessage, ChatRequest, ChatResponse
│   │   │   ├── strava.ts                   # StravaActivity, StatItem
│   │   │   ├── user.ts                     # User, ProfileUpdate
│   │   │   └── index.ts                    # Re-export all
│   │   │
│   │   ├── api/
│   │   │   ├── client.ts                   # createApiClient(fetchFn) — factory
│   │   │   ├── workouts.ts                 # Workout API calls (pure functions taking fetchFn)
│   │   │   ├── daily-logs.ts               # Daily log API calls
│   │   │   ├── chat.ts                     # Chat API calls
│   │   │   ├── strava.ts                   # Strava integration calls
│   │   │   ├── user.ts                     # Profile / account calls
│   │   │   └── index.ts                    # Re-export all
│   │   │
│   │   └── utils/
│   │       ├── stats.ts                    # getActivityStats(), formatDistance(), formatDuration()
│   │       ├── date.ts                     # Date formatting, timezone helpers
│   │       └── workout.ts                  # groupByDate(), sortByStartTime(), etc.
│   │
│   ├── infrastructure/                     # PLATFORM SERVICES
│   │   ├── auth/
│   │   │   ├── AuthContext.tsx             # Shared interface + provider shell
│   │   │   ├── auth-provider.native.tsx    # Native Google Sign-In implementation
│   │   │   ├── auth-provider.web.tsx       # Web Google OAuth implementation
│   │   │   └── types.ts                    # AuthState, AuthActions interfaces
│   │   │
│   │   ├── network/
│   │   │   ├── network.ts                  # NetworkState interface
│   │   │   ├── network.native.ts           # expo-network implementation
│   │   │   └── network.web.ts              # navigator.onLine implementation
│   │   │
│   │   ├── storage/
│   │   │   ├── storage.ts                  # StorageAdapter interface
│   │   │   ├── storage.native.ts           # AsyncStorage + SecureStore
│   │   │   └── storage.web.ts              # localStorage + sessionStorage
│   │   │
│   │   ├── offline/
│   │   │   ├── queue.ts                    # OfflineQueue class (uses StorageAdapter)
│   │   │   └── sync.ts                     # processQueue(), ID swapping logic
│   │   │
│   │   └── fetch/
│   │       ├── auth-fetch.ts               # authFetch interface
│   │       ├── auth-fetch.native.ts        # SecureStore token injection
│   │       └── auth-fetch.web.ts           # localStorage token injection
│   │
│   ├── features/                           # FEATURE MODULES
│   │   │
│   │   ├── plan/                           # Training Plan (was "itinerary")
│   │   │   ├── hooks/
│   │   │   │   ├── usePlan.ts              # Shared: fetch workouts, group by date, CRUD
│   │   │   │   └── usePlanSync.ts          # Shared: offline queue + GCal sync
│   │   │   ├── views/
│   │   │   │   ├── PlanScreen.native.tsx   # SectionList, pull-to-refresh, swipe actions
│   │   │   │   └── PlanScreen.web.tsx      # 7-column grid, drag-and-drop, endless scroll
│   │   │   └── index.ts                    # Public exports
│   │   │
│   │   ├── workout/                        # Workout CRUD
│   │   │   ├── hooks/
│   │   │   │   ├── useWorkout.ts           # Single workout fetch + linked activity
│   │   │   │   ├── useWorkoutForm.ts       # Form state, validation, submit
│   │   │   │   └── useWorkoutMutations.ts  # Create, update, delete with optimistic updates
│   │   │   ├── views/
│   │   │   │   ├── WorkoutDetailScreen.native.tsx
│   │   │   │   ├── WorkoutDetailScreen.web.tsx
│   │   │   │   ├── WorkoutForm.native.tsx  # React Native form (DateTimePicker, etc.)
│   │   │   │   └── WorkoutForm.web.tsx     # HTML form (native date inputs, etc.)
│   │   │   └── index.ts
│   │   │
│   │   ├── calendar/                       # Calendar View
│   │   │   ├── hooks/
│   │   │   │   └── useCalendar.ts          # Month data, marked dates, day selection
│   │   │   ├── views/
│   │   │   │   ├── CalendarScreen.native.tsx  # react-native-calendars
│   │   │   │   └── CalendarScreen.web.tsx     # Custom grid or web calendar lib
│   │   │   └── index.ts
│   │   │
│   │   ├── coach/                          # AI Coach Chat (was "chat")
│   │   │   ├── hooks/
│   │   │   │   └── useCoach.ts             # Message state, send/receive, history
│   │   │   ├── views/
│   │   │   │   ├── CoachScreen.native.tsx  # GiftedChat
│   │   │   │   └── CoachScreen.web.tsx     # Custom chat UI (wider, keyboard-native)
│   │   │   └── index.ts
│   │   │
│   │   ├── tracker/                        # Daily Metrics Logging
│   │   │   ├── hooks/
│   │   │   │   └── useTracker.ts           # Date nav, load/save daily log, defaults
│   │   │   ├── views/
│   │   │   │   ├── TrackerScreen.native.tsx  # Sliders, compact mobile layout
│   │   │   │   └── TrackerScreen.web.tsx     # Wider form, charts, trend graphs
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/                      # Home / Overview
│   │   │   ├── hooks/
│   │   │   │   └── useDashboard.ts         # Aggregate data for overview cards
│   │   │   ├── views/
│   │   │   │   ├── DashboardScreen.native.tsx  # Card grid, quick actions
│   │   │   │   └── DashboardScreen.web.tsx     # Wide dashboard, volume chart, upcoming
│   │   │   └── index.ts
│   │   │
│   │   ├── auth/                           # Login / Onboarding
│   │   │   ├── views/
│   │   │   │   ├── LoginScreen.native.tsx
│   │   │   │   └── LoginScreen.web.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── settings/                       # User Settings
│   │       ├── hooks/
│   │       │   └── useSettings.ts          # Profile, Strava connection, logout
│   │       ├── views/
│   │       │   ├── SettingsScreen.native.tsx
│   │       │   └── SettingsScreen.web.tsx
│   │       └── index.ts
│   │
│   └── ui/                                 # SHARED UI PRIMITIVES
│       ├── components/
│       │   ├── StatsGrid.tsx               # Pure component (takes StatItem[])
│       │   ├── StatsGraphs.tsx             # Pure component
│       │   ├── LoadingSpinner.tsx
│       │   ├── ErrorBoundary.tsx
│       │   └── EmptyState.tsx
│       ├── theme/
│       │   ├── tokens.ts                   # Colors, spacing, typography
│       │   └── index.ts
│       └── hooks/
│           ├── useColorScheme.ts
│           └── useColorScheme.web.ts
│
├── package.json
├── app.json
├── tsconfig.json
└── ...config files
```

### Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@domain/*": ["./src/domain/*"],
      "@features/*": ["./src/features/*"],
      "@infra/*": ["./src/infrastructure/*"],
      "@ui/*": ["./src/ui/*"]
    }
  }
}
```

---

## 5. Platform Splitting Protocol

### Decision Tree

For every new file, ask:

```
Does this file import from 'react-native', 'expo-*' (native-only),
or browser-only APIs (localStorage, navigator, DOM)?
  │
  ├─ NO  → Single file (.ts or .tsx)
  │         Examples: types, API calls, pure hooks, utils
  │
  └─ YES → Does the LOGIC differ, or just the UI?
           │
           ├─ LOGIC differs → Split at infrastructure level
           │   File.native.ts / File.web.ts
           │   Examples: storage, network, auth provider, authFetch
           │
           └─ UI differs → Split at feature view level
               Screen.native.tsx / Screen.web.tsx
               Examples: PlanScreen, WorkoutForm, TrackerScreen
```

### Extension Conventions

| Extension | When to Use | Example |
|-----------|-------------|---------|
| `.ts` | Platform-agnostic logic (types, utils, pure functions) | `workout.ts`, `date.ts` |
| `.tsx` | Platform-agnostic React components (no RN primitives) | `StatsGrid.tsx` |
| `.native.ts` | Native-only logic (SecureStore, expo-network) | `storage.native.ts` |
| `.web.ts` | Web-only logic (localStorage, navigator.onLine) | `storage.web.ts` |
| `.native.tsx` | Native-only React components (View, ScrollView, etc.) | `PlanScreen.native.tsx` |
| `.web.tsx` | Web-only React components (div, HTML inputs, etc.) | `PlanScreen.web.tsx` |

### How Expo Resolves Platform Files

Expo/Metro bundler automatically resolves platform extensions at build time:

```typescript
// In app/(tabs)/plan.tsx:
import { PlanScreen } from '@features/plan';

// At build time:
// - On iOS/Android: resolves to PlanScreen.native.tsx
// - On Web: resolves to PlanScreen.web.tsx
```

The import path **never** includes the platform extension. The bundler picks the right file.

### Rules

1. **Never import a `.native.tsx` or `.web.tsx` file directly.** Always import without extension and let the bundler resolve.
2. **Platform files must export the same interface.** If `PlanScreen.native.tsx` exports `PlanScreen`, then `PlanScreen.web.tsx` must also export `PlanScreen` with the same props.
3. **Prefer shared files.** Only split when there's a genuine platform difference. A component using only `<Text>` from react-native doesn't need splitting — react-native-web handles it.
4. **Infrastructure splits are for APIs, not UI.** The `infrastructure/` layer splits on system capabilities (storage, network). The `features/*/views/` layer splits on UI rendering.

---

## 6. Shared Domain Layer

### 6.1 Types (`src/domain/types/`)

These mirror the backend Pydantic schemas exactly. Single source of truth for data shapes.

```typescript
// src/domain/types/workout.ts

export type ActivityType = 'run' | 'bike' | 'swim' | 'strength' | 'other';
export type WorkoutStatus = 'planned' | 'completed' | 'missed';

export interface Workout {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;        // ISO 8601
  end_time: string;           // ISO 8601
  activity_type: ActivityType;
  status: WorkoutStatus;
  created_at: string;
  google_event_id?: string;
}

export interface WorkoutCreate {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  activity_type: ActivityType;
  status?: WorkoutStatus;
}

export interface WorkoutUpdate {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  activity_type?: ActivityType;
  status?: WorkoutStatus;
}
```

```typescript
// src/domain/types/daily-log.ts

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
```

```typescript
// src/domain/types/strava.ts

export interface StravaActivity {
  id: string;
  strava_id: number;
  activity_type: string;
  distance_meters: number;
  moving_time_seconds: number;
  average_heartrate?: number;
  source_type: 'STRAVA';
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  unit?: string;
}
```

```typescript
// src/domain/types/user.ts

export interface User {
  id: string;
  email: string;
  name: string;
  timezone?: string;
  isNewUser?: boolean;
}

export interface ProfileUpdate {
  name?: string;
  timezone?: string;
}
```

```typescript
// src/domain/types/chat.ts

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
}
```

### 6.2 API Layer (`src/domain/api/`)

API functions are **pure** — they accept a fetch function and return data. No platform imports.

```typescript
// src/domain/api/client.ts

export type FetchFn = (endpoint: string, options?: RequestInit) => Promise<Response>;

export interface ApiClient {
  workouts: typeof import('./workouts');
  dailyLogs: typeof import('./daily-logs');
  chat: typeof import('./chat');
  strava: typeof import('./strava');
  user: typeof import('./user');
}
```

```typescript
// src/domain/api/workouts.ts

import type { FetchFn } from './client';
import type { Workout, WorkoutCreate, WorkoutUpdate } from '../types';

export async function getWorkouts(
  fetch: FetchFn,
  params?: { start_date?: string; end_date?: string }
): Promise<Workout[]> {
  const query = new URLSearchParams();
  if (params?.start_date) query.set('start_date', params.start_date);
  if (params?.end_date) query.set('end_date', params.end_date);
  const qs = query.toString();
  const res = await fetch(`/workouts${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`Failed to fetch workouts: ${res.status}`);
  return res.json();
}

export async function getWorkout(fetch: FetchFn, id: string): Promise<Workout> {
  const res = await fetch(`/workouts/${id}`);
  if (!res.ok) throw new Error(`Workout not found: ${res.status}`);
  return res.json();
}

export async function createWorkout(fetch: FetchFn, data: WorkoutCreate): Promise<Workout> {
  const res = await fetch('/workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create workout: ${res.status}`);
  return res.json();
}

export async function updateWorkout(
  fetch: FetchFn, id: string, data: WorkoutUpdate
): Promise<Workout> {
  const res = await fetch(`/workouts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update workout: ${res.status}`);
  return res.json();
}

export async function deleteWorkout(fetch: FetchFn, id: string): Promise<void> {
  const res = await fetch(`/workouts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete workout: ${res.status}`);
}

export async function getLinkedActivity(fetch: FetchFn, workoutId: string) {
  const res = await fetch(`/workouts/${workoutId}/activity`);
  if (!res.ok) return null;
  return res.json();
}

export async function syncGCal(fetch: FetchFn): Promise<void> {
  const res = await fetch('/workouts/sync-gcal', { method: 'POST' });
  if (!res.ok) throw new Error(`GCal sync failed: ${res.status}`);
}
```

Same pattern for `daily-logs.ts`, `chat.ts`, `strava.ts`, `user.ts`.

### 6.3 Utils (`src/domain/utils/`)

Pure functions. No platform imports. Extracted from current `stats_presenter.ts` and inline logic in screens.

```typescript
// src/domain/utils/stats.ts
// Moved from services/stats_presenter.ts — identical logic

export function getActivityStats(activity: StravaActivity): StatItem[] { ... }
export function formatDistance(meters: number): string { ... }
export function formatDuration(seconds: number): string { ... }
```

```typescript
// src/domain/utils/date.ts

import { format, parseISO, startOfDay, isToday, isSameDay } from 'date-fns';

export function formatDateHeader(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'TODAY';
  return format(date, 'EEEE, MMMM d');
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
```

```typescript
// src/domain/utils/workout.ts

import type { Workout } from '../types';
import { parseISO, format } from 'date-fns';

export function groupByDate(workouts: Workout[]): Map<string, Workout[]> {
  const map = new Map<string, Workout[]>();
  for (const w of workouts) {
    const key = format(parseISO(w.start_time), 'yyyy-MM-dd');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(w);
  }
  return map;
}

export function sortByStartTime(workouts: Workout[]): Workout[] {
  return [...workouts].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
}
```

---

## 7. Feature Specifications

### 7.1 Plan Feature (`src/features/plan/`)

The training plan is where Web and Mobile diverge the most.

#### Shared Hook: `usePlan.ts`

```typescript
// src/features/plan/hooks/usePlan.ts

import { useState, useEffect, useCallback } from 'react';
import * as workoutApi from '@domain/api/workouts';
import { groupByDate, sortByStartTime } from '@domain/utils/workout';
import type { Workout, WorkoutUpdate } from '@domain/types';

interface UsePlanOptions {
  fetchFn: FetchFn;
  cacheAdapter: CacheAdapter;  // From infrastructure
}

interface UsePlanReturn {
  sections: { date: string; workouts: Workout[] }[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateWorkout: (id: string, updates: WorkoutUpdate) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
}

export function usePlan({ fetchFn, cacheAdapter }: UsePlanOptions): UsePlanReturn {
  // State, fetch, cache, CRUD — all platform-agnostic
  // Returns data + actions that views consume
}
```

#### Mobile View: `PlanScreen.native.tsx`

- `SectionList` grouped by date
- Pull-to-refresh triggers `refresh()` + offline queue sync
- Swipe-to-delete rows
- Tap row → navigate to workout detail
- Toggle status pill (planned ↔ completed)
- FAB for "Add Workout"
- Auto-scroll to today's section

#### Web View: `PlanScreen.web.tsx`

- **7-column grid** (Mon–Sun) with date headers
- **Endless vertical scroll** by week
- Workout cards in day cells, color-coded by activity type
- **Drag-and-drop** to reschedule (day-to-day, week-to-week)
- Block grouping (e.g., "Base Phase," "Build Phase") as row separators
- Volume chart (weekly hours/miles) as sidebar or top bar
- Click workout → inline detail panel (no navigation)
- Keyboard shortcuts (arrow keys to move between days, Enter to expand)

### 7.2 Workout Feature (`src/features/workout/`)

#### Shared Hook: `useWorkoutForm.ts`

```typescript
// Manages form state, validation, and submit for both create and edit

interface UseWorkoutFormOptions {
  initialValues?: Partial<WorkoutCreate>;
  onSubmit: (data: WorkoutCreate) => Promise<void>;
}

interface UseWorkoutFormReturn {
  values: WorkoutCreate;
  setField: (field: keyof WorkoutCreate, value: any) => void;
  errors: Partial<Record<keyof WorkoutCreate, string>>;
  submitting: boolean;
  submit: () => Promise<void>;
  reset: () => void;
}
```

#### Mobile View: `WorkoutForm.native.tsx`

- Current `WorkoutForm.tsx` (modal with DateTimePicker, slider, pills)
- Keyboard-avoiding view
- Full-screen modal presentation

#### Web View: `WorkoutForm.web.tsx`

- HTML `<input type="date">`, `<input type="time">`, `<select>`
- Inline form (sidebar panel or modal dialog)
- Wider layout, more fields visible at once

### 7.3 Coach Feature (`src/features/coach/`)

#### Shared Hook: `useCoach.ts`

```typescript
interface UseCoachReturn {
  messages: ChatMessage[];
  sending: boolean;
  send: (text: string) => Promise<void>;
  clear: () => void;
}
```

#### Mobile View: `CoachScreen.native.tsx`

- GiftedChat (existing)
- Quick-reply buttons for common actions
- Compact, thumb-friendly

#### Web View: `CoachScreen.web.tsx`

- Split panel: chat left, context right (today's plan, recent logs)
- Wider message bubbles, keyboard-native input
- Markdown rendering for AI responses

### 7.4 Tracker Feature (`src/features/tracker/`)

#### Shared Hook: `useTracker.ts`

```typescript
interface UseTrackerReturn {
  date: string;
  log: DailyLog;
  loading: boolean;
  setDate: (date: string) => void;
  setField: (field: keyof DailyLog, value: number) => void;
  save: () => Promise<void>;
  navigateDay: (direction: -1 | 1) => void;
}
```

#### Mobile View: `TrackerScreen.native.tsx`

- Current slider-based UI
- Date navigation arrows
- Quick save button
- Compact single-column

#### Web View: `TrackerScreen.web.tsx`

- Wider form layout with number inputs
- 7-day trend sparklines next to each metric
- Weekly comparison charts
- Batch edit across days

### 7.5 Calendar Feature (`src/features/calendar/`)

#### Shared Hook: `useCalendar.ts`

```typescript
interface UseCalendarReturn {
  workouts: Workout[];
  markedDates: Record<string, { dots: Dot[] }>;
  selectedDate: string | null;
  selectDate: (date: string) => void;
  selectedWorkouts: Workout[];
}
```

#### Mobile View: `CalendarScreen.native.tsx`

- `react-native-calendars` (existing)
- Dot markers per day
- Bottom sheet with day's workouts
- Strava activity stats card

#### Web View: `CalendarScreen.web.tsx`

- Full-month grid (can be same as plan view, or separate)
- Hover to preview workouts
- Click to expand day detail

### 7.6 Dashboard Feature (`src/features/dashboard/`)

#### Shared Hook: `useDashboard.ts`

```typescript
interface UseDashboardReturn {
  todayWorkouts: Workout[];
  weekSummary: { planned: number; completed: number; missed: number };
  todayLog: DailyLog | null;
  recentActivity: StravaActivity | null;
}
```

#### Mobile: Quick-action card grid (existing)
#### Web: Wide overview panel with volume chart, upcoming workouts, recent activity feed

### 7.7 Auth Feature (`src/features/auth/`)

#### Mobile: Full-screen branding + Google Sign-In button (existing)
#### Web: Centered card with Google OAuth button

### 7.8 Settings Feature (`src/features/settings/`)

#### Shared Hook: `useSettings.ts`

```typescript
interface UseSettingsReturn {
  user: User;
  stravaConnected: boolean;
  connectStrava: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
}
```

#### Mobile: Scrollable settings list (existing)
#### Web: Wider settings panel with sections

---

## 8. State Management & Sync

### 8.1 Architecture

No global state library (Redux, Zustand) is needed at this scale. Use:

1. **React Context** for auth state (already exists).
2. **Feature hooks** for feature-local state (data fetching + mutations).
3. **Infrastructure adapters** for caching and offline queue.

### 8.2 Cache Strategy

```typescript
// src/infrastructure/storage/cache.ts

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Cache keys (centralized):
export const CACHE_KEYS = {
  WORKOUTS: 'chimera_cache_workouts',
  DAILY_LOGS: 'chimera_cache_daily_logs',
  DASHBOARD: 'chimera_cache_dashboard',
} as const;
```

Native: `AsyncStorage`
Web: `localStorage`

### 8.3 Offline Queue (Mobile-Only)

The offline queue is a **mobile concern**. Web assumes persistent connectivity.

```typescript
// src/infrastructure/offline/queue.ts

export interface QueueItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPSERT';
  endpoint: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export class OfflineQueue {
  constructor(private storage: CacheAdapter) {}

  async add(item: Omit<QueueItem, 'id' | 'timestamp'>): Promise<void> { ... }
  async process(fetchFn: FetchFn): Promise<number> { ... }
  async getAll(): Promise<QueueItem[]> { ... }
  async clear(): Promise<void> { ... }
}
```

### 8.4 Cross-Platform Data Sync

Web and Mobile are **independent clients** that talk to the same backend. They don't sync with each other directly. The backend is the single source of truth.

```
┌──────────┐         ┌─────────────┐         ┌──────────┐
│  Mobile   │ ──────→ │   Backend   │ ←────── │   Web    │
│  (field)  │ ←────── │  (Supabase) │ ──────→ │  (desk)  │
└──────────┘  REST    └─────────────┘  REST   └──────────┘
```

**Consistency model:**
- Mobile pulls fresh data on every tab focus / pull-to-refresh
- Web pulls fresh data on page load + periodic polling (every 30s)
- Both write through the API (no direct DB access)
- Offline queue (mobile) replays mutations when connectivity returns
- No real-time sync needed at this stage (can add Supabase Realtime later)

**When the coach plans on web, the athlete sees it on mobile:**
1. Coach drags workout to Tuesday on web → PATCH /workouts/{id}
2. Backend updates DB + GCal
3. Athlete opens Plan tab on mobile → GET /workouts (fresh fetch)
4. Tuesday workout appears

---

## 9. Migration Plan

### Phase 1: Foundation (No Behavior Changes) ✅ COMPLETE (2026-02-16)

Create the directory structure and move shared code. The app continues to work identically.

**Steps:** ✅ All Complete

1. ✅ Create `src/` directory tree (all folders)
2. ✅ Move types: Created TypeScript interfaces mirroring backend Pydantic schemas → `src/domain/types/`
3. ✅ Move utils: `stats_presenter.ts` → `src/domain/utils/stats.ts`
4. ✅ Move infrastructure:
   - `services/config.ts` → `src/infrastructure/fetch/config.ts`
   - `services/authFetch.web.ts` → `src/infrastructure/fetch/auth-fetch.web.ts`
   - `services/authFetch.native.ts` → `src/infrastructure/fetch/auth-fetch.native.ts`
   - `services/offline_queue.ts` → `src/infrastructure/offline/queue.ts`
   - `context/AuthContext.web.tsx` → `src/infrastructure/auth/auth-provider.web.tsx`
   - `context/AuthContext.native.tsx` → `src/infrastructure/auth/auth-provider.native.tsx`
5. ✅ Update `tsconfig.json` with path aliases (@domain, @infra, @features, @ui)
6. ✅ Update all imports to use aliases
7. ⏳ **VERIFICATION PENDING**: `npx expo start --tunnel -c` works on both platforms

**Commits:**
- `8718ca0` - Move infrastructure files to src/
- `2686d7b` - Create domain types
- `c2d12a7` - Add path aliases to tsconfig.json
- `9f0c111` - Update all imports to use path aliases

**Next:** Phase 2 requires verification of Phase 1 first, then consolidate API clients.

### Phase 2: Domain API Layer

Consolidate the duplicated API clients into a single shared layer.

**Steps:**

1. Create `src/domain/api/workouts.ts` (pure functions, no platform imports)
2. Create `src/domain/api/daily-logs.ts`
3. Create `src/domain/api/chat.ts`
4. Create `src/domain/api/strava.ts`
5. Create `src/domain/api/user.ts`
6. Delete `services/api.web.ts` and `services/api.native.ts`
7. Wire domain API through infrastructure fetch layer
8. Verify: All CRUD operations work on both platforms

### Phase 3: Feature Hooks

Extract business logic from screens into feature hooks.

**Steps (per feature, starting with `plan` as the most complex):**

1. Create `src/features/plan/hooks/usePlan.ts`
   - Extract: data fetching, grouping, caching from `itinerary.tsx`
2. Create `src/features/workout/hooks/useWorkoutForm.ts`
   - Extract: form state from `WorkoutForm.tsx`
3. Create `src/features/workout/hooks/useWorkout.ts`
   - Extract: single workout + linked activity from `workout_details.tsx`
4. Create `src/features/tracker/hooks/useTracker.ts`
   - Extract: date nav, load/save from `tracker.tsx`
5. Create `src/features/coach/hooks/useCoach.ts`
   - Extract: message state from `chat.tsx`
6. Create `src/features/calendar/hooks/useCalendar.ts`
   - Extract: marked dates, selection from `calendar.tsx`
7. Create `src/features/settings/hooks/useSettings.ts`
   - Extract: profile, connections from `settings.tsx`
8. Verify: Screens now import hooks instead of containing logic

### Phase 4: Platform Views

Rename existing screens as `.native.tsx` and create `.web.tsx` counterparts.

**Steps:**

1. Move each screen to its feature's `views/` directory with `.native.tsx` extension
2. Create thin `.web.tsx` counterparts (initially simple, enhanced later)
3. Update `app/` route files to import from features
4. Verify: Both platforms render correctly

### Phase 5: Web-Specific Enhancements

Build the strategic planning experience for web.

**Steps (post-refactor, new development):**

1. `PlanScreen.web.tsx` — 7-column grid with endless scroll
2. `DashboardScreen.web.tsx` — Volume charts, wide overview
3. `TrackerScreen.web.tsx` — Trend sparklines, batch editing
4. `CoachScreen.web.tsx` — Split panel chat + context
5. Drag-and-drop workout rescheduling
6. Keyboard navigation

---

## 10. File Migration Map

Exact source → destination for every file that moves.

### Services

| Current Path | New Path | Notes |
|---|---|---|
| `services/config.ts` | `src/infrastructure/fetch/config.ts` | No changes |
| `services/authFetch.web.ts` | `src/infrastructure/fetch/auth-fetch.web.ts` | Update imports |
| `services/authFetch.native.ts` | `src/infrastructure/fetch/auth-fetch.native.ts` | Update imports |
| `services/api.web.ts` | **DELETED** | Replaced by `src/domain/api/*` |
| `services/api.native.ts` | **DELETED** | Replaced by `src/domain/api/*` |
| `services/offline_queue.ts` | `src/infrastructure/offline/queue.ts` | Update imports |
| `services/stats_presenter.ts` | `src/domain/utils/stats.ts` | Update imports |

### Context

| Current Path | New Path | Notes |
|---|---|---|
| `context/AuthContext.web.tsx` | `src/infrastructure/auth/auth-provider.web.tsx` | Update imports |
| `context/AuthContext.native.tsx` | `src/infrastructure/auth/auth-provider.native.tsx` | Update imports |

### Components

| Current Path | New Path | Notes |
|---|---|---|
| `components/WorkoutForm.tsx` | `src/features/workout/views/WorkoutForm.native.tsx` | Mobile-specific, will get `.web.tsx` sibling |
| `components/stats-grid.tsx` | `src/ui/components/StatsGrid.tsx` | Rename to PascalCase |
| `components/stats-graphs.tsx` | `src/ui/components/StatsGraphs.tsx` | Rename to PascalCase |
| `components/themed-text.tsx` | `src/ui/components/ThemedText.tsx` | Rename |
| `components/themed-view.tsx` | `src/ui/components/ThemedView.tsx` | Rename |
| Other boilerplate | `src/ui/components/` | Move + rename |

### Theme

| Current Path | New Path | Notes |
|---|---|---|
| `theme/index.ts` | `src/ui/theme/tokens.ts` | Rename for clarity |
| `constants/theme.ts` | **DELETED** | Merge into tokens.ts |

### Hooks

| Current Path | New Path | Notes |
|---|---|---|
| `hooks/use-color-scheme.ts` | `src/ui/hooks/useColorScheme.ts` | Rename to camelCase |
| `hooks/use-color-scheme.web.ts` | `src/ui/hooks/useColorScheme.web.ts` | Platform split stays |
| `hooks/use-theme-color.ts` | `src/ui/hooks/useThemeColor.ts` | Rename |

### App Routes (Thin Shells)

| Current Path | Action | New Content |
|---|---|---|
| `app/_layout.tsx` | **EDIT** | Import AuthProvider from `@infra/auth` |
| `app/index.tsx` | **KEEP** | Splash redirect (already thin) |
| `app/redirect.tsx` | **KEEP** | Strava callback (already thin) |
| `app/(auth)/_layout.tsx` | **KEEP** | Already thin |
| `app/(auth)/login.tsx` | **EDIT** | `<LoginScreen />` from `@features/auth` |
| `app/(tabs)/_layout.tsx` | **EDIT** | Update tab names (plan, coach) |
| `app/(tabs)/index.tsx` | **EDIT** | `<DashboardScreen />` from `@features/dashboard` |
| `app/(tabs)/itinerary.tsx` | **RENAME → plan.tsx, EDIT** | `<PlanScreen />` from `@features/plan` |
| `app/(tabs)/calendar.tsx` | **EDIT** | `<CalendarScreen />` from `@features/calendar` |
| `app/(tabs)/chat.tsx` | **RENAME → coach.tsx, EDIT** | `<CoachScreen />` from `@features/coach` |
| `app/(tabs)/tracker.tsx` | **EDIT** | `<TrackerScreen />` from `@features/tracker` |
| `app/(tabs)/settings.tsx` | **EDIT** | `<SettingsScreen />` from `@features/settings` |
| `app/add_workout.tsx` | **MOVE → app/workout/new.tsx** | `<WorkoutNewScreen />` |
| `app/edit_workout.tsx` | **MOVE → app/workout/edit/[id].tsx** | `<WorkoutEditScreen />` |
| `app/workout_details.tsx` | **MOVE → app/workout/[id].tsx** | `<WorkoutDetailScreen />` |
| `app/modal.tsx` | **DELETE** | Unused after workout routes restructured |

### New Files to Create

| Path | Purpose |
|---|---|
| `src/domain/types/workout.ts` | Workout types |
| `src/domain/types/daily-log.ts` | DailyLog types |
| `src/domain/types/chat.ts` | Chat types |
| `src/domain/types/strava.ts` | Strava types |
| `src/domain/types/user.ts` | User types |
| `src/domain/types/index.ts` | Re-exports |
| `src/domain/api/client.ts` | FetchFn type, client factory |
| `src/domain/api/workouts.ts` | Workout API functions |
| `src/domain/api/daily-logs.ts` | Daily log API functions |
| `src/domain/api/chat.ts` | Chat API functions |
| `src/domain/api/strava.ts` | Strava API functions |
| `src/domain/api/user.ts` | User API functions |
| `src/domain/api/index.ts` | Re-exports |
| `src/domain/utils/date.ts` | Date formatting helpers |
| `src/domain/utils/workout.ts` | Workout grouping/sorting |
| `src/infrastructure/auth/AuthContext.tsx` | Auth context shell |
| `src/infrastructure/auth/types.ts` | Auth interfaces |
| `src/infrastructure/network/network.ts` | Network interface |
| `src/infrastructure/network/network.native.ts` | Native impl |
| `src/infrastructure/network/network.web.ts` | Web impl |
| `src/infrastructure/storage/storage.ts` | Storage interface |
| `src/infrastructure/storage/storage.native.ts` | AsyncStorage impl |
| `src/infrastructure/storage/storage.web.ts` | localStorage impl |
| `src/infrastructure/storage/cache.ts` | CacheAdapter + keys |
| `src/infrastructure/offline/sync.ts` | Queue processor |
| `src/features/plan/hooks/usePlan.ts` | Plan data + CRUD |
| `src/features/plan/hooks/usePlanSync.ts` | Offline sync |
| `src/features/plan/views/PlanScreen.web.tsx` | Web 7-col grid |
| `src/features/plan/index.ts` | Exports |
| `src/features/workout/hooks/useWorkout.ts` | Single workout |
| `src/features/workout/hooks/useWorkoutForm.ts` | Form state |
| `src/features/workout/hooks/useWorkoutMutations.ts` | CRUD ops |
| `src/features/workout/views/WorkoutDetailScreen.native.tsx` | Detail |
| `src/features/workout/views/WorkoutDetailScreen.web.tsx` | Detail |
| `src/features/workout/views/WorkoutForm.web.tsx` | Web form |
| `src/features/workout/index.ts` | Exports |
| `src/features/calendar/hooks/useCalendar.ts` | Calendar data |
| `src/features/calendar/views/CalendarScreen.web.tsx` | Web calendar |
| `src/features/calendar/index.ts` | Exports |
| `src/features/coach/hooks/useCoach.ts` | Chat state |
| `src/features/coach/views/CoachScreen.web.tsx` | Web chat |
| `src/features/coach/index.ts` | Exports |
| `src/features/tracker/hooks/useTracker.ts` | Tracker state |
| `src/features/tracker/views/TrackerScreen.web.tsx` | Web tracker |
| `src/features/tracker/index.ts` | Exports |
| `src/features/dashboard/hooks/useDashboard.ts` | Dashboard data |
| `src/features/dashboard/views/DashboardScreen.web.tsx` | Web dashboard |
| `src/features/dashboard/index.ts` | Exports |
| `src/features/auth/views/LoginScreen.web.tsx` | Web login |
| `src/features/auth/index.ts` | Exports |
| `src/features/settings/hooks/useSettings.ts` | Settings state |
| `src/features/settings/views/SettingsScreen.web.tsx` | Web settings |
| `src/features/settings/index.ts` | Exports |
| `src/ui/components/LoadingSpinner.tsx` | Shared spinner |
| `src/ui/components/ErrorBoundary.tsx` | Error boundary |
| `src/ui/components/EmptyState.tsx` | Empty state |
| `src/ui/theme/index.ts` | Theme re-exports |

---

## 11. Testing & Verification

Each phase has a verification gate. Do not proceed to the next phase until all checks pass.

### Phase 1: Foundation

- [ ] `npx expo start --tunnel -c` launches without errors on both platforms
- [ ] All imports resolve (no "module not found" errors)
- [ ] Path aliases (`@domain/*`, `@features/*`, `@infra/*`, `@ui/*`) resolve correctly
- [ ] Existing auth flow works: login → token stored → API calls succeed
- [ ] Existing screens render identical content (visual regression check)

### Phase 2: Domain API Layer

- [ ] `GET /v1/workouts` returns data on both web and native
- [ ] `POST /v1/workouts` creates a workout (check Supabase + GCal)
- [ ] `PATCH /v1/workouts/{id}` updates a workout
- [ ] `DELETE /v1/workouts/{id}` removes from DB + GCal
- [ ] `PUT /v1/daily-logs/{date}` upserts a daily log
- [ ] `GET /v1/daily-logs/{date}` returns log data
- [ ] Chat endpoint responds with AI reply
- [ ] 401 returned when no Bearer token is sent
- [ ] Old `services/api.web.ts` and `services/api.native.ts` fully deleted, no orphan imports

### Phase 3: Feature Hooks

- [ ] Each screen renders the same data as before extraction
- [ ] Pull-to-refresh still works on Plan screen (mobile)
- [ ] Offline mode: airplane mode → create workout → comes back online → workout syncs
- [ ] Workout status toggle (planned ↔ completed) works
- [ ] Tracker saves daily log and reloads on date change
- [ ] Coach chat sends and receives messages
- [ ] Calendar marks dots for days with workouts

### Phase 4: Platform Views

- [ ] Mobile: all tabs render correctly with `.native.tsx` views
- [ ] Web: all routes render correctly with `.web.tsx` views
- [ ] No platform file imported directly (only via extensionless imports)
- [ ] `PlanScreen` renders different UIs on web vs. mobile

### Phase 5: Web Enhancements

- [ ] 7-column grid renders weeks correctly
- [ ] Drag-and-drop reschedules workout (PATCH fires, DB updates)
- [ ] Volume chart reflects actual workout data
- [ ] Keyboard navigation moves between days

---

## 12. Rollback Strategy

Each phase is independently revertible via git.

| Phase | Rollback Method | Risk |
|-------|----------------|------|
| **Phase 1** | `git revert` the move commits. Restore old import paths. | LOW — only file moves, no logic changes |
| **Phase 2** | Restore `api.web.ts` / `api.native.ts` from git. Point imports back. | LOW — domain API is additive, old files can coexist |
| **Phase 3** | Move logic back from hooks into screens. | MEDIUM — more files touched, but logic is unchanged |
| **Phase 4** | Rename `.native.tsx` back to `.tsx`, delete `.web.tsx` stubs. | LOW — reversible file renames |
| **Phase 5** | Delete new web-specific code. Web falls back to mobile-style rendering. | LOW — new code only, no existing code modified |

**General principle:** Each phase should be a separate branch/PR. Never merge Phase N+1 until Phase N is verified in production.

---

## 13. Deferred Items

Carried forward from Operation Stabilize + identified during this analysis. These are out of scope for the refactor but should be tracked.

| Item | Priority | Notes |
|------|----------|-------|
| Timezone from user settings | Medium | Hardcoded to Eastern Time (UTC-5) in **3 places**: `main.py:82` (AI system prompt), `main.py:95` (AI priming), `strava_service.py:155` (workout matching). Should read from user's profile `timezone` field. |
| `WEB_CLIENT_ID` hardcoded in source | Medium | Google OAuth client ID `247141696720-...` is hardcoded in both `AuthContext.web.tsx:7` and `AuthContext.native.tsx:12`. Should move to `app.json` extra or env var. Not a secret (public client ID), but bad practice. |
| Pin Python dependencies | Low | `requirements.txt` uses unpinned versions. Add `pip freeze` output or use `pip-tools`. |
| AI tool timeout handling | Low | Gemini function calls have no timeout. Edge case but could hang a request. |
| Structured logging | Low | Backend uses `print()` with emoji. Replace with `logging` module for production observability. |
| `placeimg.com` deprecated avatar | Low | `chat.tsx:18,49` uses `https://placeimg.com/140/140/any` for AI avatar. Service is dead. Replace with local asset or inline SVG. |
| `Math.random()` for offline queue IDs | Low | `offline_queue.ts:46` uses `Math.random().toString(36)` — collision risk at scale. Replace with `crypto.randomUUID()` during infrastructure refactor (Phase 1). |
| Error reversion for optimistic updates | Medium | Offline optimistic updates don't revert on server-side failure. Should show user a "sync failed" indicator. |
| Push notifications | Low | No notifications when Strava activity syncs or workout is upcoming. Future feature. |
| Supabase Realtime | Low | For instant cross-platform sync (coach moves workout on web → mobile sees it without refresh). Not needed until multi-user scenarios. |
| Onboarding screen | Medium | Referenced in routing logic but file not found. Needed for new user flow when registration is re-enabled. |

---

## Appendix A: Route File Template

Every `app/` route file should follow this pattern after refactor:

```typescript
// app/(tabs)/plan.tsx
import { PlanScreen } from '@features/plan';

export default function PlanRoute() {
  return <PlanScreen />;
}
```

That's it. 5 lines. The route is a shell.

## Appendix B: Feature Index Template

Every feature's `index.ts` re-exports its public API:

```typescript
// src/features/plan/index.ts
export { PlanScreen } from './views/PlanScreen';
export { usePlan } from './hooks/usePlan';
export { usePlanSync } from './hooks/usePlanSync';
```

When importing `PlanScreen` without the platform extension, Metro/webpack resolves `.native.tsx` or `.web.tsx` automatically based on the build target.

## Appendix C: What NOT to Change

- **Backend (`chimera_api/`)**: No changes. The API contract is stable.
- **`app.json`**: No changes to Expo config.
- **`eas.json`**: No changes to build config.
- **`package.json` dependencies**: No new dependencies in Phase 1-4. Web-specific libs (drag-and-drop, charting) added only in Phase 5.
- **Database schema**: No changes.

---

*End of Blueprint*
