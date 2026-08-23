/**
 * ReferralService — userId-based referral behavior.
 *
 * The referral table keys inviterId/invitedId by the remnawave userId — a
 * numeric panel id since v3 — instead of the Telegram id. Referral records are
 * created once the invited user's remnawave account actually exists (at
 * account-creation time), not at the moment they click a /start ref_xxx link —
 * a brand-new Telegram user has no panel id yet at that point.
 */

import 'reflect-metadata';
import * as process from 'node:process';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Referral } from '@workspace/database';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferralService } from '../main/referral.service';
import { findExistingReferralConflict } from '../main/referral.utils';
import type { AnalyticsClientService } from '../analytics/analytics-client.service';
import type { PaymentsClient } from '../main/payments.client';
import type { RemnaClient } from '../main/remna.client';

vi.mock('@workspace/database', () => ({ Referral: class {} }));

const INVITER_ID = 4821;
const INVITED_ID = 1337;

const makeReferral = (overrides: Partial<Referral> = {}): Referral =>
  ({
    id: 'ref-1',
    inviterId: INVITER_ID,
    invitedId: INVITED_ID,
    status: 'TRIAL',
    createdAt: new Date(),
    ...overrides,
  }) as Referral;

const makeRemnaUser = (id: number, telegramId: number | null = 100, status = 'ACTIVE') => ({
  id,
  telegramId,
  status,
  expireAt: new Date(Date.now() + 86_400_000).toISOString(),
  subscriptionUrl: `https://vpn/sub/${id}`,
  description: null,
});

