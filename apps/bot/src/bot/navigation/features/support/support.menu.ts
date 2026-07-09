import * as process from 'node:process';
import { Menu } from '@bot/navigation';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { RevokeSubMenuService } from '@bot/navigation/features/subscription/revokeSub.service';
import { Base } from '@bot/navigation/menu.base';
import { withReferral } from '@bot/utils/utils';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';

@Injectable()
export class SupportMenu extends Base {
  menu = new Menu('support-menu');

  constructor(
    readonly revokeSubMenuService: RevokeSubMenuService,
    readonly mainMenuService: MainMenuService,
    @Inject(forwardRef(() => MainMenu))
    readonly mainMenu: MainMenu,
  ) {
    super();

    this.menu
      .dynamic((_, range) => {
        const keyboard = new InlineKeyboard();
        range.text(
          (ctx) => ctx.t('new-link-button-label'),
          async (ctx) => {
            await this.revokeSubMenuService.init(ctx);

            await this.render(
              ctx,
              ctx.t('revoked-sub-text'),
              keyboard.webApp(
                ctx.t('connect-button-label'),
                withReferral(ctx, process.env.TMA_APP_URL || 'https://miniapp.thejungle.pro'),
              ),
            );
          },
        );
      })
      .row()
      .url(
        (ctx) => ctx.t('support-button-label'),
        process.env.PUBLIC_SUPPORT_URL || 'https://t.me/JungleVPN_support_bot',
      )
      .row()
      .text(
        (ctx) => ctx.t('home-button-label'),
        async (ctx) => {
          await this.mainMenuService.init(ctx, this.mainMenu);
        },
      );
  }
}
