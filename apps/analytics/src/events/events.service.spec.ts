import 'reflect-metadata';
import type { AnalyticsEvent as AnalyticsEventEntity } from '@workspace/database';
import type { CreateUserResponseDto } from '@workspace/types';
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

function buildService({
  repo = buildRepo(),
  postHog = buildPostHog(),
  attributionRepo = { save: vi.fn().mockResolvedValue(undefined) } as unknown as Repository<any>,
} = {}) {
  process.env.GOOGLE_API_KEY = 'test-key';
  process.env.GOOGLE_EMAIL = 'test@example.com';
  const service = new EventsService(attributionRepo, repo, postHog);
  return { service, repo, postHog, attributionRepo };
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
        userId: 1000,
        provider: 'stripe',
        selectedPeriod: 30,
        isFirstPayment: true,
        isAutoPayment: false,
      });

      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'payment_succeeded',
          userId: 1000,
          telegramId: null,
          adCode: null,
        }),
      );
    });

    it('does not throw when the repo rejects', async () => {
      const save = vi.fn().mockRejectedValue(new Error('db error'));
      const { service } = buildService({ repo: buildRepo(save) });

      await expect(
        service.trackEvent({ event: 'subscription_expired', userId: 1001 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('PostHog capture', () => {
    it('uses userId as distinctId when present', async () => {
      const capture = vi.fn();
      const { service } = buildService({ postHog: buildPostHog(capture) });

      await service.trackEvent({
        event: 'payment_succeeded',
        userId: 1000,
        provider: 'yookassa',
        selectedPeriod: 30,
        isFirstPayment: false,
        isAutoPayment: true,
      });

      expect(capture).toHaveBeenCalledWith('1000', 'payment_succeeded', expect.any(Object));
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
        invitedUserId: 1001,
        inviterUserId: 1002,
      });

      expect(capture).not.toHaveBeenCalled();
    });

    it('does not throw when PostHog capture throws', async () => {
      const capture = vi.fn().mockImplementation(() => {
        throw new Error('posthog down');
      });
      const { service } = buildService({ postHog: buildPostHog(capture) });

      await expect(
        service.trackEvent({ event: 'subscription_expired', userId: 1001 }),
      ).resolves.toBeUndefined();
    });
  });
});

describe('EventsService.trackUserCreated()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const user = { id: 2000, telegramId: 555, email: 'u@test.com' } as CreateUserResponseDto;

  it('identifies the user by their id with the full attribution as $set_once', async () => {
    const identify = vi.fn();
    const { service } = buildService({ postHog: buildPostHog(undefined, identify) });

    await service.trackUserCreated(user, {
      platform: 'web',
      source: 'google',
      medium: 'cpc',
      campaign: 'summer24',
      adset: 'adset-1',
      ad: 'ad-1',
      clickId: 'gclid-123',
      adCode: 'promo-1',
    });

    expect(identify).toHaveBeenCalledWith('2000', {
      $set_once: {
        attribution_platform: 'web',
        attribution_source: 'google',
        attribution_medium: 'cpc',
        attribution_campaign: 'summer24',
        attribution_adset: 'adset-1',
        attribution_ad: 'ad-1',
        attribution_click_id: 'gclid-123',
        attribution_ad_code: 'promo-1',
      },
    });
  });

  it('omits attribution fields that were never captured', async () => {
    const identify = vi.fn();
    const { service } = buildService({ postHog: buildPostHog(undefined, identify) });

    await service.trackUserCreated(user, { platform: 'telegram', adCode: 'promo-1' });

    expect(identify).toHaveBeenCalledWith('2000', {
      $set_once: {
        attribution_platform: 'telegram',
        attribution_ad_code: 'promo-1',
      },
    });
  });

  it('still persists attribution to the db and sheets when PostHog identify throws', async () => {
    const identify = vi.fn().mockImplementation(() => {
      throw new Error('posthog down');
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const attributionRepo = { save } as unknown as Repository<any>;
    const { service } = buildService({
      postHog: buildPostHog(undefined, identify),
      attributionRepo,
    });

    await expect(
      service.trackUserCreated(user, { platform: 'web' }),
    ).resolves.toBeUndefined();

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ userId: 2000 }));
  });
});
