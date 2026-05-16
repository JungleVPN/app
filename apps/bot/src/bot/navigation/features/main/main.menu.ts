import * as process from 'node:process';
import { Menu } from '@bot/navigation';
import { DevicesMenu } from '@bot/navigation/features/devices/devices.menu';
import { PaymentMethodMenu } from '@bot/navigation/features/payment/payment-method/payment-method.menu';
import { ProfileMenu } from '@bot/navigation/features/profile/profile.menu';
import { ProfileMenuService } from '@bot/navigation/features/profile/profile-menu.service';
import { ReferralMenu } from '@bot/navigation/features/referral/referral.menu';
import { ReferralMenuService } from '@bot/navigation/features/referral/referral.service';
import { SupportMenu } from '@bot/navigation/features/support/support.menu';
import { Base } from '@bot/navigation/menu.base';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { RemnaService } from '@remna/remna.service';

@Injectable()
export class MainMenu extends Base {
  readonly menu = new Menu('main-menu');

  constructor(
    @Inject(forwardRef(() => DevicesMenu))
    readonly devicesMenu: DevicesMenu,
    @Inject(forwardRef(() => PaymentMethodMenu))
    readonly paymentMethodMenu: PaymentMethodMenu,
    @Inject(forwardRef(() => ProfileMenu))
    readonly profileMenu: ProfileMenu,
    readonly supportMenu: SupportMenu,
    @Inject(forwardRef(() => ReferralMenu))
    readonly referralMenu: ReferralMenu,
    readonly remnaService: RemnaService,
    readonly referralMenuService: ReferralMenuService,
    readonly profileMenuService: ProfileMenuService,
  ) {
    super();

    this.menu
      .webApp(
        (ctx) => ctx.t('connect-button-label'),
        process.env.TMA_APP_URL || 'https://miniapp.thejungle.pro',
      )
      .row()
      // .text(
      //   (ctx) => ctx.t('extend-button-label'),
      //   async (ctx) => {
      //     await this.render(ctx, ctx.t('payment-methods-text'), this.paymentMethodMenu.menu);
      //   },
      // )
      .webApp(
        (ctx) => ctx.t('pay-button-label'),
        process.env.TMA_APP_PAYMENT_URL || 'https://miniapp.thejungle.pro',
      )
      // .text(
      //   (ctx) => ctx.t('profile-button-label'),
      //   async (ctx) => await this.profileMenuService.init(ctx),
      // )
      .row()
      .text(
        (ctx) => ctx.t('referra-button-label'),
        async (ctx) => {
          await this.referralMenuService.init(ctx, this.referralMenu.menu);
        },
      )
      .url(
        (ctx) => ctx.t('chanel-button-label'),
        process.env.TELEGRAM_CHANNEL_URL || 'https://t.me/in_the_jungle',
      )
      .row()
      .dynamic(async (ctx, range) => {
        const tgUser = this.validateUser(ctx.from);

        const user = await this.remnaService.getUserByTgId(tgUser.id);

        if (user) {
          range.text(
            (ctx) => ctx.t('not-workinig-button-label'),
            async (ctx) => {
              await this.render(ctx, ctx.t('support-text'), this.supportMenu.menu);
            },
          );
        }
      });
  }
}
