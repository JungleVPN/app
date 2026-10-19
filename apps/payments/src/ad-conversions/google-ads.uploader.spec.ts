import { describe, expect, it, vi } from 'vitest';
import type { AdConversion } from './ad-conversion-uploader';
import { type GoogleAdsConfig, GoogleAdsUploader } from './google-ads.uploader';

const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest';

function conversion(overrides: Partial<AdConversion> = {}): AdConversion {
  return {
    orderId: 'pay_1',
    convertedAt: new Date('2026-10-19T10:15:00.000Z'),
    value: 7.99,
    currency: 'USD',
    clickIds: { gclid: 'g-1' },
    hashedEmail: 'a0eaf63ba7299a4eeb274eeb9b97e8dc4758acf616e963e07546421300a4c25a',
    ...overrides,
  };
}

function setup(
  options: {
    config?: Partial<GoogleAdsConfig>;
    response?: Response;
    accessToken?: () => Promise<string>;
  } = {},
) {
  const fetchFn = vi.fn(
    async (_url: string, _init: RequestInit) =>
      options.response ?? new Response(JSON.stringify({ requestId: 'req_1' }), { status: 200 }),
  );
  const uploader = new GoogleAdsUploader(
    { customerId: '1234567890', conversionActionId: '987654', ...options.config },
    options.accessToken ?? (async () => 'token-1'),
    fetchFn,
  );
  return { uploader, fetchFn };
}

function sentBody(fetchFn: ReturnType<typeof setup>['fetchFn']): unknown {
  const [, init] = fetchFn.mock.calls[0];
  return JSON.parse(String(init.body));
}

describe('GoogleAdsUploader — sending a conversion to the Data Manager API', () => {
  it('posts the conversion to the ingest endpoint with the service account token', async () => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion());

    expect(fetchFn).toHaveBeenCalledWith(INGEST_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer token-1', 'Content-Type': 'application/json' },
      body: expect.any(String),
    });
  });

  it('sends the payment as a web conversion against our conversion action', async () => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion());

    expect(sentBody(fetchFn)).toEqual({
      destinations: [
        {
          operatingAccount: { accountType: 'GOOGLE_ADS', accountId: '1234567890' },
          productDestinationId: '987654',
        },
      ],
      encoding: 'HEX',
      events: [
        {
          transactionId: 'pay_1',
          eventTimestamp: '2026-10-19T10:15:00.000Z',
          conversionValue: 7.99,
          currency: 'USD',
          eventSource: 'WEB',
          adIdentifiers: { gclid: 'g-1' },
          userData: {
            userIdentifiers: [
              {
                emailAddress: 'a0eaf63ba7299a4eeb274eeb9b97e8dc4758acf616e963e07546421300a4c25a',
              },
            ],
          },
        },
      ],
    });
  });

  it('logs in through the manager account when one is configured', async () => {
    const { uploader, fetchFn } = setup({ config: { loginCustomerId: '5550001111' } });

    await uploader.upload(conversion());

    expect(sentBody(fetchFn)).toMatchObject({
      destinations: [{ loginAccount: { accountType: 'GOOGLE_ADS', accountId: '5550001111' } }],
    });
  });

  it.each([
    ['gbraid when there is no gclid', { gbraid: 'gb-1', wbraid: 'wb-1' }, { gbraid: 'gb-1' }],
    ['wbraid when it is the only Google click', { wbraid: 'wb-1' }, { wbraid: 'wb-1' }],
    ['only the gclid when there are several', { gclid: 'g-1', gbraid: 'gb-1' }, { gclid: 'g-1' }],
  ])('sends %s', async (_case, clickIds, adIdentifiers) => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion({ clickIds }));

    expect(sentBody(fetchFn)).toMatchObject({ events: [{ adIdentifiers }] });
  });

  it('matches by email alone when there is no Google click', async () => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion({ clickIds: { msclkid: 'ms-1' } }));

    const body = sentBody(fetchFn);
    expect(body).toMatchObject({ events: [{ userData: { userIdentifiers: [{}] } }] });
    expect(body).not.toMatchObject({ events: [{ adIdentifiers: expect.anything() }] });
  });

  it('sends no user data when there is no email', async () => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion({ hashedEmail: undefined }));

    expect(sentBody(fetchFn)).not.toMatchObject({ events: [{ userData: expect.anything() }] });
  });

  it('sends nothing when there is neither a Google click nor an email to match', async () => {
    const { uploader, fetchFn } = setup();

    await uploader.upload(conversion({ clickIds: { msclkid: 'ms-1' }, hashedEmail: undefined }));

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('fails with Google’s explanation when the request is refused', async () => {
    const { uploader } = setup({
      response: new Response('{"error":{"message":"conversion action not found"}}', {
        status: 400,
      }),
    });

    await expect(uploader.upload(conversion())).rejects.toThrow(
      'HTTP 400: {"error":{"message":"conversion action not found"}}',
    );
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
