# Daily Check-in Reimagination — Implementation Prompt

## Context

You are implementing a reimagined daily subjective data entry feature for a fitness app. The old page had sliders (0-10) for Sleep (total, deep, REM), Recovery (body battery, HRV, resting HR), Subjective (motivation, soreness, stress), and Physical (body weight). Sleep and Recovery are now tracked via device integration (Garmin/etc.) and should be **removed from manual input entirely**. The subjective inputs are being redesigned from scratch.

The app is connected to Strava for workout data.

---

## Part 1: Database Migration

### New Table: `daily_checkin`

Create a new table to replace the old daily log. The schema must support **multiple entries per day** (morning check-in + N workout update cards).

```
daily_checkin
├── id (PK, UUID)
├── user_id (FK)
├── date (DATE, not datetime — entries are grouped by calendar day)
├── entry_type (ENUM: 'morning_checkin' | 'workout_update')
├── strava_activity_id (nullable, populated for workout_update entries)
├── created_at (TIMESTAMP)
│
├── # Morning check-in fields (nullable — user can skip any)
├── readiness (INT 1-5, nullable)
├── soreness (INT 1-5, nullable)
├── energy (INT 1-5, nullable)
├── mood (INT 1-5, nullable)
├── note (TEXT, nullable)
│
├── # Workout update fields (nullable)
├── session_rpe (INT 1-5, nullable)
│
├── # Physical (optional, only on morning_checkin)
├── body_weight (DECIMAL, nullable)
├── body_weight_unit (ENUM: 'lbs' | 'kg', default 'lbs')
```

**Constraints:**
- UNIQUE on (user_id, date, entry_type) for morning_checkin (one per day)
- UNIQUE on (user_id, date, strava_activity_id) for workout_update (one per workout)

### Data Migration Steps (execute in order):

1. **Create** the new `daily_checkin` table
2. **Import existing data** from the old table:
   - Map `motivation` → `readiness`: `CEIL(old_value / 2)` (converts 0-10 to 1-5)
   - Map `soreness` → `soreness`: `CEIL(old_value / 2)`
   - Map `stress` → `mood`: `CEIL((10 - old_value) / 2)` (invert — high stress = low mood, then scale)
   - Set `entry_type = 'morning_checkin'` for all imported rows
   - Handle edge case: old value of 0 → map to 1 (minimum on new scale)
3. **Import existing body weights** into the corresponding morning_checkin rows
4. **Verify** row counts match between old and new tables
5. **Drop** the old table (or rename to `daily_log_deprecated` if you prefer a safety net)

---

## Part 2: Check-in UI (Input Page)

### Page Behavior — Entry Stack (FILO)

The check-in page uses a **First In, Last Out stack** to determine what to show:

1. On page load, determine what's pending for today:
   - Are there any completed Strava workouts today without a corresponding `workout_update` entry? → Push each to the stack (most recent workout on top)
   - Is there a `morning_checkin` entry for today? If not → push to the stack (bottom)

2. **Display the top of the stack first.** When the user saves that entry, pop it and show the next item.

3. If the stack is empty (everything is logged), show a **"You're all set" confirmation state** with a summary of today's entries.

**Example flow:**
- User wakes up, opens check-in → sees morning check-in (only pending item)
- User completes morning run and afternoon lifting session
- User opens check-in → sees lifting update card (most recent, top of stack)
- User saves → sees run update card (next in stack)
- User saves → sees "All set" state

### Morning Check-in UI

**Header:**
- Date string: `{DayOfWeek}, {Mon} {Day}` (e.g., "Tuesday, Feb 24")
- Title: "Check in" (changes to "Logged ✓" after save)
- Streak badge: Show "{N} day streak" with 🔥 if user has logged 2+ consecutive days. Streak counts any day with at least one entry.

**Metrics — 4 rows, emoji-tap input:**

Each metric is a **question** with **5 tap targets**. One tap per row. No sliders, no number inputs visible to the user. Values 1-5 are stored in DB.

| Metric | Question | 1 | 2 | 3 | 4 | 5 |
|--------|----------|---|---|---|---|---|
| Readiness | "How ready are you to train?" | 😴 Wrecked | 😐 Low | 🙂 Decent | 😊 Good | 🔥 Let's go |
| Soreness | "How's the body feeling?" | 😵 Destroyed | 😣 Sore | 😌 A little | 💪 Fresh | ✨ 100% |
| Energy | "Energy level right now?" | 🪫 Empty | 😶 Low | ⚡ Normal | 🔋 Charged | ⚡ Wired |
| Mood | "How's your headspace?" | 😞 Rough | 😕 Meh | 😐 Neutral | 😄 Good | 🤩 Great |

**Note on soreness mapping:** For the `soreness` DB value, the display order is inverted (worst first) but the DB stores it such that 1 = most sore, 5 = least sore. This aligns "good" states with higher numbers across all metrics.

