import 'reflect-metadata';
import { createHmac } from 'node:crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicWhopCheckoutDto,
  type PayPublicWhopCheckoutDto,
} from '@workspace/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientUserGuard } from '../../auth/client-user.guard';
import { PublicCheckoutRateLimitGuard } from '../../guards/public-checkout-rate-limit.guard';
import { PublicPromoCodeRateLimitGuard } from '../../guards/public-promo-code-rate-limit.guard';
import { WhopController } from './whop.controller';

const PAYER_IP = '203.0.113.5';

const controllerWith = (
  overrides: {
    resolveCheckoutPlanId?: ReturnType<typeof vi.fn>;
    hasActiveSubscription?: ReturnType<typeof vi.fn>;
  } = {},
) => {
  const whopProvider = {
    resolveCheckoutPlanId:
      overrides.resolveCheckoutPlanId ?? vi.fn().mockResolvedValue('plan_month_1'),
    hasActiveSubscription: overrides.hasActiveSubscription ?? vi.fn().mockResolvedValue(false),
    checkoutTarget: vi.fn(async (planId: string) => ({
      accountId: 'biz_test',
      planId,
      renews: true,
    })),
    payCheckout: vi
      .fn()
      .mockResolvedValue({ paymentId: 'pay_1', status: 'open', clientSecret: 'sec_1' }),
    checkPromoCode: vi.fn().mockResolvedValue({
      code: 'SPRING20',
      promoType: 'percentage',
      amountOff: 20,
      currency: 'usd',
    }),
  };
  const controller = new WhopController(whopProvider as never);
  return { controller, whopProvider };
};

describe('WhopController.createPublicCheckout', () => {
  const publicDto = (
    overrides: Partial<CreatePublicWhopCheckoutDto> = {},
  ): CreatePublicWhopCheckoutDto => ({
    email: 'payer@test.com',
    planId: 'whop-30',
    ...overrides,
  });

  it('returns the account and Whop plan to mount the card form for a valid, unsubscribed payer', async () => {
    const { controller, whopProvider } = controllerWith();

    await expect(controller.createPublicCheckout(publicDto(), PAYER_IP)).resolves.toEqual({
      accountId: 'biz_test',
      planId: 'plan_month_1',
      renews: true,
    });
    expect(whopProvider.resolveCheckoutPlanId).toHaveBeenCalledWith('whop-30', PAYER_IP);
  });

  it('normalises the email before checking it', async () => {
    const { controller, whopProvider } = controllerWith();

    await controller.createPublicCheckout(publicDto({ email: '  Payer@Test.com ' }), PAYER_IP);

    expect(whopProvider.hasActiveSubscription).toHaveBeenCalledWith('payer@test.com');
  });

  it.each([
    ['not-an-email'],
    [''],
    ['  '],
  ])('refuses the malformed email %j without ever reaching Whop', async (email) => {
    const { controller, whopProvider } = controllerWith();

    await expect(controller.createPublicCheckout(publicDto({ email }), PAYER_IP)).rejects.toThrow(
      BadRequestException,
    );
    expect(whopProvider.hasActiveSubscription).not.toHaveBeenCalled();
  });

  it('refuses a plan that is not on sale, before ever asking Whop about the email', async () => {
    const { controller, whopProvider } = controllerWith({
      resolveCheckoutPlanId: vi.fn().mockRejectedValue(new BadRequestException('Not on sale')),
    });

    await expect(
      controller.createPublicCheckout(publicDto({ planId: 'nope' }), PAYER_IP),
    ).rejects.toThrow(BadRequestException);
    expect(whopProvider.hasActiveSubscription).not.toHaveBeenCalled();
  });

  it('refuses a payer who already has an active Whop membership', async () => {
    const { controller } = controllerWith({
      hasActiveSubscription: vi.fn().mockResolvedValue(true),
    });

    const error = await controller
      .createPublicCheckout(publicDto(), PAYER_IP)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: ACTIVE_SUBSCRIPTION_CODE,
    });
  });
});

