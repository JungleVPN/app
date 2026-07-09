import { Menu } from '@bot/navigation';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { Base } from '@bot/navigation/menu.base';
import { getAppUrl } from '@bot/utils/utils';
import { forwardRef, Inject, Injectable } from '@nestjs/common';

@Injectable()
export class SubscriptionMenu extends Base {
  menu = new Menu('subscription-menu');
  constructor(
    readonly mainMenuService: MainMenuService,
    @Inject(forwardRef(() => MainMenu))
    readonly mainMenu: MainMenu,
  ) {
    super();

    this.menu
      .url(
        (ctx) => ctx.t('download-button-label'),
        (ctx) => {
          const link = getAppUrl(ctx.session.selectedDevice);
          return link || 'https://example.com/fallback';
        },
      )
      .url(
        (ctx) => ctx.t('add-link-button-label'),
        (ctx) => {
          const link = ctx.session.redirectUrl;
          return link || 'https://example.com';
        },
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