Wait — actually, let's keep DB values consistent with user intent: **1 = worst, 5 = best across all metrics.** For soreness, "Destroyed" = 1 (worst) and "100%" = 5 (best/no soreness). The emoji order on screen reads left-to-right from worst to best for ALL metrics. This keeps analysis simple: higher number = better across the board.

**Interaction details:**
- Selected state: emoji loses grayscale filter, subtle scale-up (1.12x), light colored background behind the option, small dot indicator below
- Unselected state: slight grayscale on emoji, neutral label color
- Tapping a different option in the same row deselects the previous one
- **All metrics are optional.** User can fill 0-4 of them.

**"+ Add a note" button:**
- Appears only after 2+ metrics are selected (progressive disclosure)
- Toggles a textarea: "Anything else? (optional)"
- Max ~280 chars, no hard enforcement

**Body weight input:**
- Sits below the metrics card in a subtle secondary container
- Minimal: label + number input + unit label
- Optional, no prompt if skipped

**Save button:**
- If 0 metrics filled: no button shown
- If 1-3 filled: button shows "Save ({N}/4)" in a muted/secondary style
- If all 4 filled: button shows "Save check-in" in primary style (dark, confident)
- Subtle helper text when partially filled: "Skip what doesn't feel relevant"

**Post-save state:**
- Card transitions to a green confirmation: ✅ "Morning check-in saved" with count summary
- If there are pending workout updates in the stack, the next update card slides in below

### Workout Update Card UI

**Header within card:**
- Small label: "Add an update" (uppercase, muted)
- Strava activity name if available (e.g., "Afternoon Run" or "Weights")
- Question: "How hard was that session?"

**RPE input — same emoji-tap pattern, 5 options:**

| 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|
| 🧘 Easy | 👌 Moderate | 😤 Hard | 🥵 Brutal | 💀 Maxed |

(Here 1 = easiest, 5 = hardest. This is the ONE metric where higher ≠ better — it's a load indicator, not a wellness indicator. That's fine for the DB; the analysis layer handles interpretation.)

**Save:** Same pattern — button appears after selection, saves entry, pops from stack, shows next or "all set."

### "All Set" State

When the stack is empty:
- Show a clean summary of today's logged data
- Morning check-in: show selected emojis inline as a compact row
- Workout updates: list activity names with their RPE emoji
- Option to edit any entry (tap to re-open that card in edit mode)

---

## Part 3: Notifications

### New Settings Section: Notifications

Add a **Notifications** section in app settings with these toggleable options:

```
Notifications
├── Morning check-in reminder
│   ├── Enabled: BOOL (default: false)
│   └── Time: TIME (default: 08:00, user-configurable)
│
├── Workout update reminder
│   ├── Enabled: BOOL (default: false)
│   └── Behavior: When backend receives a new Strava webhook
│       for a workout completed TODAY, send push notification:
│       "How did {activity_name} feel? Add your update."
│       Only for today's workouts (ignore backfilled/edited old activities)
│
├── Streak reminder
│   ├── Enabled: BOOL (default: false)
│   └── Behavior: If user has a streak ≥ 3 and hasn't logged by the
│       notification time, send: "Don't break your {N}-day streak! Quick check-in?"
│   └── Time: TIME (default: 10:00, user-configurable)
```

**Backend logic for workout update notifications:**
- On Strava webhook: check if the activity's `start_date` is today (in user's timezone)
- Check if user has `workout_update_reminder` enabled
- Check if there's already a `workout_update` entry for this `strava_activity_id`
- If all pass: send push notification
- **Do NOT send** for activities with start dates in the past (covers bulk imports, manual edits, etc.)

---

## Part 4: Design System Notes

### Visual direction
- Clean, minimal, mobile-first (max-width ~420px centered)
- Font: DM Sans (or your existing app font if different)
- Colors: Neutral base (slate palette), emoji options use a green-to-red spectrum contextually
- Cards: white background, subtle border (#f1f5f9), light shadow
- Animations: subtle fade-slide-up on load (staggered per row), scale pop on selection
- No heavy gradients, no loud colors outside of the emoji states

### Accessibility
- Tap targets minimum 44x44px
- Selected state has both color AND shape indicator (dot below + scale)
- Labels under each emoji for screen readers and clarity
- Keyboard navigable if web version

### Philosophy
- **Speed over completeness.** The ideal morning check-in is 4 taps and a save. Under 5 seconds.
- **Partial data is fine.** Never guilt the user for skipping metrics or skipping days.
- **Progressive disclosure.** Notes, body weight, and advanced options stay tucked away until relevant.
- **The streak is a gentle motivator**, not a punishment. It appears but never nags within the UI itself (notifications are opt-in and separate).
