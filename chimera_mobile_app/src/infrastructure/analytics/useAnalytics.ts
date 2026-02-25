import { usePostHog } from 'posthog-react-native';

type EventName =
  | 'tab_switched'
  | 'checkin_started'
  | 'checkin_metric_selected'
  | 'checkin_saved'
  | 'workout_update_saved'
  | 'coach_message_sent'
  | 'coach_response_received'
  | 'setting_changed'
  | 'strava_connected'
  | 'api_error';

export function useAnalytics() {
  const posthog = usePostHog();

  const track = (event: EventName, properties?: Record<string, any>) => {
    try {
      posthog?.capture(event, properties);
    } catch {
      // silent
    }
  };

  const identify = (userId: string, traits?: Record<string, any>) => {
    try {
      posthog?.identify(userId, traits);
    } catch {
      // silent
    }
  };

  const reset = () => {
    try {
      posthog?.reset();
    } catch {
      // silent
    }
  };

  return { track, identify, reset };
}
