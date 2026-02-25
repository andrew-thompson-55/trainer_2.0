import React, { useEffect } from 'react';
import Constants from 'expo-constants';
import { PostHogProvider as PHProvider } from 'posthog-react-native';
import { setCaptureFn } from './capture';
import { usePostHog } from 'posthog-react-native';

const POSTHOG_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_POSTHOG_KEY as string | undefined;

/** Bridge: wire the module-level captureEvent to the live PostHog instance. */
function CaptureBridge() {
  const posthog = usePostHog();
  useEffect(() => {
    if (posthog) {
      setCaptureFn((event, properties) => posthog.capture(event, properties));
    }
  }, [posthog]);
  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider
      apiKey={POSTHOG_KEY}
      options={{
        host: 'https://us.i.posthog.com',
      }}
    >
      <CaptureBridge />
      {children}
    </PHProvider>
  );
}
