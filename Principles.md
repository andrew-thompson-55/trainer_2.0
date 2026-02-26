# Product Principles

> These principles govern every design decision, feature build, and code review in this product. When in doubt, test your decision against these. If it violates a principle, it needs a strong justification or it doesn't ship.

---

## 1. The Athlete Decides What Matters

The app provides data, analysis, and suggestions. The athlete makes every final decision. Never auto-adjust a training plan without explicit confirmation. Never hide data because an algorithm thinks it's irrelevant. Never override a user's manual input with a "smarter" calculation. The user's judgment is the product's output — we just sharpen it.

**This means:** Every AI suggestion is presented as a suggestion, never as an action taken. Settings default to user control, not automation. Overrides always exist.

---

## 2. Show the Data, Not a Judgment

Present information neutrally. A rest day with zero miles is not a failure state. A 50-mile week is not inherently better than a 30-mile week. The dashboard shows what happened — colors, icons, and language reflect status, not verdict.

**This means:** Use amber for "lower than comparison," not red. Show rest days as completed plan items, not empty gaps. Never use language like "you only ran" or "you missed." The UI never guilts.

---

## 3. Partial Engagement Is Full Engagement

Users who check in 3 days a week are using the app correctly. Users who skip the morning check-in but log RPE are using the app correctly. Users who only look at the dashboard and never talk to the coach are using the app correctly. Design every feature to degrade gracefully to zero input.

**This means:** No empty states that feel like accusations ("You haven't logged anything!"). No streak mechanics that punish gaps. No features that require complete data to show any value. Every feature works with incomplete data and gets better with more.

---

## 4. Experiment Toward Outcomes, Not Demos

Every feature must answer: "What workflow does this improve?" If the answer is "it looks cool" or "it shows what AI can do," it's a demo, not a product feature. Ship things that change how the athlete makes a decision, not things that impress on a screenshot.

**This means:** Before building, state the outcome in one sentence: "This helps the athlete decide [X]." If you can't finish that sentence, the feature isn't ready to build. AI features that don't connect to a decision the athlete needs to make are theater.

---

## 5. Speed of Input > Depth of Input

Every second of manual data entry is borrowed against the user's willingness to open the app tomorrow. Four taps is better than ten. A skipped metric is better than an abandoned check-in. An imprecise emoji is better than an unsubmitted slider.

**This means:** Subjective inputs use single-tap selection, not sliders. All fields are optional. Save buttons activate on partial input. Progressive disclosure hides advanced options until they're relevant. The morning check-in is designed to be completable in under 5 seconds.

---

## 6. Device Data Is Authoritative, Subjective Data Is Complementary

Heart rate, GPS, elevation, pace — these come from devices and are treated as ground truth. Readiness, soreness, mood, RPE — these come from the athlete and provide context that devices can't capture. Neither replaces the other. Never ask the user to manually input something a device already tracks.

**This means:** Sleep, HRV, and recovery metrics come from device integrations, not manual entry. The check-in page only asks for things a watch can't measure. When device data and subjective data conflict (high readiness but high resting HR), surface both — don't reconcile them silently.

---

## 7. The Calendar Is the Source of Truth

If it happened, it's on the calendar. Planned workouts, unplanned activities, rest days, missed sessions — everything appears. Nothing is hidden because it wasn't in the plan. Excluded activities are dimmed, not deleted. The calendar is a complete, honest record of the athlete's life.

**This means:** Strava activities without matching plans auto-create calendar entries. Rest days are shown as planned items. Stat exclusions are visual (dimming), not structural (removal). Data export includes everything regardless of filter settings.

---

## 8. Store Everything, Filter at Query Time

Never discard data at ingestion because you don't need it today. Raw API responses, unused Strava fields, activity types the user excludes from stats — all of it is stored. Filtering, aggregation, and exclusion happen at query time, not at write time.