describe('WhopController.payPublicCheckout', () => {
  const payDto = (overrides: Partial<PayPublicWhopCheckoutDto> = {}): PayPublicWhopCheckoutDto => ({
    email: 'payer@test.com',
    planId: 'whop-30',
    confirmationToken: 'ctok_1',
    returnUrl: 'https://app.test/payment/success',
    ...overrides,
  });

  it('returns the payment Whop created for a valid, unsubscribed payer', async () => {
    const { controller } = controllerWith();

    await expect(
      controller.payPublicCheckout(payDto(), PAYER_IP, 'https://app.test'),
    ).resolves.toEqual({
      paymentId: 'pay_1',
      status: 'open',
      clientSecret: 'sec_1',
    });
  });

  it('charges the resolved Whop plan, forwarding the card, return page, referral, inviter and origin', async () => {
    const { controller, whopProvider } = controllerWith();

    await controller.payPublicCheckout(
      payDto({ email: '  Payer@Test.com ', toltReferralId: 'tolt_9', inviterId: 1337 }),
      PAYER_IP,
      'https://jungle-vpn.com',
    );

    expect(whopProvider.resolveCheckoutPlanId).toHaveBeenCalledWith('whop-30', PAYER_IP);
    expect(whopProvider.payCheckout).toHaveBeenCalledWith({
      email: 'payer@test.com',
      whopPlanId: 'plan_month_1',
      confirmationToken: 'ctok_1',
      returnUrl: 'https://app.test/payment/success',
      toltReferralId: 'tolt_9',
      inviterId: 1337,
      origin: 'https://jungle-vpn.com',
    });
  });

  it('forwards the promo code the payer applied', async () => {
    const { controller, whopProvider } = controllerWith();

    await controller.payPublicCheckout(payDto({ promoCode: 'SPRING20' }), PAYER_IP, undefined);

    expect(whopProvider.payCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ promoCode: 'SPRING20' }),
    );
  });

  it('refuses a promo code that is not text, without reaching Whop', async () => {
    const { controller, whopProvider } = controllerWith();

    await expect(
      controller.payPublicCheckout(payDto({ promoCode: 123 as never }), PAYER_IP, undefined),
    ).rejects.toThrow(BadRequestException);
    expect(whopProvider.resolveCheckoutPlanId).not.toHaveBeenCalled();
    expect(whopProvider.payCheckout).not.toHaveBeenCalled();
  });

  it('caps promo code guesses, since a refused code answers whether it exists', () => {
    const guards = Reflect.getMetadata('__guards__', WhopController.prototype.payPublicCheckout);

    expect(guards).toContain(PublicPromoCodeRateLimitGuard);
  });

  it('refuses a malformed email without charging', async () => {
    const { controller, whopProvider } = controllerWith();

    await expect(
      controller.payPublicCheckout(payDto({ email: 'nope' }), PAYER_IP, undefined),
    ).rejects.toThrow(BadRequestException);
    expect(whopProvider.payCheckout).not.toHaveBeenCalled();
  });

  it.each([
    [''],
    ['pm_1'],
    [undefined],
  ])('refuses the confirmation token %j without reaching Whop', async (confirmationToken) => {
    const { controller, whopProvider } = controllerWith();

    await expect(
      controller.payPublicCheckout(
        payDto({ confirmationToken: confirmationToken as string }),
        PAYER_IP,
        undefined,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(whopProvider.resolveCheckoutPlanId).not.toHaveBeenCalled();
    expect(whopProvider.payCheckout).not.toHaveBeenCalled();
  });

  it('refuses a plan that is not on sale without charging', async () => {
    const { controller, whopProvider } = controllerWith({
      resolveCheckoutPlanId: vi.fn().mockRejectedValue(new BadRequestException('Not on sale')),
    });

    await expect(controller.payPublicCheckout(payDto(), PAYER_IP, undefined)).rejects.toThrow(
      BadRequestException,
    );
    expect(whopProvider.payCheckout).not.toHaveBeenCalled();
  });

  it('refuses a payer who subscribed in the meantime, without charging', async () => {
    const { controller, whopProvider } = controllerWith({
      hasActiveSubscription: vi.fn().mockResolvedValue(true),
    });

    const error = await controller
      .payPublicCheckout(payDto(), PAYER_IP, undefined)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: ACTIVE_SUBSCRIPTION_CODE,
    });
    expect(whopProvider.payCheckout).not.toHaveBeenCalled();
  });
});

