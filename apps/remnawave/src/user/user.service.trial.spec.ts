/**
 * UserService.createUser — who gets a trial.
 *
 * Global accounts are created by the Stripe webhook *after* a payment has
 * settled, so the account exists to hold a purchase rather than to hand out
 * access. Creating it with TRIAL_PERIOD_IN_DAYS would give every payer a free
 * window on top of what they bought, and — worse, before this flow was
 * deferred — would have handed trial access to anyone who typed an email into
 * the public checkout page and walked away.
 *
 * RU signups still come through the bot/TMA, where the trial is the product's
 * front door, so they are deliberately untouched.
 */

import 'reflect-metadata';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsClientService } from '../analytics/analytics-client.service';
import type { RemnaPanelClient } from '../common/remna-panel.client';
import { UserService } from './user.service';

vi.mock('axios', () => ({ default: { post: vi.fn().mockResolvedValue({ data: {} }) } }));

const RU_ORIGIN = 'https://ru-web.jungle.test';
const GLOBAL_ORIGIN = 'https://jungle-vpn.com';

function makeService(overrides: Record<string, string> = {}) {
  const panelClient = {
    request: vi.fn().mockResolvedValue({ id: 1, telegramId: 555 }),
  } as unknown as RemnaPanelClient;

  // RU_INTERNAL_SQUAD is required config in every environment.
  const config: Record<string, string> = { RU_INTERNAL_SQUAD: 'squad-ru', ...overrides };

  const configService = {
    get: vi.fn((key: string, fallback?: unknown) => config[key] ?? fallback),
    getOrThrow: vi.fn((key: string) => {
      const value = config[key];
      if (value === undefined) throw new Error(`Missing config: ${key}`);
      return value;
    }),
  } as unknown as ConfigService;

  const analyticsClient = { track: vi.fn() } as unknown as AnalyticsClientService;

  return { service: new UserService(panelClient, configService, analyticsClient), panelClient };
}

const bodyOf = (panelClient: RemnaPanelClient) =>
  (panelClient.request as ReturnType<typeof vi.fn>).mock.calls[0][0].body;

/** Whole days between now and an expiry, rounded to the nearest day. */
const daysUntil = (expireAt: Date) =>
  Math.round((new Date(expireAt).getTime() - Date.now()) / 86_400_000);

describe('UserService.createUser — trial period', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grants a global signup no trial at all', async () => {
    const { service, panelClient } = makeService({ TRIAL_PERIOD_IN_DAYS: '3' });

    await service.createUser({ email: 'payer@test.com', origin: GLOBAL_ORIGIN });

    expect(daysUntil(bodyOf(panelClient).expireAt)).toBe(0);
  });

  it('still grants an RU signup the configured trial', async () => {
    const { service, panelClient } = makeService({
      TRIAL_PERIOD_IN_DAYS: '3',
      PUBLIC_DOMAIN_RU: 'ru-web.jungle.test',
    });

    await service.createUser({ telegramId: 111, origin: RU_ORIGIN });

    expect(daysUntil(bodyOf(panelClient).expireAt)).toBe(3);
  });

  it('treats a signup with no origin as RU, keeping the bot flow unchanged', async () => {
    const { service, panelClient } = makeService({ TRIAL_PERIOD_IN_DAYS: '3' });

    await service.createUser({ telegramId: 111 });

    expect(daysUntil(bodyOf(panelClient).expireAt)).toBe(3);
  });

  it('assigns the RU squad and no external squad for an RU signup', async () => {
    const { service, panelClient } = makeService();

    await service.createUser({ email: 'ru@test.com', origin: RU_ORIGIN });

    expect(bodyOf(panelClient)).toMatchObject({
      activeInternalSquads: ['squad-ru'],
      externalSquadUuid: null,
    });
  });

  it('still assigns the global squads, so access works the moment payment lands', async () => {
    const { service, panelClient } = makeService({
      GLOBAL_INTERNAL_SQUAD: 'squad-global',
      GLOBAL_EXTERNAL_SQUAD: 'squad-external',
    });

    await service.createUser({ email: 'payer@test.com', origin: GLOBAL_ORIGIN });

    expect(bodyOf(panelClient)).toMatchObject({
      activeInternalSquads: ['squad-global'],
      externalSquadUuid: 'squad-external',
    });
  });
});
