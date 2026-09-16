import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ACTIVE_SUBSCRIPTION_CODE, type CreatePublicPaddleCheckoutDto } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import { PaddleController } from './paddle.controller';

describe('PaddleController.createPublicCheckout', () => {
  const publicDto = (
    overrides: Partial<CreatePublicPaddleCheckoutDto> = {},
  ): CreatePublicPaddleCheckoutDto => ({
    email: 'payer@test.com',
    selectedPeriod: 1,
    ...overrides,
  });

  const controllerWith = (
    overrides: {
      buildCheckoutPayload?: ReturnType<typeof vi.fn>;
      hasActiveSubscription?: ReturnType<typeof vi.fn>;
    } = {},
  ) => {
    const paddleProvider = {
      buildCheckoutPayload:
        overrides.buildCheckoutPayload ??
        vi.fn().mockReturnValue({ priceId: 'pri_1', customData: { email: 'payer@test.com' } }),
      hasActiveSubscription: overrides.hasActiveSubscription ?? vi.fn().mockResolvedValue(false),
    };
    const paddleClientService = { paddle: { webhooks: { unmarshal: vi.fn() } } };
    const controller = new PaddleController(paddleProvider as never, paddleClientService as never);
    return { controller, paddleProvider, paddleClientService };
  };

  it('returns the checkout payload for a valid, unsubscribed payer', async () => {
    const { controller } = controllerWith();

    const payload = await controller.createPublicCheckout(publicDto(), 'https://app.test');

    expect(payload).toEqual({ priceId: 'pri_1', customData: { email: 'payer@test.com' } });
  });

  it('passes the request origin through so custom data can carry the signup origin', async () => {
    const { controller, paddleProvider } = controllerWith();

    await controller.createPublicCheckout(publicDto(), 'https://jungle-vpn.com');

    expect(paddleProvider.buildCheckoutPayload).toHaveBeenCalledWith(
      expect.objectContaining({ origin: 'https://jungle-vpn.com' }),
    );
  });

  it('forwards the affiliate referral and inviter through to the payload builder', async () => {
    const { controller, paddleProvider } = controllerWith();

    await controller.createPublicCheckout(
      publicDto({ toltReferralId: 'tolt_9', inviterId: 1337 }),
      'https://app.test',
    );

    expect(paddleProvider.buildCheckoutPayload).toHaveBeenCalledWith(
      expect.objectContaining({ toltReferralId: 'tolt_9', inviterId: 1337 }),
    );
  });

  it.each([['not-an-email'], [''], ['  ']])(
    'refuses the malformed email %j without ever reaching Paddle',
    async (email) => {
      const { controller, paddleProvider } = controllerWith();

      await expect(
        controller.createPublicCheckout(publicDto({ email }), 'https://app.test'),
      ).rejects.toThrow(BadRequestException);
      expect(paddleProvider.hasActiveSubscription).not.toHaveBeenCalled();
    },
  );

  it('refuses a period that has no configured price, before ever asking Paddle about the email', async () => {
    const { controller, paddleProvider } = controllerWith({
      buildCheckoutPayload: vi.fn().mockImplementation(() => {
        throw new BadRequestException('No price configured');
      }),
    });

    await expect(
      controller.createPublicCheckout(publicDto({ selectedPeriod: 99 }), 'https://app.test'),
    ).rejects.toThrow(BadRequestException);
    expect(paddleProvider.hasActiveSubscription).not.toHaveBeenCalled();
  });

  it('refuses a payer who already has an active Paddle subscription', async () => {
    const { controller } = controllerWith({ hasActiveSubscription: vi.fn().mockResolvedValue(true) });

    const error = await controller
      .createPublicCheckout(publicDto(), 'https://app.test')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: ACTIVE_SUBSCRIPTION_CODE,
    });
  });
});

describe('PaddleController.webhook', () => {
  const ENV_KEY = 'PADDLE_WEBHOOK_SECRET';

  const reqWith = (rawBody?: Buffer) => ({ rawBody }) as never;

  const controllerWith = (
    unmarshal: ReturnType<typeof vi.fn>,
    handleWebhook: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(undefined),
  ) => {
    const paddleProvider = { handleWebhook };
    const paddleClientService = { paddle: { webhooks: { unmarshal } } };
    return { controller: new PaddleController(paddleProvider as never, paddleClientService as never), paddleProvider };
  };

  it('rejects a request with no raw body, since the signature cannot be verified without it', async () => {
    process.env[ENV_KEY] = 'whsec_test';
    const { controller } = controllerWith(vi.fn());

    await expect(controller.webhook(reqWith(undefined), 'sig')).rejects.toThrow(BadRequestException);
  });

  it('rejects when PADDLE_WEBHOOK_SECRET is not configured, rather than skip verification', async () => {
    delete process.env[ENV_KEY];
    const { controller } = controllerWith(vi.fn());

    await expect(
      controller.webhook(reqWith(Buffer.from('{}')), 'sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a payload whose signature Paddle refuses to verify', async () => {
    process.env[ENV_KEY] = 'whsec_test';
    const unmarshal = vi.fn().mockRejectedValue(new Error('bad signature'));
    const { controller } = controllerWith(unmarshal);

    await expect(
      controller.webhook(reqWith(Buffer.from('{}')), 'bad-sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('acknowledges a verified event', async () => {
    process.env[ENV_KEY] = 'whsec_test';
    const unmarshal = vi.fn().mockResolvedValue({ eventType: 'transaction.completed', eventId: 'evt_1' });
    const { controller } = controllerWith(unmarshal);

    const result = await controller.webhook(reqWith(Buffer.from('{}')), 'sig');

    expect(result).toEqual({ received: true });
  });

  it('hands the verified event to the provider for processing', async () => {
    process.env[ENV_KEY] = 'whsec_test';
    const event = { eventType: 'transaction.completed', eventId: 'evt_1' };
    const unmarshal = vi.fn().mockResolvedValue(event);
    const { controller, paddleProvider } = controllerWith(unmarshal);

    await controller.webhook(reqWith(Buffer.from('{}')), 'sig');

    expect(paddleProvider.handleWebhook).toHaveBeenCalledWith(event);
  });

  it('lets a processing failure propagate as a 5xx, so Paddle retries the delivery', async () => {
    process.env[ENV_KEY] = 'whsec_test';
    const unmarshal = vi.fn().mockResolvedValue({ eventType: 'transaction.completed', eventId: 'evt_1' });
    const { controller } = controllerWith(unmarshal, vi.fn().mockRejectedValue(new Error('boom')));

    await expect(controller.webhook(reqWith(Buffer.from('{}')), 'sig')).rejects.toThrow('boom');
  });
});
