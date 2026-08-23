import { BotContext } from '@bot/bot.types';
import { SubscriptionMenu } from '@bot/navigation/features/subscription/subscription.menu';
import { Base } from '@bot/navigation/menu.base';
import { getRedirectUrl } from '@bot/utils/utils';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';

@Injectable()
export class RevokeSubMenuService extends Base {
  constructor(
    readonly remnaService: RemnaService,
    @Inject(forwardRef(() => SubscriptionMenu))
    readonly subscriptionMenu: SubscriptionMenu,
  ) {
    super();
  }

  async init(ctx: BotContext) {
    const session = ctx.session;
    const user = await this.remnaService.getUserByTgId(ctx.from?.id || 0);

    if (!user) {
      await ctx.reply(ctx.t('error-generic-restart'));
      return;
    }
    ctx.session.userId = user[0].id;
    const subUrl = await this.remnaService.revokeSub(user[0].id);
    session.redirectUrl = getRedirectUrl(session.selectedDevice, subUrl);
    session.subscriptionUrl = subUrl;
  }
}
