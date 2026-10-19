import type { Logger } from '@nestjs/common';
import { JWT } from 'google-auth-library';
import type { AdConversionUploader } from './ad-conversion-uploader';
import { type GoogleAdsSettings, googleAdsSettings } from './google-ads.config';
import { GoogleAdsUploader } from './google-ads.uploader';
import { microsoftAccessToken } from './microsoft-ads.auth';
import { microsoftAdsSettings } from './microsoft-ads.config';
import { MicrosoftAdsUploader } from './microsoft-ads.uploader';

const DATA_MANAGER_SCOPE = 'https://www.googleapis.com/auth/datamanager';

/** One uploader per ad platform whose config is complete. */
export function adConversionUploaders(
  config: { get(key: string): string | undefined },
  logger: Pick<Logger, 'warn'>,
): AdConversionUploader[] {
  const google = googleAdsSettings(config, logger);
  const microsoft = microsoftAdsSettings(config, logger);
  return [
    ...(google ? [new GoogleAdsUploader(google.ads, serviceAccountToken(google))] : []),
    ...(microsoft
      ? [new MicrosoftAdsUploader(microsoft.ads, microsoftAccessToken(microsoft.oauth))]
      : []),
  ];
}

/** Access tokens for the service account; the JWT client caches one until it expires. */
function serviceAccountToken({ serviceAccount }: GoogleAdsSettings): () => Promise<string> {
  const client = new JWT({ ...serviceAccount, scopes: [DATA_MANAGER_SCOPE] });
  return async () => {
    const { token } = await client.getAccessToken();
    if (!token) throw new Error('Google returned no access token for the service account');
    return token;
  };
}
