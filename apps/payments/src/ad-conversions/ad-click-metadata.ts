import type { AdClicks } from '@workspace/types';

const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'msclkid'] as const satisfies ReadonlyArray<
  keyof AdClicks
>;
const CLICK_ID_PATTERN = /^[\w-]{1,256}$/;

/**
 * The payment metadata a checkout stamps so the webhook can report the paid
 * purchase to Google Ads and Microsoft Ads. Nothing is stamped without the
 * payer's ads consent. The body is untrusted, so only known click ids in the
 * shape the platforms issue are kept.
 */
export function adClickMetadata(input: {
  adsConsent?: unknown;
  adClicks?: unknown;
}): Record<string, string> {
  if (input.adsConsent !== true) return {};
  const clicks = input.adClicks;
  const clickIds =
    typeof clicks === 'object' && clicks !== null
      ? CLICK_ID_KEYS.flatMap((key) => {
          const value: unknown = Reflect.get(clicks, key);
          return typeof value === 'string' && CLICK_ID_PATTERN.test(value) ? [[key, value]] : [];
        })
      : [];
  return { adsConsent: '1', ...Object.fromEntries(clickIds) };
}
