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
  email: string;
};

/** The tracking parameter this program uses. */
const AFF_PARAM = 'aff';

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
   * Stores the affiliate attribution currently live in the user's browser.
   *
   * Nothing is sent to Tolt here. A Tolt customer's `partner_id` is fixed at
   * creation and cannot be moved, so registering one before the user pays would
   * permanently award the sale to whoever referred them first — even if that
   * link had long since expired by the time they bought.
   *
   * Until the user converts the row is simply overwritten, deferring the choice
   * of partner to the browser's own cookie — which the landing flow replaces on
   * every new affiliate link. Whoever is live when the payment lands is paid.
   *
   * After conversion the row is frozen — renewal commissions belong to the
   * partner who made the sale.
   *
   * Never throws: capture is an optional enrichment of a request that must
   * succeed regardless.
   */
  async captureReferral(input: CaptureReferralInput): Promise<void> {
    try {
      const existing = await this.repository.findOneBy({ userId: input.userId });
      if (existing?.convertedAt) {
        this.logger.log(
          `User ${input.userId} already converted under partner ${existing.partnerId} — ignoring later referrals`,
        );
        return;
      }

      await this.repository.save({
        userId: input.userId,
        referralCode: input.referralCode,
        partnerId: input.partnerId,
        clickId: input.clickId ?? null,
        email: input.email,
        toltCustomerId: null,
        convertedAt: null,
      });

      this.logger.log(`Captured referral for user ${input.userId} from partner ${input.partnerId}`);
    } catch (error) {
      this.logger.error(
        `Failed to capture referral for user ${input.userId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Records a click on a partner's link and resolves the code to its partner.
   *
   * Called once per affiliate landing, from the public click endpoint, so the
   * browser can store the resolved partner alongside the code. Doing it here
   * rather than in the browser keeps the API key server-side.
   *
   * Null when Tolt does not recognise the code — someone following a mistyped
   * or retired link — which the caller reports as "not found" rather than an
   * error, since it is a visitor-facing path.
   */
  async recordClick(input: {
    affCode: string;
    page?: string | null;
    referrer?: string | null;
  }): Promise<{ partnerId: string; clickId: string } | null> {
    try {
      const click = await this.client.createClick({
        param: AFF_PARAM,
        value: input.affCode,
        page: input.page ?? undefined,
        referrer: input.referrer ?? undefined,
      });
      return { partnerId: click.partner_id, clickId: click.id };
    } catch (error) {
      this.logger.warn(
        `Could not resolve aff code "${input.affCode}": ${(error as Error).message}`,
      );
      return null;
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
   * The Tolt customer for this user, created on their first payment.
   *
   * Creation and freezing happen together: the moment a customer exists in Tolt
   * its partner is fixed, so the local row must stop accepting new referrals at
   * the same instant or the two would disagree with no way to reconcile them.
   *
   * Null when creation failed, in which case nothing is reported — a
   * transaction posted against no customer would be unattributable.
   */
  private async resolveCustomerId(referral: ToltReferral): Promise<string | null> {
    if (referral.toltCustomerId) return referral.toltCustomerId;

    const toltCustomerId = await this.registerCustomer({
      userId: referral.userId,
      partnerId: referral.partnerId,
      clickId: referral.clickId,
      email: referral.email,
      status: 'active',
    });
    if (!toltCustomerId) return null;

    await this.repository.update(
      { userId: referral.userId },
      { toltCustomerId, convertedAt: new Date() },
    );

    this.logger.log(
      `User ${referral.userId} converted under partner ${referral.partnerId} — attribution frozen`,
    );

    return toltCustomerId;
  }

  /**
   * Creates the Tolt customer, returning null on failure rather than throwing.
   */
  private async registerCustomer(input: {
    userId: string;
    partnerId: string;
    clickId?: string | null;
    email: string;
    status: 'lead' | 'active';
  }): Promise<string | null> {
    try {
      const customer = await this.client.createCustomer({
        email: input.email,
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
