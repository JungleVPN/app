import type { AdConversion, AdConversionUploader } from './ad-conversion-uploader';

const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest';

export type GoogleAdsConfig = {
  /** The Google Ads account that owns the conversion action, digits only. */
  customerId: string;
  /** The numeric id of an "Import from clicks" (`UPLOAD_CLICKS`) conversion action. */
  conversionActionId: string;
  /** A manager account the service account is a user of, when it is not a user of `customerId`. */
  loginCustomerId?: string;
};

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Uploads conversions to Google Ads through the Data Manager API, which
 * replaced the Google Ads API's click conversion upload for new integrations.
 * Only a purchase with a Google click is sent: one click id — gclid, else
 * gbraid, else wbraid — alongside the hashed email, which helps the match.
 */
export class GoogleAdsUploader implements AdConversionUploader {
  readonly platform = 'google_ads';

  constructor(
    private readonly config: GoogleAdsConfig,
    private readonly accessToken: () => Promise<string>,
    private readonly fetchFn: Fetch = fetch,
  ) {}

  async upload(conversion: AdConversion): Promise<void> {
    const adIdentifiers = googleClickOf(conversion);
    if (!adIdentifiers) return;

    const token = await this.accessToken();
    const response = await this.fetchFn(INGEST_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinations: [this.destination()],
        encoding: 'HEX',
        events: [
          {
            transactionId: conversion.orderId,
            eventTimestamp: conversion.convertedAt.toISOString(),
            conversionValue: conversion.value,
            currency: conversion.currency,
            eventSource: 'WEB',
            ...(adIdentifiers ? { adIdentifiers } : {}),
            ...(conversion.hashedEmail
              ? { userData: { userIdentifiers: [{ emailAddress: conversion.hashedEmail }] } }
              : {}),
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  }

  private destination() {
    const { customerId, conversionActionId, loginCustomerId } = this.config;
    return {
      operatingAccount: { accountType: 'GOOGLE_ADS', accountId: customerId },
      ...(loginCustomerId
        ? { loginAccount: { accountType: 'GOOGLE_ADS', accountId: loginCustomerId } }
        : {}),
      productDestinationId: conversionActionId,
    };
  }
}

function googleClickOf({ clickIds }: AdConversion): Record<string, string> | null {
  if (clickIds.gclid) return { gclid: clickIds.gclid };
  if (clickIds.gbraid) return { gbraid: clickIds.gbraid };
  if (clickIds.wbraid) return { wbraid: clickIds.wbraid };
  return null;
}
