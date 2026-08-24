import * as process from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Referral } from '@workspace/database';
import { add } from 'date-fns';
import { Repository } from 'typeorm';
import { AnalyticsClientService } from '../analytics/analytics-client.service';
import { ReferralRewardedEvent } from '../notifications/referrals-events';
import { PaymentsClient } from './payments.client';
import { type ExistingReferralConflict, findExistingReferralConflict } from './referral.utils';
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
  private readonly inFlight = new Set<number>();

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    private readonly remnaClient: RemnaClient,
    private readonly eventEmitter: EventEmitter2,
    private readonly paymentsClient: PaymentsClient,
    private readonly analyticsClient: AnalyticsClientService,
  ) {}

  async getReferralByInvitedId(invitedId: number): Promise<Referral | null> {
    return this.referralRepository.findOne({ where: { invitedId } });
  }

  async createReferralRecord(inviterId: number, invitedId: number): Promise<Referral> {
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
    inviterId: number,
    invitedId: number,
  ): Promise<{ success: boolean; reason?: string }> {
    if (inviterId === invitedId) {
      this.logger.warn(`User ${invitedId} tried to refer themselves.`);
      return { success: false, reason: 'self_referral' };
    }

    const referral = await this.getReferralByInvitedId(invitedId);
    const conflict = findExistingReferralConflict(referral, inviterId);

    if (conflict) {
      this.logReferralConflict(conflict, invitedId);
      return { success: false, reason: conflict };
    }

    const inviter = await this.remnaClient.getUserById(inviterId);
    if (!inviter) {
      this.logger.warn(`Inviter ${inviterId} not found.`);
      return { success: false, reason: 'inviter_not_found' };
    }

    await this.createReferralRecord(inviterId, invitedId);

    this.logger.log(`Referral created: ${invitedId}`);

    return { success: true, reason: 'new_user' };
  }

  /**
   * Rewards both sides of the referral once the invited user's first paid
   * (non-trial) subscription starts. Sets referral status to COMPLETED to
   * prevent duplicate rewards on subsequent renewal payments.
   *
   * Guards:
   *  - in-flight set prevents double execution for the same invitedId within
   *    a single process (duplicate webhook deliveries, Finding #11)
   *  - optional paymentRepo verifies a confirmed payment exists before any
   *    reward is issued (Finding #6)
   */
  async handleInviterRewardAfterPayment(
    invitedId: number,
  ): Promise<{ rewarded: boolean; reason?: string; inviterRewarded?: boolean }> {
    if (this.inFlight.has(invitedId)) {
      return { rewarded: false, reason: 'already_processing' };
    }
    this.inFlight.add(invitedId);

    try {
      return await this.rewardInviterForCompletedReferral(invitedId);
    } finally {
      this.inFlight.delete(invitedId);
    }
  }

  private async rewardInviterForCompletedReferral(
    invitedId: number,
  ): Promise<{ rewarded: boolean; reason?: string; inviterRewarded?: boolean }> {
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

    const bonusDays = Number(process.env.REFERRAL_BONUS_IN_DAYS || '30');
    await this.rewardUser(invitedId, bonusDays, 'invited');

    const inviterEligible = await this.isInviterEligibleForBonus(referral.inviterId);
    if (inviterEligible) {
      await this.rewardUser(referral.inviterId, bonusDays, 'inviter');
    } else {
      this.logger.log(
        `Inviter ${referral.inviterId} skipped for referral bonus — no settled subscription payment on record.`,
      );
    }

    referral.status = 'COMPLETED';
    await this.referralRepository.save(referral);

    await this.analyticsClient.track({
      event: 'referral_reward_granted',
      invitedUserId: invitedId,
      inviterUserId: referral.inviterId,
    });

    return { rewarded: true, inviterRewarded: inviterEligible };
  }

  async deleteByInvitedId(invitedId: number): Promise<void> {
    await this.referralRepository.delete({ invitedId });
  }

  /**
   * Remnawave reports both a TRIAL and a paid subscription as status "ACTIVE",
   * so status alone can't tell a genuinely paying inviter from someone still
   * on their initial trial. Require an ACTIVE subscription *and* at least one
   * settled subscription payment ever recorded.
   */
  private async isInviterEligibleForBonus(inviterId: number): Promise<boolean> {
    const inviter = await this.remnaClient.getUserById(inviterId);
    if (!inviter || inviter.status !== 'ACTIVE') return false;

    return this.paymentsClient.hasEverPaid(inviterId);
  }

  private async rewardUser(
    userId: number,
    days: number,
    role: 'inviter' | 'invited',
  ): Promise<void> {
    const user = await this.remnaClient.getUserById(userId);
    if (!user) return;

    const newExpireAt = add(new Date(user.expireAt), { days });

    await this.remnaClient.updateUser({
      id: user.id,
      expireAt: newExpireAt,
    });

    const payload: ReferralRewardedEvent = {
      userId: user.id,
      telegramId: user.telegramId,
      role,
    };

    this.eventEmitter.emit('user.rewarded', payload);
    this.logger.log(`Rewarded ${role} ${userId} with ${days} day(s)`);
  }

  private logReferralConflict(conflict: ExistingReferralConflict, invitedId: number): void {
    switch (conflict) {
      case 'user_is_invited':
        this.logger.warn('Someone has already invited: ', invitedId);
        return;
      case 'referral_completed':
        this.logger.warn(`Invited user ${invitedId} already completed referral.`);
        return;
      case 'already_exists':
        this.logger.warn(`Invited user ${invitedId} already has a referral record.`);
    }
  }
}
