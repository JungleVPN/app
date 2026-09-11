import 'reflect-metadata';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ClientOrServiceGuard } from '@payments/guards/client-or-service.guard';
import { StripeController } from '@payments/providers/stripe/stripe.controller';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicStripeSessionDto,
  type CreateStripeSessionDto,
} from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dto = (overrides: Partial<CreateStripeSessionDto> = {}): CreateStripeSessionDto => ({
  userId: 42,
  selectedPeriod: 1,
  metadata: { email: 'payer@test' },
  ...overrides,
});

const contextWith = (headers: Record<string, string>) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as never;

describe('ClientOrServiceGuard', () => {
  let clientUser: { canActivate: ReturnType<typeof vi.fn> };
  let interService: { canActivate: ReturnType<typeof vi.fn> };
  let guard: ClientOrServiceGuard;

  beforeEach(() => {
    clientUser = { canActivate: vi.fn().mockResolvedValue(true) };
    interService = { canActivate: vi.fn().mockReturnValue(true) };
    guard = new ClientOrServiceGuard(interService as never, clientUser as never);
  });

  it('validates an internal caller against the shared secret', async () => {
    await guard.canActivate(contextWith({ 'x-service-secret': 'shhh' }));

    expect(interService.canActivate).toHaveBeenCalled();
    expect(clientUser.canActivate).not.toHaveBeenCalled();
  });

  it('validates a browser caller against its platform credential', async () => {
    await guard.canActivate(contextWith({ authorization: 'Bearer jwt' }));

    expect(clientUser.canActivate).toHaveBeenCalled();
    expect(interService.canActivate).not.toHaveBeenCalled();
  });

  it('rejects a caller presenting no credential at all', async () => {
    clientUser.canActivate.mockRejectedValue(new UnauthorizedException());

    await expect(guard.canActivate(contextWith({}))).rejects.toThrow(UnauthorizedException);
  });
});

