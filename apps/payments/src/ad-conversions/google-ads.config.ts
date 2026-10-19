import type { Logger } from '@nestjs/common';
import type { GoogleAdsConfig } from './google-ads.uploader';

export type GoogleAdsSettings = {
  ads: GoogleAdsConfig;
  /** A service account that is a user of the Google Ads account (or its manager). */
  serviceAccount: { email: string; key: string };
};

const REQUIRED = [
  'GOOGLE_ADS_CUSTOMER_ID',
  'GOOGLE_ADS_CONVERSION_ACTION_ID',
  'GOOGLE_ADS_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_ADS_SERVICE_ACCOUNT_KEY',
] as const;

/**
 * Google Ads upload config from the environment, or null when incomplete.
 * Like Tolt, a gap is warned about rather than thrown on: ad reporting is an
 * enrichment, and payments must still boot and take money without it.
 */
export function googleAdsSettings(
  config: { get(key: string): string | undefined },
  logger: Pick<Logger, 'warn'>,
): GoogleAdsSettings | null {
  const missing = REQUIRED.filter((key) => !config.get(key));
  if (missing.length > 0) {
    logger.warn(`Google Ads conversion upload is off — missing ${missing.join(', ')}`);
    return null;
  }
  const value = (key: (typeof REQUIRED)[number]) => config.get(key) ?? '';
  const loginCustomerId = config.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID');
  return {
    ads: {
      customerId: digitsOf(value('GOOGLE_ADS_CUSTOMER_ID')),
      conversionActionId: value('GOOGLE_ADS_CONVERSION_ACTION_ID'),
      ...(loginCustomerId ? { loginCustomerId: digitsOf(loginCustomerId) } : {}),
    },
    serviceAccount: {
      email: value('GOOGLE_ADS_SERVICE_ACCOUNT_EMAIL'),
      // A key pasted into an env file keeps its line breaks as literal `\n`.
      key: value('GOOGLE_ADS_SERVICE_ACCOUNT_KEY').replaceAll('\\n', '\n'),
    },
  };
}

/** `123-456-7890`, as the Google Ads UI shows an account id, is `1234567890` to the API. */
function digitsOf(accountId: string): string {
  return accountId.replaceAll('-', '');
}
