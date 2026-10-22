import { describe, expect, it, vi } from 'vitest';
import type { AdConversion } from './ad-conversion-uploader';
import { type MicrosoftAdsConfig, MicrosoftAdsUploader } from './microsoft-ads.uploader';

const APPLY_URL =
  'https://campaign.api.bingads.microsoft.com/CampaignManagement/v13/OfflineConversions/Apply';
const HASHED_EMAIL = 'a0eaf63ba7299a4eeb274eeb9b97e8dc4758acf616e963e07546421300a4c25a';

function conversion(overrides: Partial<AdConversion> = {}): AdConversion {
  return {
    orderId: 'pay_1',
    convertedAt: new Date('2026-10-19T10:15:00.000Z'),
    value: 7.99,
    currency: 'USD',
    clickIds: { msclkid: 'ms-1' },
    hashedEmail: HASHED_EMAIL,
    ...overrides,
  };
}

function setup(options: { response?: Response; accessToken?: () => Promise<string> } = {}) {
  const fetchFn = vi.fn(
    async (_url: string, _init: RequestInit) =>
      options.response ?? new Response(JSON.stringify({ PartialErrors: [] }), { status: 200 }),
  );
  const config: MicrosoftAdsConfig = {
    developerToken: 'dev-1',
    customerId: '111',
    accountId: '222',
    conversionName: 'Purchase (server)',
  };
  const uploader = new MicrosoftAdsUploader(
    config,
    options.accessToken ?? (async () => 'token-1'),
    fetchFn,
  );
  return { uploader, fetchFn };
}

function sentBody(fetchFn: ReturnType<typeof setup>['fetchFn']): unknown {
  const [, init] = fetchFn.mock.calls[0];
  return JSON.parse(String(init.body));
}

describe('MicrosoftAdsUploader — applying an offline conversion', () => {
  it('posts to the offline conversion endpoint as our ad account, signed in with Google', async () => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion());

    expect(fetchFn).toHaveBeenCalledWith(APPLY_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-1',
        DeveloperToken: 'dev-1',
        CustomerId: '111',
        CustomerAccountId: '222',
        IdentityProvider: 'Google',
        'Content-Type': 'application/json',
      },
      body: expect.any(String),
    });
  });

  it('sends the click, paid time in UTC, value and hashed email against our goal', async () => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion());

    expect(sentBody(fetchFn)).toEqual({
      OfflineConversions: [
        {
          ConversionName: 'Purchase (server)',
          ConversionTime: '2026-10-19T10:15:00.000Z',
          ConversionValue: 7.99,
          ConversionCurrencyCode: 'USD',
          MicrosoftClickId: 'ms-1',
          HashedEmailAddress: HASHED_EMAIL,
        },
      ],
    });
  });

  it('sends nothing without a Microsoft click, even with an email to match', async () => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion({ clickIds: { gclid: 'g-1' } }));

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('sends no hashed email when there is no email', async () => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion({ hashedEmail: undefined }));

    expect(sentBody(fetchFn)).toEqual({
      OfflineConversions: [expect.not.objectContaining({ HashedEmailAddress: expect.anything() })],
    });
  });

  it('fails with Microsoft’s explanation when the request is refused', async () => {
    const { uploader } = setup({
      response: new Response('{"Message":"Invalid credentials"}', { status: 401 }),
    });

    await expect(uploader.upload(conversion())).rejects.toThrow(
      'HTTP 401: {"Message":"Invalid credentials"}',
    );
  });

  it('fails when Microsoft accepts the request but rejects the conversion', async () => {
    const { uploader } = setup({
      response: new Response(
        JSON.stringify({
          PartialErrors: [
            { ErrorCode: 'OfflineConversionNameInvalid', Message: 'The goal name is invalid.' },
          ],
        }),
        { status: 200 },
      ),
    });

    await expect(uploader.upload(conversion())).rejects.toThrow(
      'OfflineConversionNameInvalid: The goal name is invalid.',
    );
  });

  it('lists every conversion error Microsoft reports', async () => {
    const { uploader } = setup({
      response: new Response(
        JSON.stringify({
          PartialErrors: [
            { ErrorCode: 'FutureConversionTime', Message: 'Time is in the future.' },
            { ErrorCode: 'ConversionCurrencyCodeInvalid', Message: 'Unknown currency.' },
          ],
        }),
      ),
    });

    await expect(uploader.upload(conversion())).rejects.toThrow(
      'FutureConversionTime: Time is in the future.; ConversionCurrencyCodeInvalid: Unknown currency.',
    );
  });

  it('succeeds when Microsoft reports no partial errors at all', async () => {
    const { uploader } = setup({ response: new Response('{"PartialErrors":null}') });

    await expect(uploader.upload(conversion())).resolves.toBeUndefined();
  });

  it('fails when no access token can be obtained', async () => {
    const { uploader, fetchFn } = setup({
      accessToken: async () => {
        throw new Error('invalid_grant');
      },
    });

    await expect(uploader.upload(conversion())).rejects.toThrow('invalid_grant');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
