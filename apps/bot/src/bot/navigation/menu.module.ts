import { LocalisationService } from '@bot/localisation/localisation.service';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { ReferralMenu } from '@bot/navigation/features/referral/referral.menu';
import { ReferralMenuService } from '@bot/navigation/features/referral/referral.service';
import { RevokeSubMenuService } from '@bot/navigation/features/subscription/revokeSub.service';
import { SubscriptionMenu } from '@bot/navigation/features/subscription/subscription.menu';
import { SupportMenu } from '@bot/navigation/features/support/support.menu';
import { Module } from '@nestjs/common';
import { CurrencyService } from '@payments/currency-service/currency.service';
import { PaymentsService } from '@payments/payments.service';
import { ReferralService } from '@referral/referral.service';
import { RemnaService } from '@remna/remna.service';
import { MenuTree } from './menu.tree';

@Module({
  providers: [
    // SERVICES
    MainMenuService,
    RevokeSubMenuService,
    ReferralMenuService,
    RemnaService,
    ReferralService,
    LocalisationService,
    PaymentsService,
    CurrencyService,
    // MENUS
    MenuTree,
    MainMenu,
    SubscriptionMenu,
    SupportMenu,
    ReferralMenu,
  ],
  exports: [
    // SERVICES
    MainMenuService,
    RevokeSubMenuService,
    ReferralMenuService,
    // MENUS
    MenuTree,
    MainMenu,
    SubscriptionMenu,
    SupportMenu,
    ReferralMenu,
  ],
})
export class MenuModule {}
