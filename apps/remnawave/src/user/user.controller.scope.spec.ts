/**
 * UserController — exposing a user's scope to the other services.
 *
 * The payments and bot services build "manage your subscription" links, and both
 * need the storefront the user actually signed up on. Only this service talks to
 * the panel, so it answers the question for them rather than each re-deriving it.
 */

import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { UserController } from './user.controller';
import type { UserService } from './user.service';

const makeController = (scope: 'ru' | 'global' = 'ru') => {
  const userService = { getUserScope: vi.fn().mockResolvedValue(scope) };
  return { controller: new UserController(userService as unknown as UserService), userService };
};

describe('UserController.getUserScope', () => {
  it("answers with the user's stored scope", async () => {
    const { controller } = makeController('global');

    expect(await controller.getUserScope(846)).toEqual({ scope: 'global' });
  });

  it('answers ru for an RU user', async () => {
    const { controller } = makeController('ru');

    expect(await controller.getUserScope(846)).toEqual({ scope: 'ru' });
  });

  it('asks the service about the user in the path', async () => {
    const { controller, userService } = makeController();

    await controller.getUserScope(846);

    expect(userService.getUserScope).toHaveBeenCalledWith(846);
  });
});
