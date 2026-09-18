import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import type { YookassaWebhookNotification } from '@workspace/types';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicYookassaSessionDto,
  type CreateYookassaSessionDto,
  type PaymentSession,
} from '@workspace/types';
import { AuthenticatedUserId } from '../../auth/authenticated-user.decorator';
import { ClientUserGuard } from '../../auth/client-user.guard';
import { RemnaUserResolverService } from '../../auth/remna-user-resolver.service';
import { InterServiceGuard } from '../../guards/inter-service.guard';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller('yookassa')
export class YookassaController {
  constructor(
    private readonly yookassaService: YookassaService,
    private readonly remnaUserResolver: RemnaUserResolverService,
  ) {}

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

  /**
   * Same status, without a credential: the RU checkout is anonymous, so the
   * payer returning from YooKassa has nothing to authenticate with. Knowledge
   * of the payment id is the claim, and the answer carries only the status.
   */
  @Get('public-payment-status/:id')
  getPublicPaymentStatus(@Param('id') id: string) {
    return this.yookassaService.getPublicPaymentStatus(id);
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

  /**
   * Anonymous RU checkout: the payer has typed an email and nothing else.
   *
   * YooKassa payments are recorded against a remnawave user, so unlike the
   * Paddle/Stripe public routes — where the account is created by the webhook
   * once money has actually moved — the account has to be resolved before the
   * payment exists. It is found-or-created from the email, which grants no
   * access on its own: a web signup is created already expired (see
   * UserService.createUser), so a stranger typing an address into this route
   * gets them nothing.
   *
   * An email that already has an active saved payment method is refused with
   * the 409 the checkout page recognises: an unauthenticated caller has proved
   * nothing but knowledge of the address, so it is never told anything about
   * the subscription behind it — the page asks them to log in instead.
   */
  @Post('public-create-session')
  @UseGuards(PublicCheckoutRateLimitGuard)
  async createPublicPaymentSession(
    @Body() dto: CreatePublicYookassaSessionDto,
    @Headers('origin') origin?: string,
  ): Promise<PaymentSession> {
    const email = dto.email?.trim().toLocaleLowerCase() ?? '';
    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    await this.refuseIfAlreadySubscribed(email);

    const userId = await this.remnaUserResolver.resolveOrCreateByEmail(email, {
      inviterId: dto.inviterId,
      origin,
    });

    return this.yookassaService.createPaymentSession({
      userId,
      selectedPeriod: dto.selectedPeriod,
      save_payment_method: true,
      confirmation: { type: 'redirect', return_url: dto.returnUrl },
    });
  }

  /**
   * Refuses an email whose account already pays: the saved methods are read
   * straight from our own DB, so this costs no YooKassa round trip. An email
   * with no account at all cannot have one.
   */
  private async refuseIfAlreadySubscribed(email: string): Promise<void> {
    const userId = await this.remnaUserResolver.findByEmail(email);
    if (userId == null) return;

    const methods = await this.yookassaService.getActiveSavedMethods(userId);
    if (methods.length > 0) {
      throw new ConflictException({
        code: ACTIVE_SUBSCRIPTION_CODE,
        message: 'This email already has an active subscription',
      });
    }
  }
}
