import { BotContext } from '@bot/bot.types';
import { ReferralMenu } from '@bot/navigation/features/referral/referral.menu';
import { SubscriptionMenu } from '@bot/navigation/features/subscription/subscription.menu';
import { SupportMenu } from '@bot/navigation/features/support/support.menu';
import { Injectable } from '@nestjs/common';
import { Bot } from 'grammy';

@Injectable()
export class MenuTree {
  constructor(
    private readonly subscriptionMenu: SubscriptionMenu,
    private readonly supportMenu: SupportMenu,
    private readonly referralMenu: ReferralMenu,
  ) {}

  init(bot: Bot<BotContext>) {
    bot.use(this.subscriptionMenu.menu);
    bot.use(this.supportMenu.menu);
    bot.use(this.referralMenu.menu);
  }
}
