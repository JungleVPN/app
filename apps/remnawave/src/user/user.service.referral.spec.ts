/**
 * UserService.createUser — referral wiring.
 *
 * Referral rows are keyed by remnawave userId (uuid). A brand-new Telegram user
 * has no uuid until their account is actually created here, so this is the
 * earliest point an inviter/invited pairing can be recorded. When the caller
 * passes an inviterId (decoded from the /start ref_xxx code), createUser must
 * notify the referrals service with { inviterId, invitedId: <new user's uuid> }
 * after the account is created.
 */

import 'reflect-metadata';
import * as process from 'node:process';
import type { ConfigService } from '@nestjs/config';
import type { UserAttribution } from '@workspace/database';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemnaPanelClient } from '../common/remna-panel.client';
import { UserService } from './user.service';

const mockAxiosPost = vi.fn();
vi.mock('axios', () => ({
  default: { post: (...args: any[]) => mockAxiosPost(...args) },
}));

const NEW_USER_UUID = 'uuid-new-user';
const INVITER_UUID = 'uuid-inviter';

function makeService() {
  const panelClient = {
    request: vi.fn().mockResolvedValue({ uuid: NEW_USER_UUID, telegramId: 555 }),
  } as unknown as RemnaPanelClient;

  const configService = {
    get: vi.fn((_key: string, fallback?: unknown) => fallback),
  } as unknown as ConfigService;

  const attributionRepo = {
    save: vi.fn().mockResolvedValue({}),
  } as unknown as Repository<UserAttribution>;

  const service = new UserService(panelClient, configService, attributionRepo);
  return { service, panelClient };
}

describe('UserService.createUser — referral wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTER_SERVICE_SECRET = 'secret';
    mockAxiosPost.mockResolvedValue({ data: { success: true } });
  });

  it('notifies the referrals service with the new user uuid when inviterId is provided', async () => {
    const { service } = makeService();

    await service.createUser({ telegramId: 111, inviterId: INVITER_UUID } as any);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    const [url, body] = mockAxiosPost.mock.calls[0];
    expect(url).toEqual(expect.stringContaining('/referrals'));
    expect(body).toEqual({ inviterId: INVITER_UUID, invitedId: NEW_USER_UUID });
  });

  it('does not call the referrals service when no inviterId is provided', async () => {
    const { service } = makeService();

    await service.createUser({ telegramId: 111 } as any);

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('does not forward inviterId to the remnawave panel create-user payload', async () => {
    const { service, panelClient } = makeService();

    await service.createUser({ telegramId: 111, inviterId: INVITER_UUID } as any);

    const requestArg = (panelClient.request as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(requestArg.body).not.toHaveProperty('inviterId');
  });

  it('still returns the created user when the referral notification fails', async () => {
    mockAxiosPost.mockRejectedValue(new Error('referrals unreachable'));
    const { service } = makeService();

    const result = await service.createUser({
      telegramId: 111,
      inviterId: INVITER_UUID,
    } as any);

    expect(result.uuid).toBe(NEW_USER_UUID);
  });
});
