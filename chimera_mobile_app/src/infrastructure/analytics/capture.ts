/**
 * Module-level capture function for non-React code (e.g. authFetch).
 * The PostHogProvider calls setCaptureFn() on mount to wire this up.
 */

type CaptureFn = (event: string, properties?: Record<string, any>) => void;

let _capture: CaptureFn | null = null;

export function setCaptureFn(fn: CaptureFn) {
  _capture = fn;
}

export function captureEvent(event: string, properties?: Record<string, any>) {
  try {
    _capture?.(event, properties);
  } catch {
    // silent
  }
}
