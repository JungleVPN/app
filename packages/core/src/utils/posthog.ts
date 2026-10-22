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
 *   PUBLIC_ANALYTICS_ENVIRONMENT — `dev` sends nothing at all; a dev site shares
 *     the PostHog project with production. The backend reads it too.
 */
import posthog from 'posthog-js';
import { normalizeHostname } from './domain';

const token = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

const isDev = import.meta.env.PUBLIC_ANALYTICS_ENVIRONMENT === 'dev';

const isEnabled = typeof window !== 'undefined' && !!token && !!host && !isDev;

/** The only hostnames whose traffic counts as real production usage (`www.` is stripped first). Everything else — dev and staging — is tagged below. */
const PRODUCTION_HOSTNAMES: ReadonlySet<string> = new Set([
  'jungle-vpn.com',
  'jungle.community',
  'thejungle.pro',
  'web.thejungle.pro',
  'app.thejungle.pro',
]);

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
    // Nothing is captured until the visitor chooses: phOptIn() enables full
    // (persistent) tracking, while phOptOut() keeps capture going cookieless
    // (no persistent identifiers) instead of disabling it. See CookieConsent.tsx.
    // Ingestion discards cookieless events unless the PostHog project has
    // "Cookieless server hash mode" enabled (Project settings > Web analytics),
    // so that setting must stay on for as long as this option is set.
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

/**
 * Ties a guest checkout to the account its payment will create. The browser
 * is anonymous until then, and the backend links `email:{address}` to the new
 * account, so the plan choice, checkout and replay land on the buyer. A
 * visitor already identified — a signed-in account — is left as it is.
 */
export function phIdentifyGuestCheckout(email: string): void {
  if (!isEnabled || posthog._isIdentified()) return;
  posthog.identify(`email:${email.trim().toLowerCase()}`);
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

/**
 * Opts in a visitor who has not chosen yet. For surfaces without a consent
 * banner (the Telegram mini app), where opening the app counts as consent —
 * a pending visitor would otherwise send nothing under cookieless 'on_reject'.
 */
export function phGrantImpliedConsent(): void {
  if (!isEnabled || posthog.get_explicit_consent_status() !== 'pending') return;
  posthog.opt_in_capturing();
}

/** Deny consent: capture stays cookieless rather than stopping outright. */
export function phOptOut(): void {
  if (!isEnabled) return;
  posthog.opt_out_capturing();
}
