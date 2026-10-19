import type { AdClicks } from '@workspace/types';

const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'msclkid'] as const satisfies ReadonlyArray<
  keyof AdClicks
>;
const CLICK_ID_PATTERN = /^[\w-]{1,256}$/;

/**
 * The payment metadata a checkout stamps so the webhook can report the paid
 * purchase to Google Ads and Microsoft Ads. The body is untrusted, so only
 * known click ids in the shape the platforms issue are kept.
 */
export function adClickMetadata(adClicks: unknown): Record<string, string> {
  if (typeof adClicks !== 'object' || adClicks === null) return {};
  return Object.fromEntries(
    CLICK_ID_KEYS.flatMap((key) => {
      const value: unknown = Reflect.get(adClicks, key);
      return typeof value === 'string' && CLICK_ID_PATTERN.test(value) ? [[key, value]] : [];
    }),
  );
}
