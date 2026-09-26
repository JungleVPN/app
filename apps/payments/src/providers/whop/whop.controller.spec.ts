import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ACTIVE_SUBSCRIPTION_CODE, type CreatePublicWhopCheckoutDto } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import { WhopController } from './whop.controller';

describe('WhopController.createPublicCheckout', () => {
  const publicDto = (
    overrides: Partial<CreatePublicWhopCheckoutDto> = {},
  ): CreatePublicWhopCheckoutDto => ({
    email: 'payer@test.com',
    planId: 'whop-30',
    ...overrides,
  });

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
      createCheckout: vi.fn().mockResolvedValue({ checkoutConfigurationId: 'ch_1' }),
    };
    const controller = new WhopController(whopProvider as never);
    return { controller, whopProvider };
  };

  it('returns the checkout configuration for a valid, unsubscribed payer', async () => {
    const { controller } = controllerWith();

    await expect(controller.createPublicCheckout(publicDto(), 'https://app.test')).resolves.toEqual(
      { checkoutConfigurationId: 'ch_1' },
    );
  });

  it('normalises the email before using it', async () => {
    const { controller, whopProvider } = controllerWith();

    await controller.createPublicCheckout(publicDto({ email: '  Payer@Test.com ' }), undefined);

    expect(whopProvider.hasActiveSubscription).toHaveBeenCalledWith('payer@test.com');
    expect(whopProvider.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'payer@test.com' }),
    );
  });

  it('bills the resolved Whop plan and forwards referral, inviter and origin', async () => {
    const { controller, whopProvider } = controllerWith();

    await controller.createPublicCheckout(
      publicDto({ toltReferralId: 'tolt_9', inviterId: 1337 }),
      'https://jungle-vpn.com',
    );

    expect(whopProvider.resolveCheckoutPlanId).toHaveBeenCalledWith('whop-30');
    expect(whopProvider.createCheckout).toHaveBeenCalledWith({
      email: 'payer@test.com',
      whopPlanId: 'plan_month_1',
      toltReferralId: 'tolt_9',
      inviterId: 1337,
      origin: 'https://jungle-vpn.com',
    });
  });

  it.each([
    ['not-an-email'],
    [''],
    ['  '],
  ])('refuses the malformed email %j without ever reaching Whop', async (email) => {
    const { controller, whopProvider } = controllerWith();

    await expect(
      controller.createPublicCheckout(publicDto({ email }), 'https://app.test'),
    ).rejects.toThrow(BadRequestException);
    expect(whopProvider.hasActiveSubscription).not.toHaveBeenCalled();
    expect(whopProvider.createCheckout).not.toHaveBeenCalled();
  });

  it('refuses a plan that is not on sale, before ever asking Whop about the email', async () => {
    const { controller, whopProvider } = controllerWith({
      resolveCheckoutPlanId: vi.fn().mockRejectedValue(new BadRequestException('Not on sale')),
    });

    await expect(
      controller.createPublicCheckout(publicDto({ planId: 'nope' }), 'https://app.test'),
    ).rejects.toThrow(BadRequestException);
    expect(whopProvider.hasActiveSubscription).not.toHaveBeenCalled();
    expect(whopProvider.createCheckout).not.toHaveBeenCalled();
  });

  it('refuses a payer who already has an active Whop membership, without creating a checkout', async () => {
    const { controller, whopProvider } = controllerWith({
      hasActiveSubscription: vi.fn().mockResolvedValue(true),
    });

    const error = await controller
      .createPublicCheckout(publicDto(), 'https://app.test')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: ACTIVE_SUBSCRIPTION_CODE,
    });
    expect(whopProvider.createCheckout).not.toHaveBeenCalled();
  });
});
