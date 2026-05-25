/**
 * Shared env vars read directly from Vite's import.meta.env.
 * Both apps point `envDir` at the monorepo root in their vite.config.ts,
 * so these VITE_* values are available to all packages at bundle time —
 * no React context or provider required.
 */

function buildStickerUrl(fileId: string, botUrl: string): string {
  return fileId && botUrl ? `${botUrl}/telegram/sticker/${fileId}` : '';
}

export const coreEnv = {
  subpageConfigUuid: (import.meta.env.VITE_SUBPAGE_CONFIG ?? '') as string,
  allowedAmounts: (import.meta.env.VITE_ALLOWED_AMOUNTS ?? '') as string,
  allowedPeriods: Number(import.meta.env.VITE_ALLOWED_PERIODS ?? 1),
  supportUrl: (import.meta.env.VITE_SUPPORT_URL ?? '') as string,
  starsAmount: Number(import.meta.env.VITE_STARS_AMOUNT ?? 0),
  successStickerUrl: buildStickerUrl(
    import.meta.env.VITE_SUCCESS_STICKER_FILE_ID ?? '',
    import.meta.env.VITE_BOT_URL ?? '',
  ),
  menuStickerUrl: buildStickerUrl(
    import.meta.env.VITE_MENU_STICKER_FILE_ID ?? '',
    import.meta.env.VITE_BOT_URL ?? '',
  ),
} as const;
