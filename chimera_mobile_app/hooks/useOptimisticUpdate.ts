import { useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';

interface Options<T> {
  mutate: (value: T) => Promise<void>;
  haptic?: boolean;
  onError?: (error: unknown) => void;
}

export function useOptimisticUpdate<T>(
  initialValue: T,
  { mutate, haptic = true, onError }: Options<T>,
) {
  const [value, setValue] = useState(initialValue);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const update = useCallback(
    async (next: T) => {
      if (syncingRef.current) return;

      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const previous = value;
      setValue(next);
      setIsSyncing(true);
      syncingRef.current = true;

      try {
        await mutate(next);
      } catch (err) {
        setValue(previous);
        onError?.(err);
      } finally {
        setIsSyncing(false);
        syncingRef.current = false;
      }
    },
    [value, mutate, haptic, onError],
  );

  const syncFromServer = useCallback((serverValue: T) => {
    if (!syncingRef.current) {
      setValue(serverValue);
    }
  }, []);

  return { value, update, isSyncing, syncFromServer };
}
