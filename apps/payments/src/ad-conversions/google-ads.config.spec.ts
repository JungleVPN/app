import { describe, expect, it, vi } from 'vitest';
import { googleAdsSettings } from './google-ads.config';

const FULL_ENV: Record<string, string> = {
  GOOGLE_ADS_CUSTOMER_ID: '123-456-7890',
  GOOGLE_ADS_CONVERSION_ACTION_ID: '987654',
  GOOGLE_ADS_SERVICE_ACCOUNT_EMAIL: 'ads@jungle.iam.gserviceaccount.com',
  GOOGLE_ADS_SERVICE_ACCOUNT_KEY:
    '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
};

function settingsFrom(env: Record<string, string | undefined>) {
  const warn = vi.fn();
  const settings = googleAdsSettings({ get: (key: string) => env[key] }, { warn });
  return { settings, warn };
}

describe('googleAdsSettings — Google Ads upload config from the environment', () => {
  it('reads the account, conversion action and service account', () => {
    const { settings, warn } = settingsFrom(FULL_ENV);

    expect(settings).toEqual({
      ads: { customerId: '1234567890', conversionActionId: '987654' },
      serviceAccount: {
        email: 'ads@jungle.iam.gserviceaccount.com',
        key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
      },
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('reads the manager account to log in through, without its dashes', () => {
    const { settings } = settingsFrom({
      ...FULL_ENV,
      GOOGLE_ADS_LOGIN_CUSTOMER_ID: '555-000-1111',
    });

    expect(settings?.ads).toEqual({
      customerId: '1234567890',
      conversionActionId: '987654',
      loginCustomerId: '5550001111',
    });
  });

  it('keeps a key whose line breaks are real', () => {
    const key = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n';
    const { settings } = settingsFrom({ ...FULL_ENV, GOOGLE_ADS_SERVICE_ACCOUNT_KEY: key });

    expect(settings?.serviceAccount.key).toBe(key);
  });

  it('turns Google Ads uploads off, naming what is missing, when the config is incomplete', () => {
    const { settings, warn } = settingsFrom({
      GOOGLE_ADS_CUSTOMER_ID: '1234567890',
      GOOGLE_ADS_SERVICE_ACCOUNT_EMAIL: 'ads@jungle.iam.gserviceaccount.com',
    });

    expect(settings).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'Google Ads conversion upload is off — missing GOOGLE_ADS_CONVERSION_ACTION_ID, GOOGLE_ADS_SERVICE_ACCOUNT_KEY',
    );
  });

  it.each(Object.keys(FULL_ENV))('turns Google Ads uploads off without %s', (missing) => {
    const { settings } = settingsFrom({ ...FULL_ENV, [missing]: '' });

    expect(settings).toBeNull();
  });
});
