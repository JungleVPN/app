import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import type { RemnawebhookPayload } from '@workspace/types';
import { REMNAWAVE_EVENTS } from '@workspace/types';
import { AutopaymentService } from './autopayment.service';

/**
 * Receives forwarded Remnawave panel events from the webhook service.
 * Routes each event to the appropriate handler based on meta.expiration hours.
 *
 * meta.expiration is a signed integer: negative = hours before expiry, positive = hours after.
 */
@Controller()
export class AutopaymentController {
  private readonly logger = new Logger(AutopaymentController.name);

  constructor(private readonly autopaymentService: AutopaymentService) {}

  @Post('remnawave-event')
  @HttpCode(200)
  async handleRemnaEvent(@Body() payload: RemnawebhookPayload) {
    this.logger.log(`Received remnawave event: ${payload.event}`);

    if (payload.event === REMNAWAVE_EVENTS.USER.EXPIRED) {
      this.terminateSavedMethods(payload);
      return { ok: true };
    }

    if (payload.event !== REMNAWAVE_EVENTS.USER.EXPIRATION) {
      this.logger.warn(`Unhandled remnawave event: ${payload.event}`);
      return { ok: true };
    }

    const hours = payload.meta?.expiration ?? null;

    if (hours !== null && hours > 0) {
      // user.expired is delivered once; reminders after expiry retry its termination
      this.terminateSavedMethods(payload);
    } else if (hours === -24) {
      // Fire-and-forget: retries happen internally, don't block the webhook response
      this.autopaymentService.init(payload).catch((err) => {
        this.logger.error(`Unhandled error in autopayment flow: ${err.message}`);
      });
    } else if (hours === -48) {
      this.autopaymentService.checkAndNotifyExpiry48h(payload).catch((err) => {
        this.logger.error(`Unhandled error in 48h expiry check: ${err.message}`);
      });
    } else {
      this.logger.warn(`Unhandled expiration hours in user.expiration event: ${hours}`);
    }

    return { ok: true };
  }

  private terminateSavedMethods(payload: RemnawebhookPayload): void {
    this.autopaymentService.terminateSavedMethods(payload).catch((err) => {
      this.logger.error(`Failed to terminate saved methods: ${err.message}`);
    });
  }
}
