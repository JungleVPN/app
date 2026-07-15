import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  type RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { PaymentWebhookNotification, TRemnawaveWebhookEvent } from '@workspace/types';
import { RemnaSignatureGuard } from './remna-signature.guard';
import { WebhookService } from './webhook.service';

@Controller()
export class WebhookController {
  readonly logger = new Logger(WebhookService.name);
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Remnawave webhook — called by the Remnawave panel.
   * Authenticated by RemnaSignatureGuard (HMAC-SHA256 of the JSON body),
   * so the handler receives only pre-validated payloads.
   */
  @UseGuards(RemnaSignatureGuard)
  @Post('remnawave')
  async handleRemnaEvents(@Body() payload: TRemnawaveWebhookEvent) {
    await this.webhookService.processRemnaEvent(payload);
    return { ok: true };
  }

  @Post('payment/yookassa')
  @HttpCode(200)
  async handleYookassaEvents(
    @Headers('x-forwarded-for') xForwardedFor: string,
    @Headers('x-real-ip') xRealIp: string,
    @Body() payload: PaymentWebhookNotification,
  ) {
    this.logger.log(`Received Yookassa webhook`);
    await this.webhookService.forwardYookassaWebhook(payload, xForwardedFor || xRealIp || '');
    return { ok: true };
  }

  @Post('payment/stripe')
  @HttpCode(200)
  async handleStripeEvents(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Record<string, unknown>>,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { received: false, error: 'Missing raw body' };
    }

    await this.webhookService.forwardStripeWebhook(rawBody, signature);
    return { received: true };
  }
}
