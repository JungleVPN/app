/**
 * UserService.createUser — the user_created analytics event.
 *
 * A web signup has no Telegram account. Reporting its telegramId as 0 made the
 * analytics service merge every web signup into one PostHog person under
 * `tg:0`, so the event carries no telegramId at all for them.
 */

import 'reflect-metadata';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { AnalyticsClientService } from '../analytics/analytics-client.service';
import type { RemnaPanelClient } from '../common/remna-panel.client';
import { UserService } from './user.service';

vi.mock('axios', () => ({ default: { post: vi.fn().mockResolvedValue({ data: {} }) } }));

function makeService(createdUser: { id: number; telegramId: number | null; email: string | null }) {
  const panelClient = {
    request: vi.fn().mockResolvedValue(createdUser),
  } as unknown as RemnaPanelClient;
  const config: Record<string, string> = { RU_INTERNAL_SQUAD: 'squad-ru' };
  const configService = {
    get: vi.fn((key: string, fallback?: unknown) => config[key] ?? fallback),
    getOrThrow: vi.fn((key: string) => config[key]),
  } as unknown as ConfigService;
  const track = vi.fn();
  const analyticsClient = { track } as unknown as AnalyticsClientService;

  return { service: new UserService(panelClient, configService, analyticsClient), track };
}

describe('UserService.createUser — user_created event', () => {
  it('reports no telegramId for a web signup, which has no Telegram account', async () => {
    const { service, track } = makeService({ id: 7, telegramId: null, email: 'payer@test.com' });

    await service.createUser({ email: 'payer@test.com', origin: 'https://jungle-vpn.com' });

    expect(track).toHaveBeenCalledWith({
      event: 'user_created',
      userId: 7,
      telegramId: null,
      email: 'payer@test.com',
    });
  });

  it('reports the telegramId of a Telegram signup', async () => {
    const { service, track } = makeService({ id: 8, telegramId: 555, email: null });

    await service.createUser({ telegramId: 555, origin: 'https://jungle-vpn.com' });

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'user_created', userId: 8, telegramId: 555 }),
    );
  });
});
