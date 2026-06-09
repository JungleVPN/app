/**
 * Shared env vars read directly from Vite's import.meta.env.
 * Both apps point `envDir` at the monorepo root in their vite.config.ts,
 * so these PUBLIC_* values are available to all packages at bundle time —
 * no React context or provider required.
 */

export const coreEnv = {
  subpageConfigUuid: (import.meta.env.PUBLIC_SUBPAGE_CONFIG ?? '') as string,

  allowedAmountStars: Number(import.meta.env.PUBLIC_ALLOWED_AMOUNT_STARS ?? 0),
  allowedAmountRub: (import.meta.env.PUBLIC_ALLOWED_AMOUNT_RUB ?? '') as string,
  allowedAmountStripe: (import.meta.env.PUBLIC_ALLOWED_AMOUNT_EUR ?? '') as string,
  allowedPeriod: Number(import.meta.env.PUBLIC_ALLOWED_PERIOD ?? 1),

  successStickerFileId: (import.meta.env.PUBLIC_SUCCESS_STICKER_FILE_ID ?? '') as string,
  menuStickerFileId: (import.meta.env.PUBLIC_MENU_STICKER_FILE_ID ?? '') as string,
  extraDeviceStickerFileId: (import.meta.env.PUBLIC_EXTRA_DEVICE_STICKER_FILE_ID ?? '') as string,

  tmaAppUrl: (import.meta.env.PUBLIC_TMA_APP_URL ?? '') as string,
  supportUrl: (import.meta.env.PUBLIC_SUPPORT_URL ?? '') as string,
  botUrl: (import.meta.env.PUBLIC_BOT_URL ?? '') as string,
  paymentsUrl: (import.meta.env.PUBLIC_PAYMENTS_URL ?? '') as string,
  remnawaveUrl: (import.meta.env.PUBLIC_REMNAWAVE_URL ?? '') as string,
  supabaseUrl: (import.meta.env.PUBLIC_SUPABASE_URL ?? '') as string,
  supabaseAnonKey: (import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? '') as string,

  extraDevicePriceRUB: Number(import.meta.env.PUBLIC_EXTRA_DEVICE_PRICE_RUB ?? ''),
  extraDevicePriceEUR: Number(import.meta.env.PUBLIC_EXTRA_DEVICE_PRICE_EUR ?? ''),
  extraDevicePriceStars: Number(import.meta.env.PUBLIC_EXTRA_DEVICE_PRICE_STARS ?? ''),

  admins: new Set(
    ((import.meta.env.PUBLIC_ADMINS ?? '') as string)
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean),
  ),
} as const;

export function getTelegramStickerUrl(fileId: string): string {
  const { botUrl } = coreEnv;
  return fileId && botUrl ? `${botUrl}/telegram/sticker/${fileId}` : '';
}
