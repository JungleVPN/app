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
