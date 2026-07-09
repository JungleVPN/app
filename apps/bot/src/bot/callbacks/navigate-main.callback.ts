import { BotContext } from '@bot/bot.types';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { Injectable } from '@nestjs/common';
import { Bot } from 'grammy';

@Injectable()
export class NavigateMainCallback {
  constructor(
    readonly mainMenu: MainMenu,
    readonly mainMenuService: MainMenuService,
  ) {}

  register(bot: Bot<BotContext>) {
    bot.callbackQuery('navigate_main', async (ctx) => {
      await this.mainMenuService.init(ctx, this.mainMenu, true);
      await ctx.answerCallbackQuery();
    });
  }
}
