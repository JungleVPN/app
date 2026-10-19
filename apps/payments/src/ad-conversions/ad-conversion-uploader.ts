import type { AdClicks } from '@workspace/types';

/** A paid first purchase, as every ad platform is given it. */
export type AdConversion = {
  /** The provider payment id — what lets a platform drop a repeated upload. */
  orderId: string;
  /** When the provider says it was paid, so a retried upload is identical. */
  convertedAt: Date;
  value: number;
  currency: string;
  clickIds: AdClicks;
  /** SHA-256 of the trimmed, lowercased checkout email, for matching without a click id. */
  hashedEmail?: string;
};

/** Sends conversions to one ad platform. Throws when the platform refuses one. */
export interface AdConversionUploader {
  readonly platform: 'google_ads' | 'microsoft_ads';
  upload(conversion: AdConversion): Promise<void>;
}

/** The uploaders, one per ad platform. */
export const AD_CONVERSION_UPLOADERS = Symbol('AD_CONVERSION_UPLOADERS');
