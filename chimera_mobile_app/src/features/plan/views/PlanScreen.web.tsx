// PlanScreen.web.tsx - Unified Training Plan Page
// Drag-drop calendar grid with phases, templates, and agent action logging
// Uses HTML/React DOM for best dnd-kit compatibility (Principle 5)

import React, { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { format, addWeeks, parseISO } from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { COLORS, FONT, SPACING } from '@features/web-dashboard/styles';
import { useTrainingPlan } from '../hooks/useTrainingPlan';
import { PlanHeader } from '../components/PlanHeader';
import { PhaseBarArea } from '../components/PhaseBar';
import { WeekRow } from '../components/WeekRow';
import { TrashZone } from '../components/TrashZone';
import { SidePanel } from '../components/SidePanel';
import { TemplateDialog } from '../components/TemplateDialog';
import { ImportModal } from '../components/ImportModal';
import { authFetch } from '@infra/fetch/auth-fetch';
import type { Workout } from '@domain/types';
import type { TrainingPhase } from '@domain/types/plan';

export default function PlanScreen() {
  const router = useRouter();
  const plan = useTrainingPlan();

  const [isDragging, setIsDragging] = useState(false);
  const [sidePanelMode, setSidePanelMode] = useState<'templates' | 'agent-log' | null>(null);
  const [templateDialog, setTemplateDialog] = useState<{
    templateId: string;
    templateName: string;
    targetDate: string;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // --- Toast helper ---
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // --- Drag handlers ---
  const handleDragStart = useCallback((_event: DragStartEvent) => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || !active.data.current) return;

    const source = active.data.current;
    const dest = over.data.current;
    if (!dest) return;

    // Workout dropped on trash
    if (dest.type === 'trash' && source.type === 'workout') {
      const workout = source.workout as Workout;
      try {
        await plan.deleteWorkout(workout.id);
        showToast(`Deleted "${workout.title}"`);
      } catch {
        showToast('Failed to delete workout');
      }
      return;
    }

    // Workout dropped on a day cell
    if (dest.type === 'day' && source.type === 'workout') {
      const workout = source.workout as Workout;
      const newDate = dest.dateKey as string;
      const currentDate = format(new Date(workout.start_time), 'yyyy-MM-dd');
      if (currentDate === newDate) return; // same day, no-op

      // Check if Alt/Option held for duplicate
      const altHeld = (event.activatorEvent as PointerEvent)?.altKey;

      try {
        if (altHeld) {
          await plan.duplicateWorkout(workout.id, newDate);
          showToast(`Duplicated "${workout.title}" to ${newDate}`);
        } else {
          await plan.moveWorkout(workout.id, newDate);
          showToast(`Moved "${workout.title}" to ${newDate}`);
        }
      } catch {
        showToast('Failed to update workout');
      }
      return;
    }
  }, [plan, showToast]);

  // --- Workout context actions ---
  const handleEditWorkout = useCallback((workout: Workout) => {
    router.push({ pathname: '/edit_workout', params: { id: workout.id } });
  }, [router]);

  const handleDuplicateWorkout = useCallback(async (workout: Workout) => {
    const targetDate = window.prompt('Duplicate to which date? (YYYY-MM-DD)');
    if (!targetDate) return;
    try {
      await plan.duplicateWorkout(workout.id, targetDate);
      showToast(`Duplicated "${workout.title}"`);
    } catch {
      showToast('Failed to duplicate');
    }
  }, [plan, showToast]);

  const handleDeleteWorkout = useCallback(async (workout: Workout) => {
    try {
      await plan.deleteWorkout(workout.id);
      showToast(`Deleted "${workout.title}"`);
    } catch {
      showToast('Failed to delete');
    }
  }, [plan, showToast]);

  const handleAddWorkout = useCallback((date: string) => {
    router.push({ pathname: '/add_workout', params: { date } });
  }, [router]);

  // --- Week actions ---
  const handleDuplicateWeek = useCallback(async (weekStart: string) => {
    const target = window.prompt('Duplicate to which week start? (YYYY-MM-DD, Monday)');
    if (!target) return;
    try {
      await plan.duplicateWeek(weekStart, target);
      showToast('Week duplicated');
    } catch {
      showToast('Failed to duplicate week');
    }
  }, [plan, showToast]);

  const handleClearWeek = useCallback(async (weekStart: string) => {
    if (!window.confirm(`Clear all workouts for week of ${weekStart}?`)) return;
    try {
      await plan.clearWeek(weekStart);
      showToast('Week cleared');
    } catch {
      showToast('Failed to clear week');
    }
  }, [plan, showToast]);

  const handleSaveTemplate = useCallback(async (weekStart: string) => {
    const title = window.prompt('Template name:');
    if (!title) return;
    try {
      await plan.saveWeekAsTemplate(weekStart, title);
      showToast(`Saved template "${title}"`);
    } catch {
      showToast('Failed to save template');
    }
  }, [plan, showToast]);

  // --- Phase actions ---
  const handleEditPhase = useCallback((phase: TrainingPhase) => {
    const newTitle = window.prompt('Phase title:', phase.title);
    if (!newTitle || newTitle === phase.title) return;
    plan.updatePhase(phase.id, { title: newTitle }).catch(() => showToast('Failed to update phase'));
  }, [plan, showToast]);

  const handleDeletePhase = useCallback(async (phase: TrainingPhase) => {
    if (!window.confirm(`Delete phase "${phase.title}"?`)) return;
    try {
      await plan.deletePhase(phase.id);
      showToast('Phase deleted');
    } catch {
      showToast('Failed to delete phase');
    }
  }, [plan, showToast]);

  // --- Template actions ---
  const handleApplyTemplate = useCallback((templateId: string) => {
    const tmpl = plan.templates.find(t => t.id === templateId);
    if (!tmpl) return;
    const startDate = window.prompt('Apply starting on? (YYYY-MM-DD)');
    if (!startDate) return;
    setTemplateDialog({
      templateId,
      templateName: tmpl.title,
      targetDate: startDate,
    });
  }, [plan.templates]);

  const handleTemplateConfirm = useCallback(async (
    detailLevel: 'full' | 'structure',
    clearExisting: boolean
  ) => {
    if (!templateDialog) return;
    try {
      if (clearExisting) {
        await plan.clearWeek(templateDialog.targetDate);
      }
      await plan.applyTemplate(templateDialog.templateId, templateDialog.targetDate, detailLevel);
      showToast('Template applied');
    } catch {
      showToast('Failed to apply template');
    }
    setTemplateDialog(null);
  }, [templateDialog, plan, showToast]);

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      const { deleteTemplate } = await import('@domain/api/plan');
      const { authFetch } = await import('@infra/fetch/auth-fetch');
      await deleteTemplate(authFetch, templateId);
      await plan.refreshTemplates();
      showToast('Template deleted');
    } catch {
      showToast('Failed to delete template');
    }
  }, [plan, showToast]);

  // --- Import ---
  const handleImportSuccess = useCallback(async (firstDate: string | null) => {
    await plan.refreshData();
    if (firstDate) {
      plan.navigateToDate(parseISO(firstDate));
    }
    showToast('Plan imported successfully');
  }, [plan, showToast]);

  // --- Side panel ---
  const toggleTemplates = useCallback(() => {
    setSidePanelMode(prev => prev === 'templates' ? null : 'templates');
  }, []);

  const toggleAgentLog = useCallback(() => {
    setSidePanelMode(prev => prev === 'agent-log' ? null : 'agent-log');
  }, []);

  // Phase bar area sizing
  const totalDays = plan.weeks.length * 7;

  return (
    <div style={styles.container}>
      <PlanHeader
        currentStartDate={plan.currentStartDate}
        onNavigateWeeks={plan.navigateWeeks}
        onGoToToday={plan.goToToday}
        onAddWorkout={() => router.push('/add_workout')}
        onImport={() => setShowImportModal(true)}
        showTemplates={sidePanelMode === 'templates'}
        onToggleTemplates={toggleTemplates}
        showAgentLog={sidePanelMode === 'agent-log'}
        onToggleAgentLog={toggleAgentLog}
      />

      <div style={styles.body}>
        <div style={styles.main}>
          {/* Phase bars */}
          <PhaseBarArea
            phases={plan.phases}
            viewStartDate={plan.currentStartDate}
            totalDays={totalDays}
            onEditPhase={handleEditPhase}
            onDeletePhase={handleDeletePhase}
          />

          {/* Calendar grid */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div style={styles.grid}>
              {plan.weeks.map(week => (
                <WeekRow
                  key={week.weekKey}
                  week={week}
                  onEditWorkout={handleEditWorkout}
                  onDuplicateWorkout={handleDuplicateWorkout}
                  onDeleteWorkout={handleDeleteWorkout}
                  onAddWorkout={handleAddWorkout}
                  onDuplicateWeek={handleDuplicateWeek}
                  onClearWeek={handleClearWeek}
                  onSaveTemplate={handleSaveTemplate}
                />
              ))}
            </div>

            <TrashZone active={isDragging} />
          </DndContext>

          {/* Loading / Error */}
          {plan.loading && (
            <div style={styles.loading}>Loading...</div>
          )}
          {plan.error && (
            <div style={styles.error}>{plan.error}</div>
          )}
        </div>

        {/* Side panel */}
        <SidePanel
          mode={sidePanelMode}
          templates={plan.templates}
          agentActions={plan.agentActions}
          onClose={() => setSidePanelMode(null)}
          onDeleteTemplate={handleDeleteTemplate}
          onApplyTemplate={handleApplyTemplate}
          onRevertAction={async (id) => {
            try {
              await plan.revertAgentAction(id);
              showToast('Action reverted');
            } catch {
              showToast('Failed to revert');
            }
          }}
        />
      </div>

      {/* Import modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
          authFetch={authFetch}
        />
      )}

      {/* Template application dialog */}
      {templateDialog && (
        <TemplateDialog
          templateName={templateDialog.templateName}
          targetDate={templateDialog.targetDate}
          onConfirm={handleTemplateConfirm}
          onCancel={() => setTemplateDialog(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontFamily: FONT.sans,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: SPACING.md,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
  },
  loading: {
    textAlign: 'center' as const,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
    fontSize: 13,
    padding: SPACING.xl,
  },
  error: {
    textAlign: 'center' as const,
    color: COLORS.red,
    fontFamily: FONT.mono,
    fontSize: 13,
    padding: SPACING.xl,
  },
  toast: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: '10px 20px',
    color: COLORS.text,
    fontFamily: FONT.mono,
    fontSize: 13,
    zIndex: 300,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
};
