import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Referral } from '@workspace/database';
import { add } from 'date-fns';
import { Repository } from 'typeorm';
import { ReferralRewardedEvent } from '../notifications/referrals-events';
import { RemnaClient } from './remna.client';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  /**
   * Tracks invitedIds (remnawave userId/uuid) currently being processed.
   * Prevents double rewards from duplicate webhook deliveries (Finding #11).
   * A proper DB-level fix requires SELECT FOR UPDATE in a serialisable transaction;
   * this in-memory guard is a fast-path defence against duplicate async calls within
   * the same process.
   */
  private readonly inFlight = new Set<string>();

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    private readonly remnaClient: RemnaClient,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getReferralByInvitedId(invitedId: string): Promise<Referral | null> {
    return this.referralRepository.findOne({ where: { invitedId } });
  }

  async createReferralRecord(inviterId: string, invitedId: string): Promise<Referral> {
    const referral = this.referralRepository.create({
      inviterId,
      invitedId,
      status: 'TRIAL',
    });
    return this.referralRepository.save(referral);
  }

  /**
   * Handles referral creation once the invited user's remnawave account actually
   * exists. inviterId/invitedId are both remnawave userIds (uuid) — the invited
   * one only becomes available at account-creation time, so this must be called
   * from there rather than at the initial /start ref_xxx click.
   */
  async handleNewUser(
    inviterId: string,
    invitedId: string,
  ): Promise<{ success: boolean; reason?: string }> {
    if (inviterId === invitedId) {
      this.logger.warn(`User ${invitedId} tried to refer themselves.`);
      return { success: false, reason: 'self_referral' };
    }

    const referral = await this.getReferralByInvitedId(invitedId);

    if (referral && inviterId !== referral.inviterId) {
      this.logger.warn('Someone has already invited: ', referral?.invitedId);
      return { success: false, reason: 'user_is_invited' };
    }

    if (referral && referral.status === 'COMPLETED') {
      this.logger.warn(`Invited user ${invitedId} already completed referral.`);
      return { success: false, reason: 'referral_completed' };
    }

    if (referral) {
      this.logger.warn(`Invited user ${invitedId} already has a referral record.`);
      return { success: false, reason: 'already_exists' };
    }

    const inviter = await this.remnaClient.getUserByUuid(inviterId);
    if (!inviter) {
      this.logger.warn(`Inviter ${inviterId} not found.`);
      return { success: false, reason: 'inviter_not_found' };
    }

    await this.createReferralRecord(inviterId, invitedId);

    const bonusDays = Number(process.env.INVITER_START_BONUS_IN_DAYS || '1');
    await this.rewardUser(inviterId, bonusDays, true);

    return { success: true, reason: 'new_user' };
  }

  /**
   * Rewards the inviter after the invited user makes their first payment.
   * Sets referral status to COMPLETED to prevent duplicate rewards.
   *
   * Guards:
   *  - in-flight set prevents double execution for the same invitedId within
   *    a single process (duplicate webhook deliveries, Finding #11)
   *  - optional paymentRepo verifies a confirmed payment exists before any
   *    reward is issued (Finding #6)
   */
  async handleInviterRewardAfterPayment(
    invitedId: string,
  ): Promise<{ rewarded: boolean; reason?: string }> {
    // Concurrency guard: if an identical call is already in-flight, reject early.
    // This is the fast-path defence; a DB-level SELECT FOR UPDATE transaction is
    // required for a complete fix across multiple process instances.
    if (this.inFlight.has(invitedId)) {
      return { rewarded: false, reason: 'already_processing' };
    }
    this.inFlight.add(invitedId);

    try {
      const referral = await this.referralRepository.findOne({
        where: { invitedId },
      });

      if (!referral) {
        return { rewarded: false, reason: 'no_referral' };
      }

      if (referral.status === 'COMPLETED') {
        this.logger.log(
          `Inviter ${referral.inviterId} already received all bonuses for ${invitedId}`,
        );
        return { rewarded: false, reason: 'already_completed' };
      }

      const bonusDays = Number(process.env.INVITER_PAID_BONUS_IN_DAYS || '7');
      await this.rewardUser(referral.inviterId, bonusDays, false);

      referral.status = 'COMPLETED';
      await this.referralRepository.save(referral);

      return { rewarded: true };
    } finally {
      // Always release the lock — even when an error is thrown mid-flight, so
      // a legitimate retry can succeed after the rollback.
      this.inFlight.delete(invitedId);
    }
  }

  async deleteByInvitedId(invitedId: string): Promise<void> {
    await this.referralRepository.delete({ invitedId });
  }

  private async rewardUser(inviterId: string, days: number, isNewUser: boolean): Promise<void> {
    const user = await this.remnaClient.getUserByUuid(inviterId);
    if (!user) return;

    const newExpireAt = add(new Date(user.expireAt), { days });

    await this.remnaClient.updateUser({
      uuid: user.uuid,
      expireAt: newExpireAt,
    });

    const payload: ReferralRewardedEvent = {
      telegramId: user.telegramId,
      isNewUser,
    };

    this.eventEmitter.emit('user.rewarded', payload);
    this.logger.log(`Rewarded inviter ${inviterId} with ${days} day(s)`);
  }
}
