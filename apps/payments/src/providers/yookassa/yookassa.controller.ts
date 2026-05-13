import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  Post,
} from '@nestjs/common';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import {
  type CreateYookassaSessionDto,
  type PaymentSession,
  type PaymentWebhookNotification,
} from '@workspace/types';

@Controller('yookassa')
export class YookassaController {
  constructor(private readonly yookassaService: YookassaService) {}

  /** Yookassa webhook endpoint — IP validated inside the service */
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() payload: PaymentWebhookNotification, @Ip() ip: string) {
    await this.yookassaService.handleWebhook(payload, ip);
    return { ok: true };
  }

  // ── Saved payment methods (must be before :id to avoid route conflicts) ─

  /** List active saved payment methods for a user */
  @Get('saved-methods/:userId')
  getActiveSavedMethods(@Param('userId') userId: string) {
    return this.yookassaService.getActiveSavedMethods(userId);
  }

  /**
   * Hard-delete a saved payment method owned by `userId`.
   *
   * The `userId` is part of the route so a user cannot delete someone else's
   * saved method by guessing an id. 404 if the row doesn't exist or belongs
   * to a different user.
   */
  @Delete('saved-methods/:userId/:id')
  async deleteSavedMethod(
    @Param('userId') userId: string,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.yookassaService.deletePaymentMethod(id, userId);
    return { ok: true };
  }

  // ── Payments ───────────────────────────────────────────────────────

  /** List all Yookassa payments, newest first */
  @Get()
  listPayments() {
    return this.yookassaService.listPayments();
  }

  /** Get a single Yookassa payment by id */
  @Get(':id')
  getPaymentById(@Param('id') id: string) {
    return this.yookassaService.getPaymentById(id);
  }

  /**
   * Create a one-shot payment session via YooKassa.
   * Saves the payment method by default UNLESS the user has explicitly opted
   * out (i.e. they previously had saved methods but disabled all of them).
   */
  @Post('create-session')
  createPaymentSession(@Body() body: CreateYookassaSessionDto): Promise<PaymentSession> {
    return this.yookassaService.createPaymentSession(body);
  }
}
