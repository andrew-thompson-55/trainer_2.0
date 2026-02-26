import React, { useState } from 'react';
import { COLORS, FONT, SPACING, RADIUS } from '@features/web-dashboard/styles';

interface TemplateDialogProps {
  templateName: string;
  targetDate: string;
  onConfirm: (detailLevel: 'full' | 'structure', clearExisting: boolean) => void;
  onCancel: () => void;
}

export function TemplateDialog({
  templateName,
  targetDate,
  onConfirm,
  onCancel,
}: TemplateDialogProps) {
  const [clearExisting, setClearExisting] = useState(false);

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={e => e.stopPropagation()}>
        <h3 style={styles.title}>Apply Template</h3>
        <p style={styles.description}>
          Apply <strong>{templateName}</strong> starting {targetDate}?
        </p>

        <label style={styles.checkLabel}>
          <input
            type="checkbox"
            checked={clearExisting}
            onChange={e => setClearExisting(e.target.checked)}
          />
          <span style={styles.checkText}>Clear existing workouts first</span>
        </label>

        <div style={styles.buttons}>
          <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button
            style={styles.structureBtn}
            onClick={() => onConfirm('structure', clearExisting)}
          >
            Structure Only
          </button>
          <button
            style={styles.fullBtn}
            onClick={() => onConfirm('full', clearExisting)}
          >
            Full Detail
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    border: `1px solid ${COLORS.border}`,
    padding: SPACING.lg,
    maxWidth: 420,
    width: '90%',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.text,
    fontFamily: FONT.sans,
  },
  description: {
    margin: '0 0 16px',
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONT.sans,
    lineHeight: '1.5',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    cursor: 'pointer',
  },
  checkText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONT.sans,
  },
  buttons: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    background: 'none',
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.textMuted,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: FONT.mono,
  },
  structureBtn: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: FONT.mono,
  },
  fullBtn: {
    background: COLORS.accent,
    border: 'none',
    borderRadius: RADIUS.sm,
    color: '#fff',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: FONT.mono,
  },
};
