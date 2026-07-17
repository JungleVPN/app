import { BotContext } from '@bot/bot.types';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { Base } from '@bot/navigation/menu.base';
import { isValidUsername, toDateString } from '@bot/utils/utils';
import { Injectable } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';

@Injectable()
export class MainMenuService extends Base {
  constructor(readonly remnaService: RemnaService) {
    super();
  }

  async init(ctx: BotContext, mainMenu: MainMenu, deleteOldMsg?: boolean) {
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

    // Reply keyboards can't be attached via editMessageText (Telegram only
    // supports inline keyboards there), so this always sends a fresh message.
    if (deleteOldMsg) {
      try {
        await ctx.deleteMessage();
      } catch {}
    }

    await this.render(ctx, content, mainMenu.build(ctx));
  }
}
