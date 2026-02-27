/**
 * ImportModal - Paste/upload training plan data, preview, and import.
 * 3-state machine: input -> preview -> result
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { COLORS, FONT, SPACING, RADIUS, ACTIVITY_COLORS } from '@features/web-dashboard/styles';
import { parseImportData, type ImportPreview } from '../utils/import-parser';
import type { FetchFn } from '@domain/api/client';
import * as planApi from '@domain/api/plan';

type ModalState = 'input' | 'preview' | 'result';

interface ImportResult {
  success: boolean;
  imported: number;
  phasesCreated: number;
  skipped: number;
  error?: string;
}

interface ImportModalProps {
  onClose: () => void;
  onSuccess: (firstDate: string | null) => void;
  authFetch: FetchFn;
}

export function ImportModal({ onClose, onSuccess, authFetch }: ImportModalProps) {
  const [state, setState] = useState<ModalState>('input');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [autoCreatePhases, setAutoCreatePhases] = useState(true);
  const [distanceUnit, setDistanceUnit] = useState<'mi' | 'km'>('mi');
  const [conflictCount, setConflictCount] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Escape to close ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // --- Focus trap ---
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', handler);
    return () => dialog.removeEventListener('keydown', handler);
  }, [state]);

  // --- Parse raw text (debounced) ---
  const tryParse = useCallback((text: string) => {
    if (!text.trim()) {
      setPreview(null);
      setParseError(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const result = parseImportData(parsed);
      if (result.parseErrors.length > 0 && result.entries.length === 0) {
        setParseError(result.parseErrors.join('; '));
        setPreview(null);
      } else {
        setPreview(result);
        setParseError(result.parseErrors.length > 0 ? result.parseErrors.join('; ') : null);
      }
    } catch {
      setParseError('Invalid JSON');
      setPreview(null);
    }
  }, []);

  const handleTextChange = useCallback((text: string) => {
    setRawText(text);
    setFileName(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => tryParse(text), 300);
  }, [tryParse]);

  // --- File handling ---
  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'json') {
        const text = await file.text();
        setRawText(text);
        tryParse(text);
      } else if (ext === 'csv') {
        const text = await file.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            const data = results.data as Record<string, unknown>[];
            const p = parseImportData(data);
            setPreview(p);
            setParseError(p.parseErrors.length > 0 ? p.parseErrors.join('; ') : null);
            setRawText(JSON.stringify(data, null, 2));
          },
          error: (err: Error) => {
            setParseError(`CSV parse error: ${err.message}`);
          },
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];
        const p = parseImportData(data);
        setPreview(p);
        setParseError(p.parseErrors.length > 0 ? p.parseErrors.join('; ') : null);
        setRawText(JSON.stringify(data, null, 2));
      } else {
        setParseError(`Unsupported file type: .${ext}`);
      }
    } catch (e: any) {
      setParseError(`File read error: ${e.message}`);
    }
  }, [tryParse]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  // --- Conflict check ---
  const checkConflicts = useCallback(async (dateRange: { start: string; end: string }) => {
    try {
      const res = await authFetch(
        `/workouts?start_date=${dateRange.start}T00:00:00&end_date=${dateRange.end}T23:59:59`
      );
      if (res.ok) {
        const data = await res.json();
        setConflictCount(Array.isArray(data) ? data.length : 0);
      }
    } catch {
      // Non-critical, ignore
    }
  }, [authFetch]);

  // --- Transition to preview ---
  const goToPreview = useCallback(() => {
    if (!preview || preview.entries.length === 0) return;
    setState('preview');
    if (preview.dateRange) {
      checkConflicts(preview.dateRange);
    }
  }, [preview, checkConflicts]);

  // --- Import ---
  const handleImport = useCallback(async () => {
    if (!preview) return;
    setImporting(true);

    try {
      const entries = preview.entries.map((e) => {
        const entry: Record<string, unknown> = {
          date: e.date,
          title: e.title,
          activity_type: e.activity_type,
        };
        if (e.duration !== undefined) entry.duration = e.duration;
        if (e.description) entry.description = e.description;
        if (e.status) entry.status = e.status;
        if (autoCreatePhases && e.phase) entry.phase = e.phase;
        if (e.distance !== undefined) entry.distance = e.distance;
        return entry;
      });

      const payload: Record<string, unknown> = { entries };
      if (preview.hasDistances) payload.distance_unit = distanceUnit;

      const res = await planApi.importPlan(authFetch, payload);

      setResult({
        success: true,
        imported: res.imported ?? 0,
        phasesCreated: res.phases_created ?? 0,
        skipped: res.skipped?.length ?? 0,
      });
      setState('result');
    } catch (e: any) {
      setResult({
        success: false,
        imported: 0,
        phasesCreated: 0,
        skipped: 0,
        error: e.message || 'Import failed',
      });
      setState('result');
    } finally {
      setImporting(false);
    }
  }, [preview, autoCreatePhases, distanceUnit, authFetch]);

  // --- Handle close after success ---
  const handleDone = useCallback(() => {
    if (result?.success) {
      onSuccess(preview?.dateRange?.start ?? null);
    }
    onClose();
  }, [result, preview, onSuccess, onClose]);

  // --- Render ---
  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div
        ref={dialogRef}
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <h3 id="import-modal-title" style={styles.title}>Import Training Plan</h3>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Input state */}
        {state === 'input' && (
          <div style={styles.body}>
            <p style={styles.hint}>
              Paste JSON or upload a .json, .csv, or .xlsx file
            </p>

            {/* File drop zone */}
            <div
              style={{
                ...styles.dropZone,
                ...(dragOver ? styles.dropZoneActive : {}),
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {fileName ? (
                <div style={styles.fileBadge}>
                  <span>{fileName}</span>
                  <button
                    style={styles.fileClearBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileName(null);
                      setPreview(null);
                      setRawText('');
                    }}
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <span style={styles.dropText}>
                  Drop file here or click to browse
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              style={styles.textarea}
              placeholder='[{"date": "2026-03-02", "title": "Easy Run", "duration": 45}, ...]'
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              spellCheck={false}
            />

            {/* Parse error */}
            {parseError && (
              <div style={styles.parseError}>{parseError}</div>
            )}

            {/* Quick preview summary */}
            {preview && preview.entries.length > 0 && (
              <div style={styles.quickPreview}>
                {preview.workoutCount} workout{preview.workoutCount !== 1 ? 's' : ''} found
                {preview.phaseCount > 0 && ` across ${preview.phaseCount} phase${preview.phaseCount !== 1 ? 's' : ''}`}
                {preview.dateRange && ` (${preview.dateRange.start} to ${preview.dateRange.end})`}
              </div>
            )}

            {/* Footer */}
            <div style={styles.footer}>
              <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button
                style={{
                  ...styles.primaryBtn,
                  ...((!preview || preview.entries.length === 0) ? styles.disabledBtn : {}),
                }}
                disabled={!preview || preview.entries.length === 0}
                onClick={goToPreview}
              >
                Preview
              </button>
            </div>
          </div>
        )}

        {/* Preview state */}
        {state === 'preview' && preview && (
          <div style={styles.body}>
            {/* File badge */}
            {fileName && (
              <div style={styles.fileBadgeSmall}>
                {fileName}
                <button
                  style={styles.fileClearBtn}
                  onClick={() => {
                    setState('input');
                    setFileName(null);
                    setPreview(null);
                    setRawText('');
                  }}
                >
                  &times;
                </button>
              </div>
            )}

            {/* Summary */}
            <div style={styles.summary}>
              <strong>{preview.workoutCount}</strong> workout{preview.workoutCount !== 1 ? 's' : ''}
              {preview.dateRange && (
                <span style={styles.summaryMuted}>
                  {' '}from {preview.dateRange.start} to {preview.dateRange.end}
                </span>
              )}
            </div>

            {/* Phases */}
            {preview.phases.length > 0 && (
              <div style={styles.phaseList}>
                {preview.phases.map((p, i) => (
                  <div key={i} style={styles.phaseItem}>
                    <span style={{ ...styles.phaseDot, backgroundColor: PHASE_COLORS[i % PHASE_COLORS.length] }} />
                    <span style={styles.phaseTitle}>{p.title}</span>
                    <span style={styles.phaseMeta}>
                      {p.count} workout{p.count !== 1 ? 's' : ''} ({p.startDate} - {p.endDate})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Workout preview table */}
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Duration</th>
                    {preview.phases.length > 0 && <th style={styles.th}>Phase</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.entries.map((entry, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.td}>{entry.date}</td>
                      <td style={styles.td}>{entry.title}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typeBadge,
                          backgroundColor: (ACTIVITY_COLORS[entry.activity_type] ?? ACTIVITY_COLORS.default) + '22',
                          color: ACTIVITY_COLORS[entry.activity_type] ?? ACTIVITY_COLORS.default,
                        }}>
                          {entry.activity_type}
                        </span>
                      </td>
                      <td style={styles.td}>{entry.duration ? `${entry.duration}m` : '-'}</td>
                      {preview.phases.length > 0 && (
                        <td style={styles.td}>{entry.phase ?? '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Parse warnings */}
            {preview.parseErrors.length > 0 && (
              <div style={styles.warnings}>
                {preview.parseErrors.map((err, i) => (
                  <div key={i} style={styles.warningLine}>{err}</div>
                ))}
              </div>
            )}

            {/* Options */}
            <div style={styles.options}>
              {preview.phases.length > 0 && (
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={autoCreatePhases}
                    onChange={(e) => setAutoCreatePhases(e.target.checked)}
                  />
                  <span style={styles.checkText}>Auto-create phases</span>
                </label>
              )}

              {preview.hasDistances && (
                <label style={styles.checkLabel}>
                  <span style={styles.checkText}>Distance unit:</span>
                  <select
                    value={distanceUnit}
                    onChange={(e) => setDistanceUnit(e.target.value as 'mi' | 'km')}
                    style={styles.select}
                  >
                    <option value="mi">Miles</option>
                    <option value="km">Kilometers</option>
                  </select>
                </label>
              )}
            </div>

            {/* Conflict warning */}
            {conflictCount !== null && conflictCount > 0 && (
              <div style={styles.conflictWarning}>
                {conflictCount} existing workout{conflictCount !== 1 ? 's' : ''} in this date range.
                Duplicates will be skipped automatically.
              </div>
            )}

            {/* Footer */}
            <div style={styles.footer}>
              <button style={styles.cancelBtn} onClick={() => setState('input')}>
                Back
              </button>
              <button
                style={{
                  ...styles.primaryBtn,
                  ...(importing ? styles.disabledBtn : {}),
                }}
                disabled={importing}
                onClick={handleImport}
              >
                {importing ? 'Importing...' : `Import ${preview.workoutCount} Workout${preview.workoutCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Result state */}
        {state === 'result' && result && (
          <div style={styles.body}>
            <div style={styles.resultBlock}>
              {result.success ? (
                <>
                  <div style={styles.resultIcon}>&#10003;</div>
                  <div style={styles.resultTitle}>Import Complete</div>
                  <div style={styles.resultStats}>
                    <div>{result.imported} workout{result.imported !== 1 ? 's' : ''} created</div>
                    {result.phasesCreated > 0 && (
                      <div>{result.phasesCreated} phase{result.phasesCreated !== 1 ? 's' : ''} created</div>
                    )}
                    {result.skipped > 0 && (
                      <div style={{ color: COLORS.orange }}>
                        {result.skipped} skipped (duplicates)
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ ...styles.resultIcon, color: COLORS.red }}>&#10007;</div>
                  <div style={styles.resultTitle}>Import Failed</div>
                  <div style={styles.resultError}>{result.error}</div>
                </>
              )}
            </div>

            <div style={styles.footer}>
              {!result.success && (
                <button style={styles.cancelBtn} onClick={() => setState('input')}>
                  Back
                </button>
              )}
              <button
                style={styles.primaryBtn}
                onClick={handleDone}
              >
                {result.success ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PHASE_COLORS = [COLORS.accent, COLORS.green, COLORS.purple, COLORS.orange, COLORS.cyan, COLORS.red];

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
    maxWidth: 640,
    width: '95%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${SPACING.md}px ${SPACING.lg}px`,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.text,
    fontFamily: FONT.mono,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.textMuted,
    fontSize: 22,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  body: {
    padding: SPACING.lg,
    overflowY: 'auto',
    flex: 1,
  },
  hint: {
    margin: '0 0 12px',
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONT.mono,
  },
  dropZone: {
    border: `2px dashed ${COLORS.border}`,
    borderRadius: RADIUS.md,
    padding: '16px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    marginBottom: 12,
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  dropZoneActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentDim,
  },
  dropText: {
    fontSize: 13,
    color: COLORS.textDim,
    fontFamily: FONT.mono,
  },
  fileBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    padding: '4px 10px',
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONT.mono,
  },
  fileBadgeSmall: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    padding: '2px 8px',
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONT.mono,
    marginBottom: 12,
  },
  fileClearBtn: {
    background: 'none',
    border: 'none',
    color: COLORS.textDim,
    fontSize: 16,
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
  },
  textarea: {
    width: '100%',
    minHeight: 180,
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    fontFamily: FONT.mono,
    fontSize: 12,
    padding: 12,
    resize: 'vertical' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  parseError: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.red,
    fontFamily: FONT.mono,
  },
  quickPreview: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.green,
    fontFamily: FONT.mono,
  },
  summary: {
    fontSize: 14,
    color: COLORS.text,
    fontFamily: FONT.mono,
    marginBottom: 12,
  },
  summaryMuted: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  phaseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 12,
  },
  phaseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontFamily: FONT.mono,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  phaseTitle: {
    color: COLORS.text,
    fontWeight: 600,
  },
  phaseMeta: {
    color: COLORS.textDim,
  },
  tableWrap: {
    maxHeight: 260,
    overflowY: 'auto',
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 12,
    fontFamily: FONT.mono,
  },
  th: {
    textAlign: 'left' as const,
    padding: '8px 10px',
    color: COLORS.textDim,
    fontWeight: 600,
    borderBottom: `1px solid ${COLORS.border}`,
    backgroundColor: COLORS.bg,
    position: 'sticky' as const,
    top: 0,
  },
  td: {
    padding: '6px 10px',
    color: COLORS.text,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  trEven: {
    backgroundColor: 'transparent',
  },
  trOdd: {
    backgroundColor: COLORS.bg,
  },
  typeBadge: {
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  warnings: {
    marginBottom: 12,
    padding: '8px 10px',
    backgroundColor: COLORS.redDim,
    borderRadius: RADIUS.sm,
    fontSize: 12,
    fontFamily: FONT.mono,
  },
  warningLine: {
    color: COLORS.red,
    marginBottom: 2,
  },
  options: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap' as const,
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  checkText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONT.mono,
  },
  select: {
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.sm,
    color: COLORS.text,
    fontFamily: FONT.mono,
    fontSize: 12,
    padding: '4px 8px',
  },
  conflictWarning: {
    padding: '8px 12px',
    backgroundColor: '#78350f22',
    border: `1px solid ${COLORS.orange}44`,
    borderRadius: RADIUS.sm,
    fontSize: 12,
    color: COLORS.orange,
    fontFamily: FONT.mono,
    marginBottom: 12,
  },
  footer: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 12,
    borderTop: `1px solid ${COLORS.border}`,
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
  primaryBtn: {
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
  disabledBtn: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  resultBlock: {
    textAlign: 'center' as const,
    padding: `${SPACING.xl}px 0`,
  },
  resultIcon: {
    fontSize: 48,
    color: COLORS.green,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.text,
    fontFamily: FONT.mono,
    marginBottom: 12,
  },
  resultStats: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONT.mono,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  resultError: {
    fontSize: 13,
    color: COLORS.red,
    fontFamily: FONT.mono,
    marginTop: 8,
  },
};
