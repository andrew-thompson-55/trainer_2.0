import { useState, useEffect, useRef } from "react";

// --- Concept: "Daily Check-in" ---
// Philosophy: Every interaction should feel like a conversation, not a form.
// Morning check-in: 4 taps and you're done. Optional mid-day updates.
// No sliders, no numbers visible by default. Just feelings.

const METRICS = [
  {
    key: "readiness",
    label: "Readiness",
    question: "How ready are you to train?",
    options: [
      { emoji: "😴", label: "Wrecked", value: 1, color: "#ef4444" },
      { emoji: "😐", label: "Low", value: 2, color: "#f97316" },
      { emoji: "🙂", label: "Decent", value: 3, color: "#eab308" },
      { emoji: "😊", label: "Good", value: 4, color: "#22c55e" },
      { emoji: "🔥", label: "Let's go", value: 5, color: "#10b981" },
    ],
  },
  {
    key: "soreness",
    label: "Soreness",
    question: "How's the body feeling?",
    options: [
      { emoji: "😵", label: "Destroyed", value: 5, color: "#ef4444" },
      { emoji: "😣", label: "Sore", value: 4, color: "#f97316" },
      { emoji: "😌", label: "A little", value: 3, color: "#eab308" },
      { emoji: "💪", label: "Fresh", value: 2, color: "#22c55e" },
      { emoji: "✨", label: "100%", value: 1, color: "#10b981" },
    ],
  },
  {
    key: "energy",
    label: "Energy",
    question: "Energy level right now?",
    options: [
      { emoji: "🪫", label: "Empty", value: 1, color: "#ef4444" },
      { emoji: "😶", label: "Low", value: 2, color: "#f97316" },
      { emoji: "⚡", label: "Normal", value: 3, color: "#eab308" },
      { emoji: "🔋", label: "Charged", value: 4, color: "#22c55e" },
      { emoji: "⚡", label: "Wired", value: 5, color: "#10b981" },
    ],
  },
  {
    key: "mood",
    label: "Mood",
    question: "How's your headspace?",
    options: [
      { emoji: "😞", label: "Rough", value: 1, color: "#ef4444" },
      { emoji: "😕", label: "Meh", value: 2, color: "#f97316" },
      { emoji: "😐", label: "Neutral", value: 3, color: "#eab308" },
      { emoji: "😄", label: "Good", value: 4, color: "#22c55e" },
      { emoji: "🤩", label: "Great", value: 5, color: "#10b981" },
    ],
  },
];

const POST_TRAINING = {
  key: "session_rpe",
  label: "Session Rating",
  question: "How hard was that session?",
  options: [
    { emoji: "🧘", label: "Easy", value: 1, color: "#22c55e" },
    { emoji: "👌", label: "Moderate", value: 2, color: "#84cc16" },
    { emoji: "😤", label: "Hard", value: 3, color: "#eab308" },
    { emoji: "🥵", label: "Brutal", value: 4, color: "#f97316" },
    { emoji: "💀", label: "Maxed", value: 5, color: "#ef4444" },
  ],
};

// Utility
const today = new Date();
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateString = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

