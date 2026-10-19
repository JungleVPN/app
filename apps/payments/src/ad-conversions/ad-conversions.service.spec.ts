import type { AnalyticsEvent } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import type { AdminService } from '../admin/admin.service';
import type { AnalyticsClientService } from '../analytics/analytics-client.service';
import type { AdConversion, AdConversionUploader } from './ad-conversion-uploader';
import { AdConversionsService, type PaidPurchase } from './ad-conversions.service';

const PAYER_EMAIL_SHA256 = 'a0eaf63ba7299a4eeb274eeb9b97e8dc4758acf616e963e07546421300a4c25a';
const PAID_AT = new Date('2026-10-19T10:15:00Z');

function purchase(overrides: Partial<PaidPurchase> = {}): PaidPurchase {
  return {
    provider: 'whop',
    paymentId: 'pay_1',
    userId: 4821,
    paidAt: PAID_AT,
    value: 7.99,
    currency: 'USD',
    metadata: { email: 'payer@test.com', gclid: 'g-1' },
    email: 'payer@test.com',
    ...overrides,
  };
}

function uploader(
  platform: AdConversionUploader['platform'],
  upload: (conversion: AdConversion) => Promise<void> = async () => {},
) {
  return { platform, upload: vi.fn(upload) };
}

function setup(
  opts: {
    isFirstPayment?: () => Promise<boolean>;
    google?: ReturnType<typeof uploader>;
    microsoft?: ReturnType<typeof uploader>;
  } = {},
) {
  const google = opts.google ?? uploader('google_ads');
  const microsoft = opts.microsoft ?? uploader('microsoft_ads');
  const isFirstPayment = vi.fn(opts.isFirstPayment ?? (async () => true));
  const track = vi.fn(async (_event: AnalyticsEvent) => {});
  const service = new AdConversionsService(
    { isFirstPayment } as unknown as AdminService,
    { track } as unknown as AnalyticsClientService,
    [google, microsoft],
  );
  return { service, google, microsoft, isFirstPayment, track };
}

describe('AdConversionsService.reportPurchase — a customer’s first payment', () => {
  it('uploads the purchase to every ad platform, keyed by the payment id', async () => {
    const { service, google, microsoft } = setup();

    await service.reportPurchase(purchase());

    const expected: AdConversion = {
      orderId: 'pay_1',
      convertedAt: PAID_AT,
      value: 7.99,
      currency: 'USD',
      clickIds: { gclid: 'g-1' },
      hashedEmail: PAYER_EMAIL_SHA256,
    };
    expect(google.upload).toHaveBeenCalledWith(expected);
    expect(microsoft.upload).toHaveBeenCalledWith(expected);
  });

  it('uploads a payment worth less than one unit of its currency', async () => {
    const { service, google } = setup();

    await service.reportPurchase(purchase({ value: 0.5 }));

    expect(google.upload).toHaveBeenCalledWith(expect.objectContaining({ value: 0.5 }));
  });

  it('asks whether this payment is the payer’s first for its own provider', async () => {
    const { service, isFirstPayment } = setup();

    await service.reportPurchase(purchase({ provider: 'yookassa', paymentId: 'yk_1' }));

    expect(isFirstPayment).toHaveBeenCalledWith({ provider: 'yookassa', paymentId: 'yk_1' });
  });

  it('hashes the email the same however the payer typed it', async () => {
    const { service, google } = setup();

    await service.reportPurchase(purchase({ email: '  Payer@Test.COM ' }));

    expect(google.upload).toHaveBeenCalledWith(
      expect.objectContaining({ hashedEmail: PAYER_EMAIL_SHA256 }),
    );
  });

  it.each([
    ['absent', undefined],
    ['blank', '   '],
  ])('sends no hashed email when it is %s', async (_case, email) => {
    const { service, google } = setup();

    await service.reportPurchase(purchase({ email }));

    expect(google.upload.mock.calls[0][0]).not.toHaveProperty('hashedEmail');
  });

  it('reads only valid click ids back from the payment metadata', async () => {
    const { service, google } = setup();

    await service.reportPurchase(
      purchase({
        metadata: { email: 'payer@test.com', toltReferralId: 't', msclkid: 'ms-1', gclid: 'g 1' },
      }),
    );

    expect(google.upload).toHaveBeenCalledWith(
      expect.objectContaining({ clickIds: { msclkid: 'ms-1' } }),
    );
  });

  it('still uploads with no click ids, so the hashed email can match it', async () => {
    const { service, google } = setup();

    await service.reportPurchase(purchase({ metadata: null }));

    expect(google.upload).toHaveBeenCalledWith(
      expect.objectContaining({ clickIds: {}, hashedEmail: PAYER_EMAIL_SHA256 }),
    );
  });
});

describe('AdConversionsService.reportPurchase — what is not a conversion', () => {
  it('uploads nothing for a payer who has paid before', async () => {
    const { service, google, microsoft } = setup({ isFirstPayment: async () => false });

    await service.reportPurchase(purchase());

    expect(google.upload).not.toHaveBeenCalled();
    expect(microsoft.upload).not.toHaveBeenCalled();
  });

  it.each([0, -1])('uploads nothing for a payment worth %s', async (value) => {
    const { service, google, isFirstPayment } = setup();

    await service.reportPurchase(purchase({ value }));

    expect(google.upload).not.toHaveBeenCalled();
    expect(isFirstPayment).not.toHaveBeenCalled();
  });
});

describe('AdConversionsService.reportPurchase — failures never reach the webhook', () => {
  it('uploads to the other platform and reports the failure when one platform fails', async () => {
    const { service, microsoft, track } = setup({
      google: uploader('google_ads', async () => {
        throw new Error('quota exceeded');
      }),
    });

    await expect(service.reportPurchase(purchase())).resolves.toBeUndefined();

    expect(microsoft.upload).toHaveBeenCalled();
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      event: 'payment_error',
      kind: 'ad_conversion_failed',
      provider: 'whop',
      userId: 4821,
      paymentId: 'pay_1',
      reason: 'google_ads: quota exceeded',
    });
  });

  it('reports the failure when the first-payment check itself fails', async () => {
    const { service, google, track } = setup({
      isFirstPayment: async () => {
        throw new Error('db down');
      },
    });

    await expect(
      service.reportPurchase(purchase({ provider: 'yookassa' })),
    ).resolves.toBeUndefined();

    expect(google.upload).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'ad_conversion_failed',
        provider: 'yookassa',
        reason: 'db down',
      }),
    );
  });

  it('reports nothing when every upload succeeds', async () => {
    const { service, track } = setup();

    await service.reportPurchase(purchase());

    expect(track).not.toHaveBeenCalled();
  });
});
