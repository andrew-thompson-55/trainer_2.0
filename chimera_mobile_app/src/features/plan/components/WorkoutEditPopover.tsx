// WorkoutEditPopover - Portal-based popover for editing workout details inline
// Anchored to the clicked WorkoutCard, positioned smartly relative to viewport

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { COLORS, FONT, RADIUS, SPACING } from '@features/web-dashboard/styles';
import type { Workout, ActivityType, WorkoutStatus } from '@domain/types';

const POPOVER_WIDTH = 320;
const ACTIVITY_TYPES: ActivityType[] = ['run', 'bike', 'swim', 'strength', 'other'];
const STATUS_OPTIONS: WorkoutStatus[] = ['planned', 'completed', 'missed', 'tentative', 'cancelled'];

interface WorkoutEditPopoverProps {
  workout: Workout;
  anchorRect: DOMRect;
  onSave: (workoutId: string, updates: Partial<Workout>) => Promise<void>;
  onDelete: (workoutId: string) => Promise<void>;
  onClose: () => void;
}

export function WorkoutEditPopover({
  workout,
  anchorRect,
  onSave,
  onDelete,
  onClose,
}: WorkoutEditPopoverProps) {
  const [title, setTitle] = useState(workout.title);
  const [activityType, setActivityType] = useState<ActivityType>(workout.activity_type);
  const [date, setDate] = useState(format(parseISO(workout.start_time), 'yyyy-MM-dd'));
  const [duration, setDuration] = useState(() => {
    if (!workout.start_time || !workout.end_time) return '';
    const mins = Math.round(
      (parseISO(workout.end_time).getTime() - parseISO(workout.start_time).getTime()) / 60000
    );
    return String(mins);
  });
  const [status, setStatus] = useState<WorkoutStatus>(workout.status);
  const [notes, setNotes] = useState(workout.description || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [discardConfirm, setDiscardConfirm] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  // Check if form is dirty
  const isDirty = useCallback(() => {
    return (
      title !== workout.title ||
      activityType !== workout.activity_type ||
      date !== format(parseISO(workout.start_time), 'yyyy-MM-dd') ||
      status !== workout.status ||
      notes !== (workout.description || '')
    );
  }, [title, activityType, date, status, notes, workout]);

  // Close handler with dirty check
  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    if (isDirty() && !discardConfirm) {
      setDiscardConfirm(true);
      return;
    }
    closingRef.current = true;
    onClose();
  }, [isDirty, discardConfirm, onClose]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [handleClose]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleClose]);

  // Position calculation
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const preferRight = anchorRect.right + POPOVER_WIDTH + 12 <= viewportW;
  const left = preferRight
    ? anchorRect.right + 8
    : anchorRect.left - POPOVER_WIDTH - 8;

  // Vertical: try to align top with anchor, but don't overflow bottom
  let top = anchorRect.top;
  const estimatedHeight = 420;
  if (top + estimatedHeight > viewportH - 16) {
    top = Math.max(16, viewportH - estimatedHeight - 16);
  }

  // Arrow direction
  const arrowSide = preferRight ? 'left' : 'right';
  const arrowTop = Math.min(
    Math.max(anchorRect.top + anchorRect.height / 2 - top, 12),
    estimatedHeight - 12
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updates: Partial<Workout> = {};
      if (title !== workout.title) updates.title = title;
      if (activityType !== workout.activity_type) updates.activity_type = activityType;
      if (status !== workout.status) updates.status = status;
      if (notes !== (workout.description || '')) updates.description = notes || null;

      // Handle date change
      const originalDate = format(parseISO(workout.start_time), 'yyyy-MM-dd');
      if (date !== originalDate) {
        const oldStart = parseISO(workout.start_time);
        const [y, m, d] = date.split('-').map(Number);
        const newStart = new Date(oldStart);
        newStart.setFullYear(y, m - 1, d);
        const diff = newStart.getTime() - oldStart.getTime();
        const newEnd = new Date(parseISO(workout.end_time).getTime() + diff);
        updates.start_time = newStart.toISOString();
        updates.end_time = newEnd.toISOString();
      }

      // Handle duration change
      if (duration) {
        const newDurationMs = parseInt(duration) * 60000;
        const start = updates.start_time ? parseISO(updates.start_time) : parseISO(workout.start_time);
        updates.end_time = new Date(start.getTime() + newDurationMs).toISOString();
      }

      if (Object.keys(updates).length > 0) {
        await onSave(workout.id, updates);
      }
      onClose();
    } catch (e) {
      console.error('Failed to save workout:', e);
    } finally {
      setSaving(false);
    }
  }, [title, activityType, date, duration, status, notes, workout, onSave, onClose]);

  const handleDelete = useCallback(async () => {
    setSaving(true);
    try {
      await onDelete(workout.id);
      onClose();
    } catch (e) {
      console.error('Failed to delete workout:', e);
    } finally {
      setSaving(false);
    }
  }, [workout.id, onDelete, onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        ...styles.popover,
        left,
        top,
      }}
    >
      {/* Arrow */}
      <div style={{
        ...styles.arrow,
        [arrowSide]: -6,
        top: arrowTop,
        borderColor: arrowSide === 'left'
          ? 'transparent #1e293b transparent transparent'
          : 'transparent transparent transparent #1e293b',
      }} />

      {/* Discard confirmation overlay */}
      {discardConfirm && (
        <div style={styles.discardOverlay}>
          <span style={styles.discardText}>Discard changes?</span>
          <div style={styles.discardButtons}>
            <button style={styles.discardYes} onClick={() => { closingRef.current = true; onClose(); }}>Discard</button>
            <button style={styles.discardNo} onClick={() => setDiscardConfirm(false)}>Keep Editing</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Edit Workout</span>
        <button style={styles.closeBtn} onClick={handleClose}>&times;</button>
      </div>

      {/* Form */}
      <div style={styles.form}>
        <label style={styles.label}>Title</label>
        <input
          style={styles.input}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Workout title"
        />

        <label style={styles.label}>Type</label>
        <select
          style={styles.select}
          value={activityType}
          onChange={e => setActivityType(e.target.value as ActivityType)}
        >
          {ACTIVITY_TYPES.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        <label style={styles.label}>Date</label>
        <input
          style={styles.input}
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        <div style={styles.row}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Duration</label>
            <div style={styles.durationWrap}>
              <input
                style={{ ...styles.input, flex: 1 }}
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="60"
                min="0"
              />
              <span style={styles.durationUnit}>min</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Status</label>
            <select
              style={styles.select}
              value={status}
              onChange={e => setStatus(e.target.value as WorkoutStatus)}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <label style={styles.label}>Notes</label>
        <textarea
          style={styles.textarea}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Workout notes..."
        />
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {confirmDelete ? (
          <div style={styles.deleteConfirm}>
            <span style={styles.deleteConfirmText}>Delete this workout?</span>
            <button style={styles.deleteYes} onClick={handleDelete} disabled={saving}>Yes</button>
            <button style={styles.deleteNo} onClick={() => setConfirmDelete(false)}>No</button>
          </div>
        ) : (
          <button
            style={styles.deleteBtn}
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
          >
            Delete
          </button>
        )}
        <button
          style={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !isDirty()}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>,
    document.body
  );
}

const styles: Record<string, React.CSSProperties> = {
  popover: {
    position: 'fixed',
    width: POPOVER_WIDTH,
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    backgroundColor: '#111827',
    border: `1px solid #1e293b`,
    borderRadius: RADIUS.md,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: FONT.sans,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderWidth: 6,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.text,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.textDim,
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  form: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    padding: '6px 8px',
    fontSize: 13,
    fontFamily: FONT.sans,
    outline: 'none',
    colorScheme: 'dark',
  },
  select: {
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    padding: '6px 8px',
    fontSize: 13,
    fontFamily: FONT.sans,
    outline: 'none',
    cursor: 'pointer',
    colorScheme: 'dark',
  },
  textarea: {
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    padding: '6px 8px',
    fontSize: 13,
    fontFamily: FONT.sans,
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: 60,
    colorScheme: 'dark',
  },
  row: {
    display: 'flex',
    gap: 8,
  },
  durationWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  durationUnit: {
    fontSize: 12,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderTop: `1px solid ${COLORS.border}`,
    gap: 8,
  },
  deleteBtn: {
    background: 'none',
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.red,
    padding: '6px 12px',
    fontSize: 12,
    fontFamily: FONT.mono,
    cursor: 'pointer',
  },
  deleteConfirm: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  deleteConfirmText: {
    fontSize: 12,
    color: COLORS.red,
    fontFamily: FONT.mono,
  },
  deleteYes: {
    background: COLORS.red,
    border: 'none',
    borderRadius: RADIUS.sm,
    color: '#fff',
    padding: '4px 10px',
    fontSize: 12,
    fontFamily: FONT.mono,
    cursor: 'pointer',
  },
  deleteNo: {
    background: 'none',
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.textMuted,
    padding: '4px 10px',
    fontSize: 12,
    fontFamily: FONT.mono,
    cursor: 'pointer',
  },
  saveBtn: {
    background: COLORS.accent,
    border: 'none',
    borderRadius: RADIUS.sm,
    color: '#fff',
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: FONT.mono,
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  discardOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: RADIUS.md,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: 12,
  },
  discardText: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.text,
  },
  discardButtons: {
    display: 'flex',
    gap: 8,
  },
  discardYes: {
    background: COLORS.red,
    border: 'none',
    borderRadius: RADIUS.sm,
    color: '#fff',
    padding: '6px 14px',
    fontSize: 13,
    fontFamily: FONT.mono,
    cursor: 'pointer',
  },
  discardNo: {
    background: 'none',
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    padding: '6px 14px',
    fontSize: 13,
    fontFamily: FONT.mono,
    cursor: 'pointer',
  },
};
