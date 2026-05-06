import { BotContext } from '@bot/bot.types';
import { Menu } from '@bot/navigation';
import { Base } from '@bot/navigation/menu.base';
import { isValidUsername, toDateString } from '@bot/utils/utils';
import { Injectable } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';

@Injectable()
export class MainMenuService extends Base {
  constructor(readonly remnaService: RemnaService) {
    super();
  }

  async init(ctx: BotContext, menu: Menu, deleteOldMsg?: boolean) {
    const tgUser = this.validateUser(ctx.from);
    const user = await this.remnaService.getUserByTgId(tgUser.id);
    if (!user) {
      return;
    }
    ctx.session.userId = user[0].uuid;

    const isExpired = Date.now() > new Date(user[0].expireAt).getTime();

    const username = isValidUsername(ctx.from?.username)
      ? ctx.from?.username
      : ctx.t('dear-friend');

    const content = ctx.t('main-text', {
      username: username!,
      expireAt: toDateString(user[0].expireAt),
      isExpired: isExpired ? 'true' : 'false',
      devicesLimit: process.env.HWID_LIMIT ? parseInt(process.env.HWID_LIMIT, 10) : 5,
    });

    await this.render(ctx, content, menu, deleteOldMsg);
  }
}
