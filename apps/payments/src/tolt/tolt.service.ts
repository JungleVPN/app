import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ToltReferral } from '@workspace/database';
import { Repository } from 'typeorm';
import { FxRateService } from './fx-rate.service';
import { ToltClient } from './tolt.client';

export type ConversionCurrency = 'EUR' | 'RUB';

export type ReportConversionInput = {
  userId: string;
  /** Which provider settled the charge. New providers need no Tolt-side work. */
  provider: string;
  /** The provider's charge id — invoice id, YooKassa payment id, etc. */
  chargeId: string;
  /** Amount actually charged, in major units of `currency`. */
  amount: number;
  currency: ConversionCurrency;
  periodMonths: number;
  purpose?: string;
};

export type CaptureReferralInput = {
  userId: string;
  referralCode: string;
  partnerId: string;
  clickId?: string | null;
  email?: string | null;
};

/** Tolt accepts only these two; 3- and 6-month plans have no representation. */
const INTERVAL_BY_MONTHS: Record<number, 'month' | 'year'> = { 1: 'month', 12: 'year' };

@Injectable()
export class ToltService {
  private readonly logger = new Logger(ToltService.name);

  constructor(
    @InjectRepository(ToltReferral) private readonly repository: Repository<ToltReferral>,
    private readonly client: ToltClient,
    private readonly fxRate: FxRateService,
  ) {}

  /**
   * Records a referred user as a Tolt lead and stores the attribution.
   *
   * Runs on the capture path rather than at payment time so partners see a
   * click → lead → conversion funnel, and so the failure-prone registration
   * call happens where retrying is free.
   *
   * Write-once: the first affiliate to refer a user keeps the credit, matching
   * the "attribute only on a first-ever payment" rule the Stripe provider
   * already enforces. Never throws — capture is an optional enrichment of a
   * request that must succeed regardless.
   */
  async captureReferral(input: CaptureReferralInput): Promise<void> {
    try {
      const existing = await this.repository.findOneBy({ userId: input.userId });
      if (existing) {
        this.logger.log(
          `User ${input.userId} already attributed to partner ${existing.partnerId} — ignoring capture for ${input.partnerId}`,
        );
        return;
      }

      // Registration is best-effort: a null customer id still persists the
      // attribution, and reportConversion registers the customer on first
      // payment rather than losing the commission.
      const toltCustomerId = await this.registerCustomer({
        userId: input.userId,
        partnerId: input.partnerId,
        clickId: input.clickId,
        email: input.email,
        status: 'lead',
      });

      await this.repository.save({
        userId: input.userId,
        referralCode: input.referralCode,
        partnerId: input.partnerId,
        clickId: input.clickId ?? null,
        toltCustomerId,
      });

      this.logger.log(`Captured referral for user ${input.userId} from partner ${input.partnerId}`);
    } catch (error) {
      this.logger.error(
        `Failed to capture referral for user ${input.userId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Reports a settled payment to Tolt so its program flow can derive the
   * commission (60% first payment, 30% on renewals).
   *
   * Provider-agnostic by design: a new payment provider adds a call site here
   * and nothing else — Tolt never integrates with the processor itself.
   *
   * Never throws. This runs inside provider webhook handlers where an exception
   * would trigger a redelivery and risk extending a subscription twice; a
   * missed report is recoverable, a double fulfilment is not.
   */
  async reportConversion(input: ReportConversionInput): Promise<void> {
    try {
      if (input.purpose === 'extra_device') return;

      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        this.logger.warn(
          `Refusing to report a non-positive amount (${input.amount}) for charge ${input.chargeId}`,
        );
        return;
      }

      const referral = await this.repository.findOneBy({ userId: input.userId });
      if (!referral) return;

      const amountCents = await this.toEurCents(input);
      if (amountCents === null) return;

      const customerId = await this.resolveCustomerId(referral);
      if (!customerId) {
        this.logger.error(
          `No Tolt customer for user ${input.userId} — charge ${input.chargeId} not reported`,
        );
        return;
      }

      await this.client.createTransaction({
        amount: amountCents,
        customer_id: customerId,
        billing_type: 'subscription',
        charge_id: input.chargeId,
        click_id: referral.clickId,
        source: input.provider,
        ...(INTERVAL_BY_MONTHS[input.periodMonths]
          ? { interval: INTERVAL_BY_MONTHS[input.periodMonths] }
          : {}),
      });

      this.logger.log(
        `Reported ${amountCents} EUR cents to Tolt for user ${input.userId} (charge ${input.chargeId}, partner ${referral.partnerId})`,
      );
    } catch (error) {
      // Swallowed deliberately — see the method contract.
      this.logger.error(
        `Failed to report conversion for charge ${input.chargeId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Converts the charged amount to EUR minor units.
   * Null means the conversion could not be trusted and reporting must be skipped.
   */
  private async toEurCents(input: ReportConversionInput): Promise<number | null> {
    if (input.currency === 'EUR') return Math.round(input.amount * 100);

    const converted = await this.fxRate.convertRubToEurCents(input.amount);
    if (converted === null) {
      this.logger.error(
        `No FX rate available — charge ${input.chargeId} (${input.amount} RUB) not reported`,
      );
    }
    return converted;
  }

  /**
   * The stored Tolt customer id, registering one if lead capture had failed.
   * Null when registration is still not possible.
   */
  private async resolveCustomerId(referral: ToltReferral): Promise<string | null> {
    if (referral.toltCustomerId) return referral.toltCustomerId;

    this.logger.warn(
      `User ${referral.userId} has no Tolt customer — registering now before reporting`,
    );

    const toltCustomerId = await this.registerCustomer({
      userId: referral.userId,
      partnerId: referral.partnerId,
      clickId: referral.clickId,
      status: 'active',
    });
    if (!toltCustomerId) return null;

    await this.repository.update({ userId: referral.userId }, { toltCustomerId });
    return toltCustomerId;
  }

  /**
   * Creates the Tolt customer, returning null on failure rather than throwing.
   *
   * `email` is Tolt's identifier field and is documented as accepting "an email
   * or a unique ID" — the remnawave userId is used when no email exists, which
   * is the norm for Telegram-only signups.
   */
  private async registerCustomer(input: {
    userId: string;
    partnerId: string;
    clickId?: string | null;
    email?: string | null;
    status: 'lead' | 'active';
  }): Promise<string | null> {
    try {
      const customer = await this.client.createCustomer({
        email: input.email || input.userId,
        partner_id: input.partnerId,
        customer_id: input.userId,
        click_id: input.clickId ?? undefined,
        status: input.status,
      });
      return customer.id;
    } catch (error) {
      this.logger.error(
        `Tolt customer registration failed for user ${input.userId}: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
