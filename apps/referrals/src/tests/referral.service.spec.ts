/**
 * ReferralService — userId-based referral behavior.
 *
 * The referral table now keys inviterId/invitedId by the remnawave userId (uuid)
 * instead of the Telegram id. Referral records are created once the invited
 * user's remnawave account actually exists (at account-creation time), not at
 * the moment they click a /start ref_xxx link — a brand-new Telegram user has
 * no uuid yet at that point.
 */

import 'reflect-metadata';
import * as process from 'node:process';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Referral } from '@workspace/database';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferralService } from '../main/referral.service';
import type { RemnaClient } from '../main/remna.client';

vi.mock('@workspace/database', () => ({ Referral: class {} }));

const INVITER_UUID = 'uuid-inviter-1';
const INVITED_UUID = 'uuid-invited-1';

const makeReferral = (overrides: Partial<Referral> = {}): Referral =>
  ({
    id: 'ref-1',
    inviterId: INVITER_UUID,
    invitedId: INVITED_UUID,
    status: 'TRIAL',
    createdAt: new Date(),
    ...overrides,
  }) as Referral;

const makeRemnaUser = (uuid: string, telegramId: number | null = 100) => ({
  uuid,
  telegramId,
  expireAt: new Date(Date.now() + 86_400_000).toISOString(),
  subscriptionUrl: `https://vpn/sub/${uuid}`,
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

function makeRemnaClient(): RemnaClient {
  return {
    getUserByUuid: vi.fn(async (uuid: string) => makeRemnaUser(uuid)),
    updateUser: vi.fn().mockResolvedValue({}),
  } as unknown as RemnaClient;
}

function makeService(referralRepo: Repository<Referral>, remnaClient: RemnaClient) {
  return new ReferralService(referralRepo, remnaClient, {
    emit: vi.fn(),
  } as unknown as EventEmitter2);
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

      const result = await service.handleNewUser(INVITER_UUID, INVITER_UUID);

      expect(result).toEqual({ success: false, reason: 'self_referral' });
    });

    it('creates a referral record keyed by remnawave userId (uuid), not telegramId', async () => {
      const referralRepo = makeReferralRepo(null);
      const remnaClient = makeRemnaClient();
      const service = makeService(referralRepo, remnaClient);

      const result = await service.handleNewUser(INVITER_UUID, INVITED_UUID);

      expect(result).toEqual({ success: true, reason: 'new_user' });
      expect(referralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ inviterId: INVITER_UUID, invitedId: INVITED_UUID }),
      );
      // Values passed through must be the uuids, never numbers/telegramIds.
      const created = (referralRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(typeof created.inviterId).toBe('string');
      expect(typeof created.invitedId).toBe('string');
    });

    it('does not reward the inviter at signup — reward only happens after the friend pays', async () => {
      const remnaClient = makeRemnaClient();
      const service = makeService(makeReferralRepo(null), remnaClient);

      await service.handleNewUser(INVITER_UUID, INVITED_UUID);

      expect(remnaClient.updateUser).not.toHaveBeenCalled();
    });

    it('fails when the inviter uuid does not resolve to a remnawave user', async () => {
      const remnaClient = {
        getUserByUuid: vi.fn().mockResolvedValue(null),
        updateUser: vi.fn(),
      } as unknown as RemnaClient;
      const service = makeService(makeReferralRepo(null), remnaClient);

      const result = await service.handleNewUser(INVITER_UUID, INVITED_UUID);

      expect(result).toEqual({ success: false, reason: 'inviter_not_found' });
      expect(remnaClient.updateUser).not.toHaveBeenCalled();
    });

    it('does not create a duplicate referral when the invitedId already has one', async () => {
      const referralRepo = makeReferralRepo(makeReferral());
      const service = makeService(referralRepo, makeRemnaClient());

      const result = await service.handleNewUser(INVITER_UUID, INVITED_UUID);

      expect(result.success).toBe(false);
      expect(referralRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('handleInviterRewardAfterPayment', () => {
    it('rewards both the invited user and the inviter with the same bonus once the friend pays', async () => {
      const referralRepo = makeReferralRepo(makeReferral({ status: 'TRIAL' }));
      const remnaClient = makeRemnaClient();
      const service = makeService(referralRepo, remnaClient);

      const result = await service.handleInviterRewardAfterPayment(INVITED_UUID);

      expect(result.rewarded).toBe(true);
      expect(referralRepo.findOne).toHaveBeenCalledWith({ where: { invitedId: INVITED_UUID } });
      // Both sides are resolved and extended via their remnawave uuid.
      expect(remnaClient.getUserByUuid).toHaveBeenCalledWith(INVITER_UUID);
      expect(remnaClient.getUserByUuid).toHaveBeenCalledWith(INVITED_UUID);
      expect(remnaClient.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: INVITER_UUID }),
      );
      expect(remnaClient.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: INVITED_UUID }),
      );
    });

    it('does not reward twice once the referral is COMPLETED', async () => {
      const referralRepo = makeReferralRepo(makeReferral({ status: 'COMPLETED' }));
      const service = makeService(referralRepo, makeRemnaClient());

      const result = await service.handleInviterRewardAfterPayment(INVITED_UUID);

      expect(result).toEqual({ rewarded: false, reason: 'already_completed' });
    });

    it('returns no_referral when there is no referral row for this invited userId', async () => {
      const referralRepo = makeReferralRepo(null);
      const service = makeService(referralRepo, makeRemnaClient());

      const result = await service.handleInviterRewardAfterPayment(INVITED_UUID);

      expect(result).toEqual({ rewarded: false, reason: 'no_referral' });
    });
  });

  describe('getReferralByInvitedId / deleteByInvitedId', () => {
    it('queries and deletes by the string userId', async () => {
      const referralRepo = makeReferralRepo(makeReferral());
      const service = makeService(referralRepo, makeRemnaClient());

      await service.getReferralByInvitedId(INVITED_UUID);
      expect(referralRepo.findOne).toHaveBeenCalledWith({ where: { invitedId: INVITED_UUID } });

      await service.deleteByInvitedId(INVITED_UUID);
      expect(referralRepo.delete).toHaveBeenCalledWith({ invitedId: INVITED_UUID });
    });
  });
});
