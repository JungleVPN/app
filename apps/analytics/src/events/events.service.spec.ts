import 'reflect-metadata';
import type { AnalyticsEvent as AnalyticsEventEntity } from '@workspace/database';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostHogService } from '../posthog/posthog.service';
import { EventsService } from './events.service';

vi.mock('@workspace/database', () => ({
  AnalyticsEvent: class {},
  UserAttribution: class {},
}));

vi.mock('googleapis', () => ({
  google: {
    auth: { JWT: class {} },
    sheets: () => ({ spreadsheets: { values: { append: vi.fn() } } }),
  },
}));

function buildRepo(save = vi.fn().mockResolvedValue(undefined)) {
  return { save } as unknown as Repository<AnalyticsEventEntity>;
}

function buildPostHog(capture = vi.fn(), identify = vi.fn()) {
  return { capture, identify } as unknown as PostHogService;
}

function buildService({ repo = buildRepo(), postHog = buildPostHog() } = {}) {
  const attributionRepo = { save: vi.fn() } as unknown as Repository<any>;
  process.env.GOOGLE_API_KEY = 'test-key';
  process.env.GOOGLE_EMAIL = 'test@example.com';
  const service = new EventsService(attributionRepo, repo, postHog);
  return { service, repo, postHog };
}

describe('EventsService.trackEvent()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('persistence', () => {
    it('saves bot_started with telegramId, email and adCode; userId null', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const { service } = buildService({ repo: buildRepo(save) });

      await service.trackEvent({
        event: 'bot_started',
        telegramId: 123456,
        email: 'u@test.com',
        adCode: 'summer24',
        isReturningUser: false,
      });

      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'bot_started',
          telegramId: 123456,
          email: 'u@test.com',
          adCode: 'summer24',
          userId: null,
        }),
      );
    });

    it('saves payment_succeeded with userId; telegramId and adCode null', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const { service } = buildService({ repo: buildRepo(save) });

      await service.trackEvent({
        event: 'payment_succeeded',
        userId: 'user-uuid',
        provider: 'stripe',
        selectedPeriod: 30,
        isFirstPayment: true,
        isAutoPayment: false,
      });

      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'payment_succeeded',
          userId: 'user-uuid',
          telegramId: null,
          adCode: null,
        }),
      );
    });

    it('does not throw when the repo rejects', async () => {
      const save = vi.fn().mockRejectedValue(new Error('db error'));
      const { service } = buildService({ repo: buildRepo(save) });

      await expect(
        service.trackEvent({ event: 'subscription_expired', userId: 'u1' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('PostHog capture', () => {
    it('uses userId as distinctId when present', async () => {
      const capture = vi.fn();
      const { service } = buildService({ postHog: buildPostHog(capture) });

      await service.trackEvent({
        event: 'payment_succeeded',
        userId: 'user-uuid',
        provider: 'yookassa',
        selectedPeriod: 30,
        isFirstPayment: false,
        isAutoPayment: true,
      });

      expect(capture).toHaveBeenCalledWith('user-uuid', 'payment_succeeded', expect.any(Object));
    });

    it('uses tg: prefix as distinctId when only telegramId is present', async () => {
      const capture = vi.fn();
      const { service } = buildService({ postHog: buildPostHog(capture) });

      await service.trackEvent({
        event: 'bot_started',
        telegramId: 999,
        email: null,
        adCode: null,
        isReturningUser: true,
      });

      expect(capture).toHaveBeenCalledWith('tg:999', 'bot_started', expect.any(Object));
    });

    it('skips PostHog when no identity is available', async () => {
      const capture = vi.fn();
      const { service } = buildService({ postHog: buildPostHog(capture) });

      await service.trackEvent({
        event: 'referral_reward_granted',
        invitedUserId: 'u1',
        inviterUserId: 'u2',
      });

      expect(capture).not.toHaveBeenCalled();
    });

    it('does not throw when PostHog capture throws', async () => {
      const capture = vi.fn().mockImplementation(() => {
        throw new Error('posthog down');
      });
      const { service } = buildService({ postHog: buildPostHog(capture) });

      await expect(
        service.trackEvent({ event: 'subscription_expired', userId: 'u1' }),
      ).resolves.toBeUndefined();
    });
  });
});
