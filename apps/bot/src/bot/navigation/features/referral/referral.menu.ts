import { Menu } from '@bot/navigation';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { Base } from '@bot/navigation/menu.base';
import { forwardRef, Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ReferralMenu extends Base {
  readonly menu = new Menu('referral-menu');

  constructor(
    readonly mainMenuService: MainMenuService,
    @Inject(forwardRef(() => MainMenu))
    readonly mainMenu: MainMenu,
  ) {
    super();

    this.menu
      .switchInline((ctx) => ctx.t('invite-button-label'))
      .row()
      .text(
        (ctx) => ctx.t('home-button-label'),
        async (cxt) => {
          await this.mainMenuService.init(cxt, this.mainMenu);
        },
      );
  }
}
