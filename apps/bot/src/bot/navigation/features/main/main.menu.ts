import { BotContext } from '@bot/bot.types';
import { Injectable } from '@nestjs/common';
import { Keyboard } from 'grammy';

@Injectable()
export class MainMenu {
  build(ctx: BotContext): Keyboard {
    return new Keyboard()
      .text(ctx.t('connect-button-label'))
      .text(ctx.t('pay-button-label'))
      .row()
      .text(ctx.t('referra-button-label'))
      .text(ctx.t('chanel-button-label'))
      .row()
      .text(ctx.t('not-workinig-button-label'))
      .resized()
      .persistent();
  }
}
