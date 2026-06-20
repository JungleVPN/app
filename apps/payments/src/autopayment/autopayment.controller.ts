import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import type { RemnawebhookPayload } from '@workspace/types';
import { REMNAWAVE_EVENTS } from '@workspace/types';

const EXPIRES_IN_24H = REMNAWAVE_EVENTS.USER.EXPIRE_NOTIFY_EXPIRES_IN_24_HOURS;
const EXPIRES_IN_48H = REMNAWAVE_EVENTS.USER.EXPIRE_NOTIFY_EXPIRES_IN_48_HOURS;

import { AutopaymentService } from './autopayment.service';

/**
 * Receives forwarded Remnawave panel events from the webhook service.
 * Routes each event to the appropriate handler.
 */
@Controller()
export class AutopaymentController {
  private readonly logger = new Logger(AutopaymentController.name);

  constructor(private readonly autopaymentService: AutopaymentService) {}

  @Post('remnawave-event')
  @HttpCode(200)
  async handleRemnaEvent(@Body() payload: RemnawebhookPayload) {
    this.logger.log(`Received remnawave event: ${payload.event}`);

    switch (payload.event) {
      case EXPIRES_IN_24H:
        // Fire-and-forget: retries happen internally, don't block the webhook response
        this.autopaymentService.init(payload).catch((err) => {
          this.logger.error(`Unhandled error in autopayment flow: ${err.message}`);
        });
        break;
      case EXPIRES_IN_48H:
        this.autopaymentService.checkAndNotifyExpiry48h(payload).catch((err) => {
          this.logger.error(`Unhandled error in 48h expiry check: ${err.message}`);
        });
        break;
      default:
        this.logger.warn(`Unhandled remnawave event: ${payload.event}`);
    }

    return { ok: true };
  }
}
