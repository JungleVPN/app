import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import type { YookassaWebhookNotification } from '@workspace/types';
import { type CreateYookassaSessionDto, type PaymentSession } from '@workspace/types';
import { AuthenticatedUserId } from '../../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../../auth/client-user.guard';
import { InterServiceGuard } from '../../guards/inter-service.guard';

@Controller('yookassa')
export class YookassaController {
  constructor(private readonly yookassaService: YookassaService) {}

  /**
   * Yookassa webhook endpoint — IP validated inside the service.
   * Only apps/webhook is a legitimate caller, so it's also gated behind the
   * inter-service secret in addition to the IP allowlist check below.
   */
  @Post('webhook')
  @HttpCode(200)
  @UseGuards(InterServiceGuard)
  async webhook(@Body() payload: YookassaWebhookNotification, @Ip() ip: string) {
    await this.yookassaService.handleWebhook(payload, ip);
    return { ok: true };
  }

  // ── Saved payment methods ──────────────────────────────────────────
  // userId is derived from the validated credential, never from the URL.

  /** List active saved payment methods for the authenticated user */
  @Get('saved-methods')
  @UseGuards(ClientUserGuard)
  getActiveSavedMethods(@AuthenticatedUserId() userId: number) {
    return this.yookassaService.getActiveSavedMethods(userId);
  }

  /** Hard-delete a saved payment method belonging to the authenticated user */
  @Delete('saved-methods/:id')
  @UseGuards(ClientUserGuard)
  async deleteSavedMethod(
    @Param('id') id: string,
    @AuthenticatedUserId() userId: number,
  ): Promise<{ ok: true }> {
    await this.yookassaService.deletePaymentMethod(id, userId);
    return { ok: true };
  }

  /**
   * Status of one of the caller's own payments — used by the post-payment
   * return page, which sees the same `return_url` whether the payment
   * succeeded or was cancelled.
   */
  @Get('payment-status/:id')
  @UseGuards(ClientUserGuard)
  getPaymentStatus(@Param('id') id: string, @AuthenticatedUserId() userId: number) {
    return this.yookassaService.getPaymentStatusForUser(id, userId);
  }

  // ── Internal payment records — inter-service only ──────────────────

  /** List all Yookassa payments, newest first — internal use only */
  @Get()
  @UseGuards(InterServiceGuard)
  listPayments() {
    return this.yookassaService.listPayments();
  }

  /** Get a single Yookassa payment by id — internal use only */
  @Get(':id')
  @UseGuards(InterServiceGuard)
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
