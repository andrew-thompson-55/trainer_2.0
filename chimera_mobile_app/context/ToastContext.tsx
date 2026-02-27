import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  variant: ToastVariant;
  visible: boolean;
}

interface ToastContextValue {
  toast: ToastState;
  showToast: (message: string, variant?: ToastVariant) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue>(null as unknown as ToastContextValue);

const DISMISS_DELAY = 3000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    variant: 'info',
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setToast({ message, variant, visible: true });

      timerRef.current = setTimeout(() => {
        hideToast();
      }, DISMISS_DELAY);
    },
    [hideToast],
  );

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
