/**
 * UserService.createUser — who gets a trial.
 *
 * The trial is a Telegram-only offer. Only a signup carrying a telegramId — the
 * Mini App or the bot, where the trial is the product's front door — opens with
 * TRIAL_PERIOD_IN_DAYS of access.
 *
 * Web accounts (global and RU alike) exist to hold a purchase rather than to hand
 * out access: they are created around a payment, so opening them with a trial
 * would give every payer a free window on top of what they bought, and would hand
 * access to anyone who typed an email into the public checkout page and walked away.
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
  // `|| 0` normalises the -0 that an expiry a few ms in the past rounds to.
  Math.round((new Date(expireAt).getTime() - Date.now()) / 86_400_000) || 0;

describe('UserService.createUser — trial period', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grants a global signup no trial at all', async () => {
    const { service, panelClient } = makeService({ TRIAL_PERIOD_IN_DAYS: '3' });

    await service.createUser({ email: 'payer@test.com', origin: GLOBAL_ORIGIN });

    expect(daysUntil(bodyOf(panelClient).expireAt)).toBe(0);
  });

  it('grants an RU web signup no trial either', async () => {
    const { service, panelClient } = makeService({
      TRIAL_PERIOD_IN_DAYS: '3',
      PUBLIC_DOMAIN_RU: 'ru-web.jungle.test',
    });

    await service.createUser({ email: 'ru@test.com', origin: RU_ORIGIN });

    expect(daysUntil(bodyOf(panelClient).expireAt)).toBe(0);
  });

  it('grants a Telegram signup the configured trial, whatever the origin', async () => {
    const { service, panelClient } = makeService({
      TRIAL_PERIOD_IN_DAYS: '3',
      PUBLIC_DOMAIN_RU: 'ru-web.jungle.test',
    });

    await service.createUser({ telegramId: 111, origin: RU_ORIGIN });

    expect(daysUntil(bodyOf(panelClient).expireAt)).toBe(3);
  });

  it('grants a bot signup (no origin at all) the configured trial', async () => {
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