function makeReferralRepo(findOneResult: Referral | null = null): Repository<Referral> {
  return {
    findOne: vi.fn().mockResolvedValue(findOneResult),
    create: vi.fn((d: unknown) => d),
    save: vi.fn(async (v: unknown) => v),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<Referral>;
}

function makeRemnaClient(status = 'ACTIVE'): RemnaClient {
  return {
    getUserById: vi.fn(async (userId: number) => makeRemnaUser(userId, 100, status)),
    updateUser: vi.fn().mockResolvedValue({}),
  } as unknown as RemnaClient;
}

/** Defaults to "has ever paid" so existing reward tests keep their prior behavior. */
function makePaymentsClient(hasEverPaid = true): PaymentsClient {
  return {
    hasEverPaid: vi.fn().mockResolvedValue(hasEverPaid),
  } as unknown as PaymentsClient;
}

function makeAnalyticsClient(): AnalyticsClientService {
  return { track: vi.fn().mockResolvedValue(undefined) } as unknown as AnalyticsClientService;
}

function makeService(
  referralRepo: Repository<Referral>,
  remnaClient: RemnaClient,
  paymentsClient: PaymentsClient = makePaymentsClient(),
) {
  return new ReferralService(
    referralRepo,
    remnaClient,
    { emit: vi.fn() } as unknown as EventEmitter2,
    paymentsClient,
    makeAnalyticsClient(),
  );
}

describe('ReferralService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REFERRAL_BONUS_IN_DAYS = '30';
  });

  afterEach(() => {
    delete process.env.REFERRAL_BONUS_IN_DAYS;
  });

  describe('handleNewUser', () => {
    it('rejects self-referral when inviterId === invitedId', async () => {
      const service = makeService(makeReferralRepo(null), makeRemnaClient());

      const result = await service.handleNewUser(INVITER_ID, INVITER_ID);

      expect(result).toEqual({ success: false, reason: 'self_referral' });
    });

    it('creates a referral record keyed by remnawave userId, not telegramId', async () => {
      const referralRepo = makeReferralRepo(null);
      const remnaClient = makeRemnaClient();
      const service = makeService(referralRepo, remnaClient);

      const result = await service.handleNewUser(INVITER_ID, INVITED_ID);

      expect(result).toEqual({ success: true, reason: 'new_user' });
      expect(referralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ inviterId: INVITER_ID, invitedId: INVITED_ID }),
      );
      // Values passed through must be the remnawave user ids, never telegramIds.
      const created = (referralRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(typeof created.inviterId).toBe('number');
      expect(typeof created.invitedId).toBe('number');
    });

    it('does not reward the inviter at signup — reward only happens after the friend pays', async () => {
      const remnaClient = makeRemnaClient();
      const service = makeService(makeReferralRepo(null), remnaClient);

      await service.handleNewUser(INVITER_ID, INVITED_ID);

      expect(remnaClient.updateUser).not.toHaveBeenCalled();
    });

    it('fails when the inviter id does not resolve to a remnawave user', async () => {
      const remnaClient = {
        getUserById: vi.fn().mockResolvedValue(null),
        updateUser: vi.fn(),
      } as unknown as RemnaClient;
      const service = makeService(makeReferralRepo(null), remnaClient);

      const result = await service.handleNewUser(INVITER_ID, INVITED_ID);

      expect(result).toEqual({ success: false, reason: 'inviter_not_found' });
      expect(remnaClient.updateUser).not.toHaveBeenCalled();
    });

    it('does not create a duplicate referral when the invitedId already has one', async () => {
      const referralRepo = makeReferralRepo(makeReferral());
      const service = makeService(referralRepo, makeRemnaClient());

      const result = await service.handleNewUser(INVITER_ID, INVITED_ID);

      expect(result.success).toBe(false);
      expect(referralRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('handleInviterRewardAfterPayment', () => {
    it('rewards both the invited user and the inviter with the same bonus once the friend pays', async () => {
      const referralRepo = makeReferralRepo(makeReferral({ status: 'TRIAL' }));
      const remnaClient = makeRemnaClient();
      const service = makeService(referralRepo, remnaClient);

      const result = await service.handleInviterRewardAfterPayment(INVITED_ID);

      expect(result.rewarded).toBe(true);
      expect(referralRepo.findOne).toHaveBeenCalledWith({ where: { invitedId: INVITED_ID } });
      // Both sides are resolved and extended via their remnawave user id.
      expect(remnaClient.getUserById).toHaveBeenCalledWith(INVITER_ID);
      expect(remnaClient.getUserById).toHaveBeenCalledWith(INVITED_ID);
      expect(remnaClient.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: INVITER_ID }),
      );
      expect(remnaClient.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: INVITED_ID }),
      );
      expect(result.inviterRewarded).toBe(true);
    });

    it('rewards the invited user but skips the inviter when the inviter subscription is not ACTIVE', async () => {
      const referralRepo = makeReferralRepo(makeReferral({ status: 'TRIAL' }));
      const remnaClient = makeRemnaClient('EXPIRED');
      const paymentsClient = makePaymentsClient(true);
      const service = makeService(referralRepo, remnaClient, paymentsClient);

      const result = await service.handleInviterRewardAfterPayment(INVITED_ID);

      expect(result).toEqual({ rewarded: true, inviterRewarded: false });
      expect(remnaClient.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: INVITED_ID }),
      );
      expect(remnaClient.updateUser).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: INVITER_ID }),
      );
    });

    it('rewards the invited user but skips the inviter when there is no settled payment in the last 30 days', async () => {
      // Remnawave reports both TRIAL and a paid subscription as ACTIVE — this is the
      // case that ACTIVE-status alone cannot distinguish.
      const referralRepo = makeReferralRepo(makeReferral({ status: 'TRIAL' }));
      const remnaClient = makeRemnaClient('ACTIVE');
      const paymentsClient = makePaymentsClient(false);
      const service = makeService(referralRepo, remnaClient, paymentsClient);

      const result = await service.handleInviterRewardAfterPayment(INVITED_ID);

      expect(result).toEqual({ rewarded: true, inviterRewarded: false });
      expect(paymentsClient.hasEverPaid).toHaveBeenCalledWith(INVITER_ID);
      expect(remnaClient.updateUser).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: INVITER_ID }),
      );
    });

    it('does not reward twice once the referral is COMPLETED', async () => {
      const referralRepo = makeReferralRepo(makeReferral({ status: 'COMPLETED' }));
      const service = makeService(referralRepo, makeRemnaClient());

      const result = await service.handleInviterRewardAfterPayment(INVITED_ID);

      expect(result).toEqual({ rewarded: false, reason: 'already_completed' });
    });

    it('returns no_referral when there is no referral row for this invited userId', async () => {
      const referralRepo = makeReferralRepo(null);
      const service = makeService(referralRepo, makeRemnaClient());

      const result = await service.handleInviterRewardAfterPayment(INVITED_ID);

      expect(result).toEqual({ rewarded: false, reason: 'no_referral' });
    });
  });

  describe('getReferralByInvitedId / deleteByInvitedId', () => {
    it('queries and deletes by the string userId', async () => {
      const referralRepo = makeReferralRepo(makeReferral());
      const service = makeService(referralRepo, makeRemnaClient());

      await service.getReferralByInvitedId(INVITED_ID);
      expect(referralRepo.findOne).toHaveBeenCalledWith({ where: { invitedId: INVITED_ID } });

      await service.deleteByInvitedId(INVITED_ID);
      expect(referralRepo.delete).toHaveBeenCalledWith({ invitedId: INVITED_ID });
    });
  });
});

describe('findExistingReferralConflict', () => {
  it('returns null when there is no existing referral', () => {
    expect(findExistingReferralConflict(null, INVITER_ID)).toBeNull();
  });

  it('returns user_is_invited when the invited user was already invited by someone else', () => {
    const referral = makeReferral({ inviterId: 1000 });

    expect(findExistingReferralConflict(referral, INVITER_ID)).toBe('user_is_invited');
  });

  it('returns referral_completed when the same inviter already completed the referral', () => {
    const referral = makeReferral({ inviterId: INVITER_ID, status: 'COMPLETED' });

    expect(findExistingReferralConflict(referral, INVITER_ID)).toBe('referral_completed');
  });

  it('returns already_exists when the same inviter has a non-completed referral record', () => {
    const referral = makeReferral({ inviterId: INVITER_ID, status: 'TRIAL' });

    expect(findExistingReferralConflict(referral, INVITER_ID)).toBe('already_exists');
  });
});