function EmojiOption({ option, selected, onSelect, animDelay }) {
  const isSelected = selected === option.value;
  return (
    <button
      onClick={() => onSelect(option.value)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        padding: "10px 6px",
        border: "none",
        borderRadius: "16px",
        background: isSelected ? `${option.color}18` : "transparent",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: isSelected ? "scale(1.12)" : "scale(1)",
        flex: 1,
        minWidth: 0,
        position: "relative",
        opacity: 0,
        animation: `fadeSlideUp 0.35s ease forwards`,
        animationDelay: `${animDelay}ms`,
      }}
    >
      <span
        style={{
          fontSize: "28px",
          lineHeight: 1,
          filter: isSelected ? "none" : "grayscale(0.5)",
          transition: "filter 0.2s ease",
        }}
      >
        {option.emoji}
      </span>
      <span
        style={{
          fontSize: "11px",
          fontWeight: isSelected ? "600" : "400",
          color: isSelected ? option.color : "#94a3b8",
          letterSpacing: "0.01em",
          transition: "all 0.2s ease",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {option.label}
      </span>
      {isSelected && (
        <div
          style={{
            position: "absolute",
            bottom: "2px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: option.color,
            animation: "dotPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      )}
    </button>
  );
}

function MetricRow({ metric, value, onChange, index, totalMetrics }) {
  const baseDelay = index * 80;
  return (
    <div
      style={{
        padding: "16px 0",
        borderBottom: index < totalMetrics - 1 ? "1px solid #f1f5f9" : "none",
        opacity: 0,
        animation: `fadeSlideUp 0.4s ease forwards`,
        animationDelay: `${baseDelay}ms`,
      }}
    >
      <p
        style={{
          margin: "0 0 10px 4px",
          fontSize: "15px",
          fontWeight: "500",
          color: "#1e293b",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        {metric.question}
      </p>
      <div style={{ display: "flex", gap: "2px" }}>
        {metric.options.map((opt, i) => (
          <EmojiOption
            key={opt.value}
            option={opt}
            selected={value}
            onSelect={onChange}
            animDelay={baseDelay + 40 + i * 40}
          />
        ))}
      </div>
    </div>
  );
}

function QuickNote({ value, onChange, visible }) {
  if (!visible) return null;
  return (
    <div
      style={{
        animation: "fadeSlideUp 0.3s ease forwards",
        marginTop: "4px",
      }}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Anything else? (optional)"
        rows={2}
        style={{
          width: "100%",
          padding: "12px 14px",
          border: "1.5px solid #e2e8f0",
          borderRadius: "14px",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          color: "#334155",
          background: "#f8fafc",
          resize: "none",
          outline: "none",
          transition: "border-color 0.2s ease",
          boxSizing: "border-box",
          lineHeight: 1.5,
        }}
        onFocus={(e) => (e.target.style.borderColor = "#94a3b8")}
        onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
      />
    </div>
  );
}

function StreakBadge({ count }) {
  if (count < 2) return null;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 10px",
        background: "#fef3c7",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
        color: "#b45309",
        fontFamily: "'DM Sans', sans-serif",
        animation: "fadeSlideUp 0.4s ease forwards",
        animationDelay: "200ms",
        opacity: 0,
      }}
    >
      <span>🔥</span> {count} day streak
    </div>
  );
}

export default function DailyCheckin() {
  const [selections, setSelections] = useState({});
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState("morning"); // "morning" | "update"
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateValue, setUpdateValue] = useState(null);
  const [updateSaved, setUpdateSaved] = useState(false);

  const streak = 4; // simulated
  const metrics = mode === "morning" ? METRICS : [POST_TRAINING];

  const filledCount = Object.keys(selections).length;
  const totalCount = METRICS.length;
  const allFilled = filledCount === totalCount;
  const canSave = filledCount > 0;

  const handleSelect = (key, value) => {
    setSelections((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setShowUpdate(true), 600);
  };

  const handleSaveUpdate = () => {
    setUpdateSaved(true);
  };

  const handleReset = () => {
    setSelections({});
    setNote("");
    setShowNote(false);
    setSaved(false);
    setShowUpdate(false);
    setUpdateValue(null);
    setUpdateSaved(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPop {
          from { transform: translateX(-50%) scale(0); }
          to { transform: translateX(-50%) scale(1); }
        }
        @keyframes checkPop {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "0 20px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            paddingTop: "52px",
            paddingBottom: "24px",
            opacity: 0,
            animation: "fadeSlideUp 0.5s ease forwards",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: "500",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {dateString}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "4px",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "700",
                color: "#0f172a",
                letterSpacing: "-0.03em",
              }}
            >
              {saved ? "Logged ✓" : "Check in"}
            </h1>
            <StreakBadge count={streak} />
          </div>
        </div>

        {/* Main Check-in */}
        {!saved ? (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "8px 16px",
              border: "1.5px solid #f1f5f9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {METRICS.map((metric, i) => (
              <MetricRow
                key={metric.key}
                metric={metric}
                value={selections[metric.key]}
                onChange={(val) => handleSelect(metric.key, val)}
                index={i}
                totalMetrics={METRICS.length}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              background: "#f0fdf4",
              borderRadius: "20px",
              padding: "32px 16px",
              border: "1.5px solid #bbf7d0",
              textAlign: "center",
              animation: "fadeSlideUp 0.4s ease forwards",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                lineHeight: 1,
                animation: "checkPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
              }}
            >
              ✅
            </div>
            <p
              style={{
                margin: "12px 0 4px",
                fontSize: "16px",
                fontWeight: "600",
                color: "#166534",
              }}
            >
              Morning check-in saved
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#4ade80" }}>
              {filledCount} of {totalCount} · {note ? "with note" : ""}
            </p>
          </div>
        )}

        {/* Quick note toggle */}
        {!saved && filledCount >= 2 && (
          <div style={{ marginTop: "12px" }}>
            {!showNote && (
              <button
                onClick={() => setShowNote(true)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "8px 4px",
                  fontSize: "13px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: "500",
                  animation: "fadeSlideUp 0.3s ease forwards",
                  opacity: 0,
                }}
              >
                + Add a note
              </button>
            )}
            <QuickNote value={note} onChange={setNote} visible={showNote} />
          </div>
        )}

        {/* Save button */}
        {!saved && canSave && (
          <button
            onClick={handleSave}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "16px",
              border: "none",
              borderRadius: "16px",
              fontSize: "16px",
              fontWeight: "600",
              fontFamily: "'DM Sans', sans-serif",
              color: "#fff",
              cursor: "pointer",
              background: allFilled
                ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
                : "#cbd5e1",
              transition: "all 0.3s ease",
              animation: "fadeSlideUp 0.3s ease forwards",
              opacity: 0,
              animationDelay: "100ms",
              letterSpacing: "-0.01em",
            }}
          >
            {allFilled ? "Save check-in" : `Save (${filledCount}/${totalCount})`}
          </button>
        )}

        {/* Skipped metric hint */}
        {!saved && filledCount > 0 && !allFilled && (
          <p
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "#cbd5e1",
              marginTop: "8px",
              fontStyle: "italic",
              animation: "fadeSlideUp 0.3s ease forwards",
              opacity: 0,
            }}
          >
            Skip what doesn't feel relevant
          </p>
        )}

        {/* Post-training update */}
        {saved && showUpdate && !updateSaved && (
          <div
            style={{
              marginTop: "20px",
              animation: "fadeSlideUp 0.4s ease forwards",
              opacity: 0,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "16px",
                border: "1.5px solid #f1f5f9",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <p
                style={{
                  margin: "0 0 2px",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Add an update
              </p>
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "15px",
                  fontWeight: "500",
                  color: "#1e293b",
                }}
              >
                {POST_TRAINING.question}
              </p>
              <div style={{ display: "flex", gap: "2px" }}>
                {POST_TRAINING.options.map((opt, i) => (
                  <EmojiOption
                    key={opt.value}
                    option={opt}
                    selected={updateValue}
                    onSelect={setUpdateValue}
                    animDelay={i * 50}
                  />
                ))}
              </div>
              {updateValue && (
                <button
                  onClick={handleSaveUpdate}
                  style={{
                    width: "100%",
                    marginTop: "14px",
                    padding: "12px",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#fff",
                    cursor: "pointer",
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    animation: "fadeSlideUp 0.2s ease forwards",
                    opacity: 0,
                  }}
                >
                  Save update
                </button>
              )}
            </div>
          </div>
        )}

        {saved && updateSaved && (
          <div
            style={{
              marginTop: "20px",
              background: "#f0fdf4",
              borderRadius: "16px",
              padding: "16px",
              border: "1.5px solid #bbf7d0",
              textAlign: "center",
              animation: "fadeSlideUp 0.3s ease forwards",
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: "#166534", fontWeight: "500" }}>
              Session rating saved ✓
            </p>
          </div>
        )}

        {/* Body weight — minimal, optional */}
        {!saved && (
          <div
            style={{
              marginTop: "24px",
              padding: "14px 16px",
              background: "#f8fafc",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: 0,
              animation: "fadeSlideUp 0.4s ease forwards",
              animationDelay: "400ms",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                color: "#64748b",
                fontWeight: "500",
              }}
            >
              Body weight
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="number"
                placeholder="—"
                style={{
                  width: "56px",
                  padding: "6px 8px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#334155",
                  background: "#fff",
                  textAlign: "center",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#94a3b8")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>lbs</span>
            </div>
          </div>
        )}

        {/* Reset for demo */}
        {saved && (
          <button
            onClick={handleReset}
            style={{
              marginTop: "32px",
              background: "none",
              border: "1.5px dashed #e2e8f0",
              borderRadius: "12px",
              padding: "10px 20px",
              fontSize: "13px",
              color: "#94a3b8",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: "500",
              width: "100%",
              animation: "fadeSlideUp 0.3s ease forwards",
              opacity: 0,
              animationDelay: "400ms",
            }}
          >
            ↻ Reset demo
          </button>
        )}

        <div style={{ height: "60px" }} />
      </div>
    </div>
  );
}