describe('WhopController.checkPublicPromoCode', () => {
  it('describes the discount a promo code gives the chosen plan', async () => {
    const { controller, whopProvider } = controllerWith();

    await expect(
      controller.checkPublicPromoCode({ planId: 'whop-30', promoCode: 'spring20' }, PAYER_IP),
    ).resolves.toEqual({
      code: 'SPRING20',
      promoType: 'percentage',
      amountOff: 20,
      currency: 'usd',
    });
    expect(whopProvider.resolveCheckoutPlanId).toHaveBeenCalledWith('whop-30', PAYER_IP);
    expect(whopProvider.checkPromoCode).toHaveBeenCalledWith({
      promoCode: 'spring20',
      whopPlanId: 'plan_month_1',
    });
  });

  it.each([
    [''],
    ['   '],
    [undefined],
    [123],
    [{ code: 'SPRING20' }],
  ])('refuses the promo code %j without reaching Whop', async (promoCode) => {
    const { controller, whopProvider } = controllerWith();

    await expect(
      controller.checkPublicPromoCode(
        { planId: 'whop-30', promoCode: promoCode as never },
        PAYER_IP,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(whopProvider.checkPromoCode).not.toHaveBeenCalled();
  });

  it('refuses a plan that is not on sale, without looking the code up', async () => {
    const { controller, whopProvider } = controllerWith({
      resolveCheckoutPlanId: vi.fn().mockRejectedValue(new BadRequestException('Not on sale')),
    });

    await expect(
      controller.checkPublicPromoCode({ planId: 'whop-old', promoCode: 'SPRING20' }, PAYER_IP),
    ).rejects.toThrow(BadRequestException);
    expect(whopProvider.checkPromoCode).not.toHaveBeenCalled();
  });

  it('caps promo code guesses on their own allowance, leaving the checkout allowance to checkouts', () => {
    const guards = Reflect.getMetadata('__guards__', WhopController.prototype.checkPublicPromoCode);

    expect(guards).toContain(PublicPromoCodeRateLimitGuard);
    expect(guards).not.toContain(PublicCheckoutRateLimitGuard);
  });
});

describe('WhopController.getPublicPaymentStatus', () => {
  it('answers whether the webhook has fulfilled the payment, by payment id alone', async () => {
    const status = { paymentId: 'pay_1', fulfilled: true };
    const whopProvider = { getPaymentStatus: vi.fn().mockResolvedValue(status) };
    const controller = new WhopController(whopProvider as never);

    await expect(controller.getPublicPaymentStatus('pay_1')).resolves.toEqual(status);
    expect(whopProvider.getPaymentStatus).toHaveBeenCalledWith('pay_1');
  });
});

describe('WhopController.webhook', () => {
  const SECRET = 'ws_test_secret';
  const BODY = JSON.stringify({ type: 'payment.succeeded', data: { id: 'pay_1' } });

  /** Signs `body` the way Whop does: Standard Webhooks, HMAC-SHA256 keyed by the raw secret. */
  const signedHeaders = (body: string, secret = SECRET) => {
    const id = 'msg_1';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', Buffer.from(secret, 'utf8'))
      .update(`${id}.${timestamp}.${body}`)
      .digest('base64');
    return {
      'webhook-id': id,
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${signature}`,
    };
  };

  const reqWith = (rawBody?: string) =>
    ({ rawBody: rawBody === undefined ? undefined : Buffer.from(rawBody) }) as never;

  const controllerWith = (
    handleWebhook: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(undefined),
  ) => {
    const whopProvider = { handleWebhook };
    return { controller: new WhopController(whopProvider as never), whopProvider };
  };

  let originalSecret: string | undefined;
  beforeEach(() => {
    originalSecret = process.env.WHOP_WEBHOOK_SECRET;
    process.env.WHOP_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.WHOP_WEBHOOK_SECRET;
    else process.env.WHOP_WEBHOOK_SECRET = originalSecret;
  });

  it('hands a correctly signed event to the provider and acknowledges it', async () => {
    const { controller, whopProvider } = controllerWith();

    const result = await controller.webhook(reqWith(BODY), signedHeaders(BODY));

    expect(result).toEqual({ received: true });
    expect(whopProvider.handleWebhook).toHaveBeenCalledWith(JSON.parse(BODY));
  });

  it('rejects a request with no raw body, since the signature cannot be verified without it', async () => {
    const { controller, whopProvider } = controllerWith();

    await expect(controller.webhook(reqWith(undefined), signedHeaders(BODY))).rejects.toThrow(
      BadRequestException,
    );
    expect(whopProvider.handleWebhook).not.toHaveBeenCalled();
  });

  it('rejects when WHOP_WEBHOOK_SECRET is not configured, rather than skip verification', async () => {
    delete process.env.WHOP_WEBHOOK_SECRET;
    const { controller, whopProvider } = controllerWith();

    await expect(controller.webhook(reqWith(BODY), signedHeaders(BODY))).rejects.toThrow(
      BadRequestException,
    );
    expect(whopProvider.handleWebhook).not.toHaveBeenCalled();
  });

  it.each([
    ['signed with another secret', (body: string) => signedHeaders(body, 'ws_attacker')],
    ['signed over a different body', () => signedHeaders('{"type":"payment.succeeded"}')],
    ['unsigned', () => ({})],
  ])('rejects a payload %s without processing it', async (_case, headersFor) => {
    const { controller, whopProvider } = controllerWith();

    await expect(controller.webhook(reqWith(BODY), headersFor(BODY))).rejects.toThrow(
      BadRequestException,
    );
    expect(whopProvider.handleWebhook).not.toHaveBeenCalled();
  });

  it('lets a processing failure propagate as a 5xx, so Whop retries the delivery', async () => {
    const { controller } = controllerWith(vi.fn().mockRejectedValue(new Error('boom')));

    await expect(controller.webhook(reqWith(BODY), signedHeaders(BODY))).rejects.toThrow('boom');
  });
});

describe('WhopController — authenticated routes', () => {
  const controllerWith = () => {
    const whopProvider = {
      getSubscriptionStatus: vi.fn().mockResolvedValue({ active: true, methods: [] }),
      cancelSubscription: vi
        .fn()
        .mockResolvedValue({ cancelAtPeriodEnd: true, accessUntil: '2026-10-26T10:00:00Z' }),
      resumeSubscription: vi.fn().mockResolvedValue({ cancelAtPeriodEnd: false }),
    };
    return { controller: new WhopController(whopProvider as never), whopProvider };
  };

  const guardsOf = (method: keyof WhopController) =>
    Reflect.getMetadata('__guards__', WhopController.prototype[method]) ?? [];

  it("returns the authenticated user's subscription status", async () => {
    const { controller, whopProvider } = controllerWith();

    await expect(controller.getSubscriptionStatus(1000)).resolves.toEqual({
      active: true,
      methods: [],
    });
    expect(whopProvider.getSubscriptionStatus).toHaveBeenCalledWith(1000);
  });

  it("cancels the authenticated user's own subscription", async () => {
    const { controller, whopProvider } = controllerWith();

    await expect(controller.cancelSubscription(1000)).resolves.toEqual({
      cancelAtPeriodEnd: true,
      accessUntil: '2026-10-26T10:00:00Z',
    });
    expect(whopProvider.cancelSubscription).toHaveBeenCalledWith(1000);
  });

  it("resumes the authenticated user's own canceled subscription", async () => {
    const { controller, whopProvider } = controllerWith();

    await expect(controller.resumeSubscription(1000)).resolves.toEqual({
      cancelAtPeriodEnd: false,
    });
    expect(whopProvider.resumeSubscription).toHaveBeenCalledWith(1000);
  });

  it.each([
    ['getSubscriptionStatus'],
    ['cancelSubscription'],
    ['resumeSubscription'],
  ] as const)('requires a signed-in user for %s', (method) => {
    expect(guardsOf(method)).toContain(ClientUserGuard);
  });
});
