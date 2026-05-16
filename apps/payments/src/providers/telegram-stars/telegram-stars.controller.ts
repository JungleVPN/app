import * as process from 'node:process';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CreateTelegramStarsInvoiceDto,
  TelegramStarsInvoiceResponse,
  TelegramStarsPaymentSucceededDto,
} from '@workspace/types';
import type { Response } from 'express';
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

  /**
   * Proxies a Telegram sticker by file ID — fetches from Telegram server-side
   * and streams the bytes back, avoiding a cross-origin redirect to api.telegram.org.
   */
  @Get('sticker/:fileId')
  async getSticker(@Param('fileId') fileId: string, @Res() res: Response): Promise<void> {
    const url = await this.telegramStarsService.getStickerUrl(fileId);
    const upstream = await fetch(url);
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/octet-stream',
    );
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const reader = upstream.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  }

  private validateSecret(secret: string): void {
    const expected = process.env.INTER_SERVICE_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid inter-service secret');
    }
  }
}
