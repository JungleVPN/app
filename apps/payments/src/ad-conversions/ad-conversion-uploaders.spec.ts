import { describe, expect, it, vi } from 'vitest';
import { adConversionUploaders } from './ad-conversion-uploaders';

const GOOGLE_ENV: Record<string, string> = {
  GOOGLE_ADS_CUSTOMER_ID: '1234567890',
  GOOGLE_ADS_CONVERSION_ACTION_ID: '987654',
  GOOGLE_ADS_SERVICE_ACCOUNT_EMAIL: 'ads@jungle.iam.gserviceaccount.com',
  GOOGLE_ADS_SERVICE_ACCOUNT_KEY: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
};

const uploadersFor = (env: Record<string, string>) =>
  adConversionUploaders({ get: (key: string) => env[key] }, { warn: vi.fn() });

describe('adConversionUploaders — which ad platforms purchases are uploaded to', () => {
  it('uploads to Google Ads once it is configured', () => {
    expect(uploadersFor(GOOGLE_ENV).map((uploader) => uploader.platform)).toEqual(['google_ads']);
  });

  it('uploads nowhere when no platform is configured', () => {
    expect(uploadersFor({})).toEqual([]);
  });
});
