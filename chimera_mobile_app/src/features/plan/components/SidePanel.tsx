import React from 'react';
import { format, parseISO } from 'date-fns';
import { COLORS, FONT, SPACING, RADIUS } from '@features/web-dashboard/styles';
import type { PlanTemplate, AgentAction } from '@domain/types/plan';

interface SidePanelProps {
  mode: 'templates' | 'agent-log' | null;
  templates: PlanTemplate[];
  agentActions: AgentAction[];
  onClose: () => void;
  onDeleteTemplate: (templateId: string) => void;
  onApplyTemplate: (templateId: string) => void;
  onRevertAction: (actionId: string) => void;
}

export function SidePanel({
  mode,
  templates,
  agentActions,
  onClose,
  onDeleteTemplate,
  onApplyTemplate,
  onRevertAction,
}: SidePanelProps) {
  if (!mode) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>
          {mode === 'templates' ? 'Templates' : 'Agent Actions'}
        </span>
        <button style={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      <div style={styles.content}>
        {mode === 'templates' && (
          <TemplateList
            templates={templates}
            onDelete={onDeleteTemplate}
            onApply={onApplyTemplate}
          />
        )}
        {mode === 'agent-log' && (
          <AgentActionLog
            actions={agentActions}
            onRevert={onRevertAction}
          />
        )}
      </div>
    </div>
  );
}

function TemplateList({
  templates,
  onDelete,
  onApply,
}: {
  templates: PlanTemplate[];
  onDelete: (id: string) => void;
  onApply: (id: string) => void;
}) {
  const grouped = {
    workout: templates.filter(t => t.template_type === 'workout'),
    week: templates.filter(t => t.template_type === 'week'),
    phase: templates.filter(t => t.template_type === 'phase'),
  };

  if (templates.length === 0) {
    return <div style={styles.empty}>No templates saved yet. Right-click a week to save one.</div>;
  }

  return (
    <div>
      {(['week', 'workout', 'phase'] as const).map(type => {
        const items = grouped[type];
        if (!items.length) return null;
        return (
          <div key={type} style={styles.group}>
            <div style={styles.groupTitle}>{type} templates</div>
            {items.map(t => (
              <div key={t.id} style={styles.templateCard}>
                <div style={styles.templateTitle}>{t.title}</div>
                <div style={styles.templateMeta}>
                  {t.tags?.length ? t.tags.join(', ') : t.template_type}
                </div>
                <div style={styles.templateActions}>
                  <button
                    style={styles.applyBtn}
                    onClick={() => onApply(t.id)}
                  >
                    Apply
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => onDelete(t.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AgentActionLog({
  actions,
  onRevert,
}: {
  actions: AgentAction[];
  onRevert: (id: string) => void;
}) {
  if (actions.length === 0) {
    return <div style={styles.empty}>No agent actions logged yet.</div>;
  }

  return (
    <div>
      {actions.map(action => (
        <div key={action.id} style={styles.actionCard}>
          <div style={styles.actionDesc}>{action.description}</div>
          <div style={styles.actionMeta}>
            {format(parseISO(action.created_at), 'MMM d, h:mm a')}
          </div>
          {action.reverted ? (
            <span style={styles.reverted}>Reverted</span>
          ) : (
            <button
              style={styles.undoBtn}
              onClick={() => onRevert(action.id)}
            >
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 280,
    flexShrink: 0,
    borderLeft: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.surface,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.text,
    fontFamily: FONT.mono,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.textDim,
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: SPACING.sm,
  },
  empty: {
    color: COLORS.textDim,
    fontSize: 12,
    fontFamily: FONT.mono,
    textAlign: 'center' as const,
    padding: SPACING.lg,
    lineHeight: '1.5',
  },
  group: {
    marginBottom: SPACING.md,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: SPACING.xs,
    padding: '0 4px',
  },
  templateCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: 4,
    border: `1px solid ${COLORS.border}`,
  },
  templateTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.text,
    fontFamily: FONT.sans,
    marginBottom: 2,
  },
  templateMeta: {
    fontSize: 10,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    marginBottom: SPACING.xs,
  },
  templateActions: {
    display: 'flex',
    gap: 4,
  },
  applyBtn: {
    background: COLORS.accentDim,
    border: `1px solid ${COLORS.accent}40`,
    borderRadius: 4,
    color: COLORS.accent,
    fontSize: 10,
    fontFamily: FONT.mono,
    padding: '2px 8px',
    cursor: 'pointer',
  },
  deleteBtn: {
    background: 'none',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    color: COLORS.textDim,
    fontSize: 10,
    fontFamily: FONT.mono,
    padding: '2px 8px',
    cursor: 'pointer',
  },
  actionCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: 4,
    border: `1px solid ${COLORS.border}`,
  },
  actionDesc: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: FONT.sans,
    marginBottom: 2,
    lineHeight: '1.4',
  },
  actionMeta: {
    fontSize: 10,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    marginBottom: 4,
  },
  reverted: {
    fontSize: 10,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    fontStyle: 'italic' as const,
  },
  undoBtn: {
    background: `${COLORS.orange}20`,
    border: `1px solid ${COLORS.orange}40`,
    borderRadius: 4,
    color: COLORS.orange,
    fontSize: 10,
    fontFamily: FONT.mono,
    padding: '2px 8px',
    cursor: 'pointer',
  },
};
