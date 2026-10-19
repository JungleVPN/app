import { describe, expect, it, vi } from 'vitest';
import { adConversionUploaders } from './ad-conversion-uploaders';

const GOOGLE_ENV: Record<string, string> = {
  GOOGLE_ADS_CUSTOMER_ID: '1234567890',
  GOOGLE_ADS_CONVERSION_ACTION_ID: '987654',
  GOOGLE_ADS_SERVICE_ACCOUNT_EMAIL: 'ads@jungle.iam.gserviceaccount.com',
  GOOGLE_ADS_SERVICE_ACCOUNT_KEY: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
};

const MICROSOFT_ENV: Record<string, string> = {
  MICROSOFT_ADS_DEVELOPER_TOKEN: 'dev-1',
  MICROSOFT_ADS_CUSTOMER_ID: '111',
  MICROSOFT_ADS_ACCOUNT_ID: '222',
  MICROSOFT_ADS_CONVERSION_NAME: 'Purchase (server)',
  MICROSOFT_ADS_CLIENT_ID: 'client-1',
  MICROSOFT_ADS_REFRESH_TOKEN: 'refresh-1',
};

const uploadersFor = (env: Record<string, string>) =>
  adConversionUploaders({ get: (key: string) => env[key] }, { warn: vi.fn() });

describe('adConversionUploaders — which ad platforms purchases are uploaded to', () => {
  it('uploads to Google Ads once it is configured', () => {
    expect(uploadersFor(GOOGLE_ENV).map((uploader) => uploader.platform)).toEqual(['google_ads']);
  });

  it('uploads to Microsoft Ads once it is configured', () => {
    expect(uploadersFor(MICROSOFT_ENV).map((uploader) => uploader.platform)).toEqual([
      'microsoft_ads',
    ]);
  });

  it('uploads to both platforms when both are configured', () => {
    expect(
      uploadersFor({ ...GOOGLE_ENV, ...MICROSOFT_ENV }).map((uploader) => uploader.platform),
    ).toEqual(['google_ads', 'microsoft_ads']);
  });

  it('uploads nowhere when no platform is configured', () => {
    expect(uploadersFor({})).toEqual([]);
  });
});
