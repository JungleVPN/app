import * as process from 'node:process';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CreateTelegramStarsInvoiceDto,
  TelegramStarsInvoiceResponse,
  TelegramStarsPaymentSucceededDto,
} from '@workspace/types';
import { TelegramStarsService } from './telegram-stars.service';

@Controller('telegram-stars')
export class TelegramStarsController {
  constructor(private readonly telegramStarsService: TelegramStarsService) {}

  /**
   * Called by the TMA frontend to obtain a Telegram Stars invoice link.
   * Returns { invoiceLink } which the TMA opens via WebApp.openInvoice().
   */
  @Post('create-invoice')
  async createInvoice(
    @Body() dto: CreateTelegramStarsInvoiceDto,
  ): Promise<TelegramStarsInvoiceResponse> {
    return this.telegramStarsService.createInvoice(dto);
  }

  /**
   * Internal endpoint — called by apps/bot after receiving message:successful_payment.
   * Guarded by the same inter-service secret used elsewhere in the monorepo.
   */
  @Post('payment-succeeded')
  @HttpCode(200)
  async paymentSucceeded(
    @Headers('x-service-secret') secret: string,
    @Body() dto: TelegramStarsPaymentSucceededDto,
  ): Promise<{ ok: boolean }> {
    this.validateSecret(secret);
    return this.telegramStarsService.handlePaymentSucceeded(dto);
  }

  private validateSecret(secret: string): void {
    const expected = process.env.INTER_SERVICE_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid inter-service secret');
    }
  }
}
