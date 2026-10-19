export interface AttributionPayload {
  platform: 'web' | 'telegram';
  source?: string;
  medium?: string;
  campaign?: string;
  adset?: string;
  ad?: string;
  clickId?: string;
  adCode?: string;
  landingAt?: string;
}

/** The click ids Google Ads and Microsoft Ads put on an ad's landing URL, for reporting a purchase back server-side. */
export type AdClicks = {
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  msclkid?: string;
};