**This means:** Strava responses are stored as raw JSONB. Activity exclusions use a query filter, not a delete. The `tracked_activity_types` setting is a read-time filter, not a write-time gate. When a user changes their mind about what "counts," historical data is immediately available under the new filter.

---

## 9. The AI Coach Earns Trust Through Transparency

The AI coach has access to the athlete's full training context. It uses that context to give specific, grounded advice — not generic fitness platitudes. When the coach makes a recommendation, the data behind it should be visible or requestable. The coach never claims certainty it doesn't have.

**This means:** Coach responses reference specific data points ("Your readiness has been 2/5 for three days"). The coach says "I'd suggest" not "You should." The coach admits uncertainty ("I don't have enough data to say definitively"). The coach never invents data or cites metrics it doesn't have access to.

---

## 10. Personalization Lives in the Package, Not the Code

All trainer-specific personality, branding, copy, and defaults live in the trainer package config folder. The codebase is a platform. Swapping a package changes the entire personality and visual identity without touching application code.

**This means:** Zero hardcoded strings, colors, prompt fragments, or coaching philosophy in the application code. Every user-facing string comes from the package. The system prompt is a single editable markdown file a non-technical trainer can read and modify. Adding a new trainer deployment means creating a new folder, not forking the repo.

---

## 11. Red Means Danger, Not Disappointment

Reserve red (#ef4444) exclusively for errors, destructive actions, and genuine alerts (injury risk, system failures). Never use red for "less than last week" or "below target." Training fluctuation is normal, not alarming. Amber signals "note this." Gray signals "no data." Green signals "on track."

**This means:** Negative week-over-week deltas are amber. Missed workouts are muted/gray, not red. Only destructive buttons (delete account, disconnect integration) and actual system errors use red. The compliance score uses green/amber/red but the red threshold is genuinely low (below 60%) — not triggered by a single missed day.

---

## 12. Every Feature Has an Empty State That Helps

No feature should show a blank void when there's no data. Empty states are an opportunity to guide the user toward the action that fills them. They should feel like an invitation, not an error.

**This means:** "No planned workouts" → shows [Import Plan] and [Add Workout] buttons. "No check-in today" → shows a quick tap to start. "No Strava connected" → shows a one-line explanation and connect button. Empty states never say "No data" and stop there.

---

## 13. Build for the Honest Week, Not the Perfect Week

Training plans have rest days. Athletes get sick. Life interrupts. The product should look good and feel useful during a recovery week, a taper, a deload, or a week where the user didn't open the app at all. If the dashboard only feels rewarding during peak training, it fails the majority of weeks.

**This means:** The compliance score rewards rest days equally to hard training days. The dashboard comparison is week-to-date vs. same point last week (not full week). Metrics handle zero-volume weeks without visual panic. Streaks are gentle badges, not punitive counters.

---

## 14. Own Your Dependencies

When a third-party service (Strava, Supabase, a notification provider) is down or slow, the app should degrade gracefully, not crash. Never let the user's experience be held hostage by an external API's availability.

**This means:** Strava sync failures retry silently — the user doesn't see an error unless it persists. The dashboard renders with cached/stale data when the API is slow, with a subtle "last updated" indicator. Push notification failures are logged and retried, never surfaced to the user. Offline-capable features (viewing cached data, writing a check-in) work without a network connection where feasible.

---

## How to Use This Document

**When building a new feature:** Read through the principles before writing a spec. If your feature conflicts with any principle, either redesign the feature or write a documented exception with justification.

**When reviewing code:** Check the PR against relevant principles. "Does this empty state help?" "Does this color choice imply judgment?" "Is this data stored or discarded?"

**When making a tradeoff:** Principles are ordered roughly by priority. If two principles conflict (speed of input vs. depth of data), the higher-numbered principle generally yields to the lower-numbered one.

**When onboarding a new contributor:** This is the first document they read after the README. If they understand these principles, they'll make good decisions without being told what to do.