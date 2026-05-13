/**
 * Shared env vars read directly from Vite's import.meta.env.
 * Both apps point `envDir` at the monorepo root in their vite.config.ts,
 * so these VITE_* values are available to all packages at bundle time —
 * no React context or provider required.
 */
export const coreEnv = {
  subpageConfigUuid: (import.meta.env.VITE_SUBPAGE_CONFIG ?? '') as string,
  allowedAmounts: (import.meta.env.VITE_ALLOWED_AMOUNTS ?? '') as string,
  allowedPeriods: Number(import.meta.env.VITE_ALLOWED_PERIODS ?? 1),
  supportUrl: (import.meta.env.VITE_SUPPORT_URL ?? '') as string,
  starsAmount: Number(import.meta.env.VITE_STARS_AMOUNT ?? 0),
  successStickerUrl: (() => {
    const fileId = import.meta.env.VITE_SUCCESS_STICKER_FILE_ID ?? '';
    const paymentsUrl = import.meta.env.VITE_PAYMENTS_URL ?? '';
    return fileId && paymentsUrl ? `/telegram-stars/sticker/${fileId}` : '';
  })(),
} as const;
