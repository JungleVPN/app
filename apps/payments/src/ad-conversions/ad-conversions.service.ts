import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AdminService } from '@payments/admin/admin.service';
import { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import type { RemnaUserId } from '@workspace/types';
import { adClickMetadata } from './ad-click-metadata';
import {
  AD_CONVERSION_UPLOADERS,
  type AdConversion,
  type AdConversionUploader,
} from './ad-conversion-uploader';

/** A settled payment, as a provider's webhook hands it over. */
export type PaidPurchase = {
  provider: 'whop' | 'yookassa';
  paymentId: string;
  userId: RemnaUserId;
  paidAt: Date;
  value: number;
  currency: string;
  /** The provider's payment metadata, where checkout stamped the ad click ids. */
  metadata: Record<string, unknown> | null | undefined;
  email: string | undefined;
};

/**
 * Reports a customer's first paid purchase to Google Ads and Microsoft Ads.
 * Called after fulfilment, so it never throws: a throw would make the provider
 * redeliver a webhook its idempotency guard then drops. Failures are reported
 * as `payment_error` instead, and a later re-upload is safe because every
 * platform drops a repeat of the same payment.
 */
@Injectable()
export class AdConversionsService {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsClient: AnalyticsClientService,
    @Inject(AD_CONVERSION_UPLOADERS) private readonly uploaders: AdConversionUploader[],
  ) {}

  async reportPurchase(purchase: PaidPurchase): Promise<void> {
    if (purchase.value <= 0) return;
    try {
      const isFirst = await this.adminService.isFirstPayment({
        provider: purchase.provider,
        paymentId: purchase.paymentId,
      });
      if (!isFirst) return;
    } catch (error) {
      await this.reportFailure(purchase, errorMessage(error));
      return;
    }

    const conversion = toConversion(purchase);
    const results = await Promise.allSettled(
      this.uploaders.map((uploader) => uploader.upload(conversion)),
    );
    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        const platform = this.uploaders[index].platform;
        await this.reportFailure(purchase, `${platform}: ${errorMessage(result.reason)}`);
      }
    }
  }

  private async reportFailure(purchase: PaidPurchase, reason: string): Promise<void> {
    await this.analyticsClient.track({
      event: 'payment_error',
      kind: 'ad_conversion_failed',
      provider: purchase.provider,
      userId: purchase.userId,
      paymentId: purchase.paymentId,
      reason,
    });
  }
}

function toConversion(purchase: PaidPurchase): AdConversion {
  const email = purchase.email?.trim().toLowerCase();
  return {
    orderId: purchase.paymentId,
    convertedAt: purchase.paidAt,
    value: purchase.value,
    currency: purchase.currency,
    clickIds: adClickMetadata(purchase.metadata),
    ...(email ? { hashedEmail: createHash('sha256').update(email).digest('hex') } : {}),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