describe('StripeController.createSession', () => {
  let stripePaymentRepo: Record<string, ReturnType<typeof vi.fn>>;
  let stripeProvider: { openSession: ReturnType<typeof vi.fn> };
  let controller: StripeController;

  const checkoutSession = {
    object: 'checkout.session',
    id: 'cs_1',
    url: 'https://checkout',
    customer: 'cus_1',
  };

  beforeEach(() => {
    stripePaymentRepo = {
      create: vi.fn((entity: unknown) => entity),
      save: vi.fn(async (entity: unknown) => entity),
    };
    stripeProvider = {
      openSession: vi.fn().mockResolvedValue(checkoutSession),
    };

    controller = new StripeController(stripePaymentRepo as never, stripeProvider as never);
  });

  it('bills the authenticated user, never the user id in the request body', async () => {
    await controller.createSession(dto({ userId: 999 }), 42, 'https://app.test');

    expect(stripeProvider.openSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 }),
      'https://app.test',
    );
  });

  it('honours the body user id for an internal caller, which carries no identity', async () => {
    await controller.createSession(dto({ userId: 999 }), undefined, 'https://app.test');

    expect(stripeProvider.openSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 999 }),
      'https://app.test',
    );
  });

  // The origin decides which domain the payer is returned to after Stripe.
  it('passes the request origin through, so the payer lands back where they started', async () => {
    await controller.createSession(dto(), 42, 'https://app.test');

    expect(stripeProvider.openSession).toHaveBeenCalledWith(expect.anything(), 'https://app.test');
  });

  it('carries the rest of the request through untouched', async () => {
    await controller.createSession(
      dto({ purchaseType: 'extra_device', selectedPeriod: 3 }),
      42,
      'https://app.test',
    );

    expect(stripeProvider.openSession).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseType: 'extra_device', selectedPeriod: 3 }),
      'https://app.test',
    );
  });

  it('returns the session to the caller', async () => {
    const session = await controller.createSession(dto(), 42, 'https://app.test');

    expect(session).toMatchObject({ id: 'cs_1', url: 'https://checkout' });
  });

  // A subscriber is routed to the Billing Portal instead of a second checkout.
  // The controller does not second-guess that — it hands back whichever session
  // it was given, so the caller can send the payer to it.
  it('returns a billing portal session just as readily as a checkout', async () => {
    stripeProvider.openSession.mockResolvedValue({
      object: 'billing_portal.session',
      id: 'bps_1',
      url: 'https://portal',
      customer: 'cus_1',
    });

    const session = await controller.createSession(dto(), 42, 'https://app.test');

    expect(session).toMatchObject({ id: 'bps_1', url: 'https://portal' });
  });

  it('surfaces an unusable period rather than answering as if checkout opened', async () => {
    stripeProvider.openSession.mockRejectedValue(new BadRequestException('no price'));

    await expect(
      controller.createSession(dto({ selectedPeriod: 7 }), 42, 'https://app.test'),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('StripeController.createPublicSession', () => {
  const publicDto = (overrides: Partial<CreatePublicStripeSessionDto> = {}) => ({
    email: 'payer@test.com',
    selectedPeriod: 1,
    ...overrides,
  });

  const controllerWith = (
    overrides: {
      openSession?: ReturnType<typeof vi.fn>;
      findCustomerIdByEmail?: ReturnType<typeof vi.fn>;
      hasActiveSubscription?: ReturnType<typeof vi.fn>;
      resolveAmount?: ReturnType<typeof vi.fn>;
    } = {},
  ) => {
    const stripePaymentRepo = {
      create: vi.fn((entity: unknown) => entity),
      save: vi.fn(async (entity: unknown) => entity),
    };
    const stripeProvider = {
      openSession:
        overrides.openSession ??
        vi.fn().mockResolvedValue({
          object: 'checkout.session',
          id: 'cs_public',
          url: 'https://checkout',
          customer: 'cus_public',
        }),
      findCustomerIdByEmail: overrides.findCustomerIdByEmail ?? vi.fn().mockResolvedValue(null),
      hasActiveSubscription: overrides.hasActiveSubscription ?? vi.fn().mockResolvedValue(false),
      resolveAmount:
        overrides.resolveAmount ??
        vi.fn((_purpose: string, selectedPeriod: number) => {
          if (selectedPeriod === 99) {
            throw new BadRequestException('No price configured for this period');
          }
          return '10';
        }),
    };
    const controller = new StripeController(stripePaymentRepo as never, stripeProvider as never);
    return { controller, stripePaymentRepo, stripeProvider };
  };

  describe('deferring account creation until a payment settles', () => {
    it('opens the checkout with no user id, because there is no account to bill yet', async () => {
      const { controller, stripeProvider } = controllerWith();

      await controller.createPublicSession(publicDto(), 'https://app.test');

      expect(stripeProvider.openSession).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null, selectedPeriod: 1 }),
        'https://app.test',
      );
    });

    it('carries the payer email to Stripe so the webhook can create the account', async () => {
      const { controller, stripeProvider } = controllerWith();

      await controller.createPublicSession(publicDto(), 'https://app.test');

      expect(stripeProvider.openSession).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ email: 'payer@test.com' }),
        }),
        'https://app.test',
      );
    });

    it('carries the signup origin, which decides RU vs. global for the deferred account', async () => {
      const { controller, stripeProvider } = controllerWith();

      await controller.createPublicSession(publicDto(), 'https://jungle-vpn.com');

      expect(stripeProvider.openSession).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ signupOrigin: 'https://jungle-vpn.com' }),
        }),
        'https://jungle-vpn.com',
      );
    });

    it('carries the inviter, so the referral survives until the account exists', async () => {
      const { controller, stripeProvider } = controllerWith();

      await controller.createPublicSession(publicDto({ inviterId: 1337 }), 'https://app.test');

      expect(stripeProvider.openSession).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ inviterId: '1337' }),
        }),
        'https://app.test',
      );
    });

    it('sends no user id to Stripe for a visitor with no account, rather than a placeholder', async () => {
      const { controller, stripeProvider } = controllerWith();

      await controller.createPublicSession(publicDto(), 'https://app.test');

      const [sent] = stripeProvider.openSession.mock.calls[0];
      expect(sent.metadata).not.toHaveProperty('userId');
    });
  });

  describe('a subscriber already on file with Stripe', () => {
    it('recognises them by asking Stripe for the email, and refuses', async () => {
      // Deferred account creation means a payer who signed up through this very
      // page has no user id yet. Without the email lookup they would sail past
      // the subscription check and be sold a second subscription.
      const { controller, stripeProvider } = controllerWith({
        findCustomerIdByEmail: vi.fn().mockResolvedValue('cus_existing'),
        hasActiveSubscription: vi.fn().mockResolvedValue(true),
      });

      const error = await controller
        .createPublicSession(publicDto(), 'https://app.test')
        .catch((caught: unknown) => caught);

      // The page turns this code into "you already have a subscription, log in"
      // rather than a generic checkout failure.
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: ACTIVE_SUBSCRIPTION_CODE,
      });
      expect(stripeProvider.openSession).not.toHaveBeenCalled();
    });

    it('lets them through when Stripe knows the email but nothing is live on it', async () => {
      const { controller, stripeProvider } = controllerWith({
        findCustomerIdByEmail: vi.fn().mockResolvedValue('cus_lapsed'),
        hasActiveSubscription: vi.fn().mockResolvedValue(false),
      });

      await controller.createPublicSession(publicDto(), 'https://app.test');

      expect(stripeProvider.openSession).toHaveBeenCalled();
    });
  });

  it('forwards the affiliate referral so attribution survives the anonymous checkout', async () => {
    const { controller, stripeProvider } = controllerWith();

    await controller.createPublicSession(
      publicDto({ toltReferralId: 'tolt_9' }),
      'https://app.test',
    );

    expect(stripeProvider.openSession).toHaveBeenCalledWith(
      expect.objectContaining({ toltReferralId: 'tolt_9' }),
      'https://app.test',
    );
  });

  it.each([
    ['not-an-email'],
    [''],
    ['  '],
  ])('refuses to open a checkout for the malformed email %j', async (email) => {
    const { controller, stripeProvider } = controllerWith();

    await expect(controller.createPublicSession(publicDto({ email }), 'o')).rejects.toThrow(
      BadRequestException,
    );
    expect(stripeProvider.findCustomerIdByEmail).not.toHaveBeenCalled();
  });

  it('refuses a period that has no configured price, rather than failing at Stripe', async () => {
    const { controller, stripeProvider } = controllerWith();

    await expect(
      controller.createPublicSession(publicDto({ selectedPeriod: 99 }), 'https://app.test'),
    ).rejects.toThrow(BadRequestException);
    // Pricing is checked first, so a rejected checkout costs no Stripe round trip.
    expect(stripeProvider.findCustomerIdByEmail).not.toHaveBeenCalled();
  });

  it('never returns a billing portal session to an anonymous caller', async () => {
    // Belt and braces: even if the subscription check misses, a portal session
    // must not leave the public route.
    const { controller } = controllerWith({
      openSession: vi
        .fn()
        .mockResolvedValue({ object: 'billing_portal.session', url: 'https://portal' }),
    });

    await expect(controller.createPublicSession(publicDto(), 'https://app.test')).rejects.toThrow(
      ConflictException,
    );
  });
});
