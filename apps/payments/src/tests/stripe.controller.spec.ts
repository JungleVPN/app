import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { ClientOrServiceGuard } from '@payments/guards/client-or-service.guard';
import { StripeController } from '@payments/providers/stripe/stripe.controller';
import type { CreateStripeSessionDto } from '@workspace/types';
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
  let stripeProvider: { createPayment: ReturnType<typeof vi.fn> };
  let controller: StripeController;

  beforeEach(() => {
    process.env.PRICE_EUR_MONTH_1 = '10';

    stripePaymentRepo = {
      create: vi.fn((entity: unknown) => entity),
      save: vi.fn(async (entity: unknown) => entity),
    };
    stripeProvider = {
      createPayment: vi.fn().mockResolvedValue({
        id: 'cs_1',
        url: 'https://checkout',
        customer: 'cus_1',
      }),
    };

    controller = new StripeController(stripePaymentRepo as never, stripeProvider as never);
  });

  it('bills the authenticated user, never the user id in the request body', async () => {
    await controller.createSession(dto({ userId: 999 }), 42, 'https://app.test');

    expect(stripeProvider.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42 }),
      'https://app.test',
    );
    expect(stripePaymentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 42 }));
  });

  it('honours the body user id for an internal caller, which carries no identity', async () => {
    await controller.createSession(dto({ userId: 999 }), undefined, 'https://app.test');

    expect(stripeProvider.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 999 }),
      'https://app.test',
    );
  });
});
