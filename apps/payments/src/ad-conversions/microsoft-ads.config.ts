import type { Logger } from '@nestjs/common';
import type { MicrosoftOAuthClient } from './microsoft-ads.auth';
import type { MicrosoftAdsConfig } from './microsoft-ads.uploader';

export type MicrosoftAdsSettings = {
  ads: MicrosoftAdsConfig;
  oauth: MicrosoftOAuthClient;
};

const REQUIRED = [
  'MICROSOFT_ADS_DEVELOPER_TOKEN',
  'MICROSOFT_ADS_CUSTOMER_ID',
  'MICROSOFT_ADS_ACCOUNT_ID',
  'MICROSOFT_ADS_CONVERSION_NAME',
  'MICROSOFT_ADS_CLIENT_ID',
  'MICROSOFT_ADS_REFRESH_TOKEN',
] as const;

/** Microsoft Ads upload config from the environment, or null (with a warning) when incomplete. */
export function microsoftAdsSettings(
  config: { get(key: string): string | undefined },
  logger: Pick<Logger, 'warn'>,
): MicrosoftAdsSettings | null {
  const missing = REQUIRED.filter((key) => !config.get(key));
  if (missing.length > 0) {
    logger.warn(`Microsoft Ads conversion upload is off — missing ${missing.join(', ')}`);
    return null;
  }
  const value = (key: (typeof REQUIRED)[number]) => config.get(key) ?? '';
  const clientSecret = config.get('MICROSOFT_ADS_CLIENT_SECRET');
  return {
    ads: {
      developerToken: value('MICROSOFT_ADS_DEVELOPER_TOKEN'),
      customerId: value('MICROSOFT_ADS_CUSTOMER_ID'),
      accountId: value('MICROSOFT_ADS_ACCOUNT_ID'),
      conversionName: value('MICROSOFT_ADS_CONVERSION_NAME'),
    },
    oauth: {
      clientId: value('MICROSOFT_ADS_CLIENT_ID'),
      refreshToken: value('MICROSOFT_ADS_REFRESH_TOKEN'),
      ...(clientSecret ? { clientSecret } : {}),
    },
  };
}
