/**
 * UserController.createUser — origin propagation.
 *
 * Whether a new account is RU or global is decided from the signup Origin, and
 * that decision now sets the trial period as well as the squads. The header is
 * the only place the origin exists on an inter-service create — callers send it
 * alongside the body — so a controller that drops it silently makes every
 * account RU, trial included.
 */

import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { UserController } from './user.controller';
import type { UserService } from './user.service';

const makeController = () => {
  const userService = { createUser: vi.fn().mockResolvedValue({ id: 1 }) };
  return { controller: new UserController(userService as unknown as UserService), userService };
};

describe('UserController.createUser', () => {
  it('passes the request origin to the service so RU/global is decided correctly', async () => {
    const { controller, userService } = makeController();

    await controller.createUser({ email: 'payer@test.com' }, 'https://jungle-vpn.com');

    expect(userService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'payer@test.com', origin: 'https://jungle-vpn.com' }),
    );
  });

  it('passes a null origin when the caller sent no header, rather than inventing one', async () => {
    const { controller, userService } = makeController();

    await controller.createUser({ telegramId: 111 });

    expect(userService.createUser).toHaveBeenCalledWith(expect.objectContaining({ origin: null }));
  });
});
