import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { ReferralService } from './referral.service';

@Controller()
@UseGuards(InterServiceGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /** GET /referrals/by-invited/:userId */
  @Get('by-invited/:userId')
  async getByInvitedId(@Param('userId') userId: string) {
    return this.referralService.getReferralByInvitedId(userId);
  }

  /** POST /referrals — create the referral record once the invited user's account exists */
  @Post()
  async handleNewUser(@Body() body: { inviterId: string; invitedId: string }) {
    return this.referralService.handleNewUser(body.inviterId, body.invitedId);
  }

  /** POST /referrals/reward-after-payment — reward inviter when invited user pays */
  @Post('reward-after-payment')
  async rewardAfterPayment(@Body() body: { invitedId: string }) {
    return this.referralService.handleInviterRewardAfterPayment(body.invitedId);
  }

  /** DELETE /referrals/by-invited/:userId */
  @Delete('by-invited/:userId')
  async deleteByInvitedId(@Param('userId') userId: string) {
    await this.referralService.deleteByInvitedId(userId);
    return { deleted: true };
  }
}
