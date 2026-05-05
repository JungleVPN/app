import * as process from 'node:process';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  InternalServerErrorException,
  Ip,
  Logger,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import { ValidatePaymentRequest } from '@payments/utils/utils';
import { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import {
  type CreateYookassaSessionDto,
  PaymentSession,
  Payments,
  type PaymentWebhookNotification,
} from '@workspace/types';
import { Repository } from 'typeorm';
import { YooKassaProvider } from './yookassa.provider';

@Controller('yookassa')
export class YookassaController {
  private readonly logger = new Logger(YookassaController.name);

  constructor(
    @InjectRepository(YookassaPayment)
    private readonly yookassaPaymentRepo: Repository<YookassaPayment>,
    @InjectRepository(SavedPaymentMethod)
    private readonly savedMethodRepo: Repository<SavedPaymentMethod>,
    private readonly yookassaService: YookassaService,
    private readonly yookassaProvider: YooKassaProvider,
    private readonly validatePaymentRequest: ValidatePaymentRequest,
  ) {}

  /** Yookassa webhook endpoint — IP validated inside the provider */
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() payload: PaymentWebhookNotification, @Ip() ip: string) {
    await this.yookassaService.handleWebhook(payload, ip);
    return { ok: true };
  }

  // ── Saved payment methods (must be before :id to avoid route conflicts) ─

  /** List active saved payment methods for a user */
  @Get('saved-methods/:userId')
  async getSavedMethods(@Param('userId') userId: string) {
    return this.savedMethodRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Hard-delete a saved payment method owned by `userId`.
   *
   * The `userId` is part of the route (not just the id) so a user cannot
   * delete someone else's saved method by guessing an id. 404 if the row
   * doesn't exist or belongs to a different user.
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
  async list() {
    return this.yookassaPaymentRepo.find({ order: { createdAt: 'DESC' } });
  }

  /** Get a single Yookassa payment by id */
  @Get(':id')
  async getById(@Param('id') id: string) {
    const payment = await this.yookassaPaymentRepo.findOneBy({ id });
    if (!payment) throw new NotFoundException(`Yookassa payment ${id} not found`);
    return payment;
  }

  /**
   * Create a one-shot payment session via YooKassa.
   * Saves the payment method by default UNLESS the user has explicitly opted out
   * (i.e. they previously had saved methods but disabled all of them).
   */
  @Post('create-session')
  async createSession(@Body() body: CreateYookassaSessionDto): Promise<PaymentSession> {
    this.validatePaymentRequest.validateAmount(body.amount.value);
    this.validatePaymentRequest.validatePeriod(body.selectedPeriod);

    const { userId, selectedPeriod, ...paymentFields } = body;

    const request: Payments.CreatePaymentRequest = {
      ...paymentFields,
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url:
          body.confirmation?.type === 'redirect'
            ? body.confirmation.return_url
            : process.env.RETURN_URL,
      },
    };

    const payment = await this.yookassaProvider.create(request);
    const confirmationUrl = this.extractRedirectUrl(payment);

    if (!confirmationUrl) {
      throw new InternalServerErrorException(
        `YooKassa did not return a confirmation URL for payment ${payment.id}`,
      );
    }

    const record = this.yookassaPaymentRepo.create({
      id: payment.id,
      url: confirmationUrl,
      status: payment.status,
      amount: request.amount.value,
      currency: 'RUB',
      userId,
      selectedPeriod,
      description: payment.description ?? null,
      paidAt: null,
    });
    await this.yookassaPaymentRepo.save(record);

    this.logger.log(`Created Yookassa payment session ${payment.id} for user ${userId}`);
    return { id: payment.id, url: confirmationUrl };
  }

  /** Narrow `confirmation` to the `redirect` variant and return its URL, if any. */
  private extractRedirectUrl(payment: Payments.IPayment): string | undefined {
    const { confirmation } = payment;
    if (confirmation && confirmation.type === 'redirect') {
      return confirmation.confirmation_url;
    }
    return undefined;
  }
}
