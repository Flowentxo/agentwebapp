/**
 * Lightweight telemetry utility
 *
 * Usage:
 * - track('event_name', { prop1: 'value' })
 * - Can be extended to send to PostHog, Amplitude, Plausible, etc.
 *
 * Current implementation: Console logging (development)
 * Production: Replace with your analytics service
 */

type TelemetryEvent = {
  event: string;
  timestamp: string;
  properties?: Record<string, unknown>;
};

/**
 * Track an event
 * @param event - Event name (e.g., 'agent_open', 'filter_applied')
 * @param properties - Optional event properties
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  const payload: TelemetryEvent = {
    event,
    timestamp: new Date().toISOString(),
    properties,
  };

  // Development: Console log
  if (process.env.NODE_ENV === 'development') {
    console.log('[telemetry]', payload);
  }

  // Production: Send to analytics service
  // Example integrations:

  // PostHog:
  // if (typeof window !== 'undefined' && window.posthog) {
  //   window.posthog.capture(event, properties);
  // }

  // Plausible:
  // if (typeof window !== 'undefined' && window.plausible) {
  //   window.plausible(event, { props: properties });
  // }

  // Custom endpoint:
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // }).catch(console.error);
}

/**
 * Track page view (auto-called by Next.js router)
 */
export function trackPageView(path: string): void {
  track('page_view', { path });
}

/**
 * Track user interaction
 */
export function trackInteraction(
  action: string,
  target: string,
  properties?: Record<string, unknown>
): void {
  track('interaction', { action, target, ...properties });
}
