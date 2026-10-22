import type { AdConversion, AdConversionUploader } from './ad-conversion-uploader';

const APPLY_URL =
  'https://campaign.api.bingads.microsoft.com/CampaignManagement/v13/OfflineConversions/Apply';

export type MicrosoftAdsConfig = {
  developerToken: string;
  /** The manager account (customer) the OAuth user operates from. */
  customerId: string;
  /** The ad account that owns the offline conversion goal. */
  accountId: string;
  /** The name of an offline conversion goal, created at least two hours before the first upload. */
  conversionName: string;
};

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

type BatchError = { ErrorCode?: string | null; Message?: string | null };

/**
 * Applies conversions as Microsoft Ads offline conversions. Only a purchase
 * with a Microsoft click is sent, with the hashed email to help the match.
 * Microsoft drops a repeat of the same click and conversion time.
 */
export class MicrosoftAdsUploader implements AdConversionUploader {
  readonly platform = 'microsoft_ads';

  constructor(
    private readonly config: MicrosoftAdsConfig,
    private readonly accessToken: () => Promise<string>,
    private readonly fetchFn: Fetch = fetch,
  ) {}

  async upload(conversion: AdConversion): Promise<void> {
    const { msclkid } = conversion.clickIds;
    if (!msclkid) return;

    const token = await this.accessToken();
    const response = await this.fetchFn(APPLY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        DeveloperToken: this.config.developerToken,
        CustomerId: this.config.customerId,
        CustomerAccountId: this.config.accountId,
        // Our Microsoft Advertising user signs in with Google, so the token is Google's.
        IdentityProvider: 'Google',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        OfflineConversions: [
          {
            ConversionName: this.config.conversionName,
            ConversionTime: conversion.convertedAt.toISOString(),
            ConversionValue: conversion.value,
            ConversionCurrencyCode: conversion.currency,
            ...(msclkid ? { MicrosoftClickId: msclkid } : {}),
            ...(conversion.hashedEmail ? { HashedEmailAddress: conversion.hashedEmail } : {}),
          },
        ],
      }),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);

    const errors = partialErrorsOf(text);
    if (errors.length > 0) {
      throw new Error(errors.map((error) => `${error.ErrorCode}: ${error.Message}`).join('; '));
    }
  }
}

/** A 200 can still carry a rejected conversion, listed under `PartialErrors`. */
function partialErrorsOf(text: string): BatchError[] {
  const body: unknown = JSON.parse(text);
  if (typeof body !== 'object' || body === null || !('PartialErrors' in body)) return [];
  return Array.isArray(body.PartialErrors) ? body.PartialErrors : [];
}
