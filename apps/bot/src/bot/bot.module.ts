import { NavigateMainCallback } from '@bot/callbacks/navigate-main.callback';
import { BroadcastDeleteCommand } from '@bot/commands/broadcast/broadcast-delete.command';
import { BroadcastEditCommand } from '@bot/commands/broadcast/broadcast-edit.command';
import { BroadcastMessageCommand } from '@bot/commands/broadcast/broadcast-message.command';
import { StartCommand } from '@bot/commands/start.command';
import { InlineQueryListener } from '@bot/listeners/inline-query.listener';
import { PaymentStatusListener } from '@bot/listeners/payment-status.listener';
import { TelegramStarsListener } from '@bot/listeners/telegram-stars.listener';
import { UserRewardedListener } from '@bot/listeners/user.rewarded.listener';
import { UserExpireListener } from '@bot/listeners/user-expire.listener';
import { UserNotConnectedListener } from '@bot/listeners/user-not-connected.listener';
import { LocalisationService } from '@bot/localisation/localisation.service';
import { MainMenu } from '@bot/navigation/features/main/main.menu';
import { MainMenuService } from '@bot/navigation/features/main/main.service';
import { MainKeyboardCallback } from '@bot/navigation/features/main/main-keyboard.callback';
import { RevokeSubMenuService } from '@bot/navigation/features/subscription/revokeSub.service';
import { MenuModule } from '@bot/navigation/menu.module';
import { PollService } from '@bot/poll/poll.service';
import { BroadcastsModule } from '@broadcasts/broadcasts.module';
import { Module } from '@nestjs/common';
import { CurrencyService } from '@payments/currency-service/currency.service';
import { PaymentsModule } from '@payments/payments.module';
import { ReferralModule } from '@referral/referral.module';
import { RemnaModule } from '@remna/remna.module';
import { RemnaService } from '@remna/remna.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AnalyticsClientModule } from '../analytics/analytics-client.module';
import { BotService } from './bot.service';

@Module({
  imports: [
    PaymentsModule,
    RemnaModule,
    MenuModule,
    ReferralModule,
    BroadcastsModule,
    AnalyticsClientModule,
  ],
  providers: [
    BotService,
    RemnaService,
    AnalyticsService,
    // MENU SERVICES
    MainMenuService,
    RevokeSubMenuService,
    MainMenu,
    LocalisationService,
    CurrencyService,
    // HANDLERS
    UserExpireListener,
    UserNotConnectedListener,
    PaymentStatusListener,
    TelegramStarsListener,
    UserRewardedListener,
    InlineQueryListener,
    // COMMANDS
    StartCommand,
    BroadcastMessageCommand,
    BroadcastEditCommand,
    BroadcastDeleteCommand,
    PollService,
    // CALLBACKS
    NavigateMainCallback,
    MainKeyboardCallback,
  ],
  exports: [BotService],
})
export class BotModule {}
