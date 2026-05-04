/**
 * TMA-specific env vars. Shared vars (VITE_SUBPAGE_CONFIG, VITE_ALLOWED_*,
 * VITE_SUPPORT_URL) are read by @workspace/core/env directly — no duplication here.
 */
export const env = {
  remnawaveUrl: import.meta.env.VITE_REMNAWAVE_URL ?? '',
  paymentsUrl: import.meta.env.VITE_PAYMENTS_URL ?? '',
} as const;
