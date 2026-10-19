import { describe, expect, it, vi } from 'vitest';
import { microsoftAdsSettings } from './microsoft-ads.config';

const FULL_ENV: Record<string, string> = {
  MICROSOFT_ADS_DEVELOPER_TOKEN: 'dev-1',
  MICROSOFT_ADS_CUSTOMER_ID: '111',
  MICROSOFT_ADS_ACCOUNT_ID: '222',
  MICROSOFT_ADS_CONVERSION_NAME: 'Purchase (server)',
  MICROSOFT_ADS_CLIENT_ID: 'client-1',
  MICROSOFT_ADS_REFRESH_TOKEN: 'refresh-1',
};

function settingsFrom(env: Record<string, string | undefined>) {
  const warn = vi.fn();
  const settings = microsoftAdsSettings({ get: (key: string) => env[key] }, { warn });
  return { settings, warn };
}

describe('microsoftAdsSettings — Microsoft Ads upload config from the environment', () => {
  it('reads the account, conversion goal and OAuth client', () => {
    const { settings, warn } = settingsFrom(FULL_ENV);

    expect(settings).toEqual({
      ads: {
        developerToken: 'dev-1',
        customerId: '111',
        accountId: '222',
        conversionName: 'Purchase (server)',
      },
      oauth: { clientId: 'client-1', refreshToken: 'refresh-1' },
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('reads the client secret of a web app registration', () => {
    const { settings } = settingsFrom({ ...FULL_ENV, MICROSOFT_ADS_CLIENT_SECRET: 'secret-1' });

    expect(settings?.oauth).toEqual({
      clientId: 'client-1',
      refreshToken: 'refresh-1',
      clientSecret: 'secret-1',
    });
  });

  it('turns Microsoft Ads uploads off, naming what is missing, when the config is incomplete', () => {
    const { settings, warn } = settingsFrom({
      ...FULL_ENV,
      MICROSOFT_ADS_DEVELOPER_TOKEN: undefined,
      MICROSOFT_ADS_REFRESH_TOKEN: '',
    });

    expect(settings).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'Microsoft Ads conversion upload is off — missing MICROSOFT_ADS_DEVELOPER_TOKEN, MICROSOFT_ADS_REFRESH_TOKEN',
    );
  });

  it.each(Object.keys(FULL_ENV))('turns Microsoft Ads uploads off without %s', (missing) => {
    const { settings } = settingsFrom({ ...FULL_ENV, [missing]: '' });

    expect(settings).toBeNull();
  });
});
