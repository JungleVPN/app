/**
 * PostHog client-side analytics.
 *
 * posthog.init() is called once on module load (browser only).
 * All other modules import `posthog` directly from posthog-js; this module
 * exists solely to run the side-effectful init call and to provide a typed
 * `phCapture` / `phIdentify` / `phReset` helpers that guard against missing
 * configuration without crashing the app.
 *
 * Environment variables (set in .env at the monorepo root):
 *   VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
 *   VITE_PUBLIC_POSTHOG_HOST
 */
import posthog from 'posthog-js';
import { normalizeHostname } from './domain';

const token = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

const isEnabled = typeof window !== 'undefined' && !!token && !!host;

/** The only hostnames whose traffic counts as real production usage. Everything else — dev, staging, and legacy domain aliases — is tagged below. */
const PRODUCTION_HOSTNAMES: ReadonlySet<string> = new Set(['jungle-vpn.com', 'jungle.community']);

if (typeof window !== 'undefined' && (!token || !host) && import.meta.env.DEV) {
  console.error(
    'VITE_PUBLIC_POSTHOG_PROJECT_TOKEN and VITE_PUBLIC_POSTHOG_HOST are required by PostHog ' +
      'but are missing or un-configured; this causes events to be silently missed. ' +
      'This error stops appearing once both variables are configured.',
  );
}

if (isEnabled) {
  posthog.init(token as string, {
    api_host: host as string,
    defaults: '2026-01-30',
    tracing_headers: [window.location.hostname],
    // Capture stays cookieless (no persistent identifiers) until the user
    // explicitly opts in via phOptIn(); opting out keeps it cookieless
    // instead of disabling capture outright. See CookieConsent.tsx.
    cookieless_mode: 'on_reject',
  });

  if (!PRODUCTION_HOSTNAMES.has(normalizeHostname(window.location.hostname))) {
    posthog.setPersonProperties({ $internal_or_test_user: true });
  }
}

export { posthog };

/** Capture a PostHog event. No-op when PostHog is not initialised. */
export function phCapture(event: string, properties?: Record<string, unknown>): void {
  if (!isEnabled) return;
  console.log('capture', event, properties);
  posthog.capture(event, properties);
}

/**
 * Identify the current user.
 * Call on sign-up and on confirmed login.
 * Never pass PII (email, name) as event properties — they belong here.
 */
export function phIdentify(
  distinctId: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (!isEnabled) return;
  posthog.identify(distinctId, properties);
}

/** Reset the PostHog session. Call on logout. */
export function phReset(): void {
  if (!isEnabled) return;
  posthog.reset();
}

export type PostHogConsentStatus = 'granted' | 'denied' | 'pending';

/** Current consent decision. 'granted' when PostHog is not configured at all. */
export function phConsentStatus(): PostHogConsentStatus {
  if (!isEnabled) return 'granted';
  return posthog.get_explicit_consent_status();
}

/** Grant consent: switches capture from cookieless to full (persistent) tracking. */
export function phOptIn(): void {
  if (!isEnabled) return;
  posthog.opt_in_capturing();
}

/** Deny consent: capture stays cookieless rather than stopping outright. */
export function phOptOut(): void {
  if (!isEnabled) return;
  posthog.opt_out_capturing();
}
