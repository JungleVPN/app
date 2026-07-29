import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsClientModule } from '@payments/analytics/analytics-client.module';
import { AdminModule } from '@payments/admin/admin.module';
import { AutopaymentModule } from '@payments/autopayment/autopayment.module';
import { BotNotificationModule } from '@payments/notifications/bot-notification.module';
import { PromoModule } from '@payments/promo/promo.module';
import { StripeModule } from '@payments/providers/stripe/stripe.module';
import { TelegramStarsModule } from '@payments/providers/telegram-stars/telegram-stars.module';
import { YookassaModule } from '@payments/providers/yookassa/yookassa.module';
import { dataSourceOptions } from '@workspace/database';
import { ClientAuthModule } from './auth/client-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.development', '../../.env'],
      expandVariables: true,
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot(dataSourceOptions),
    ClientAuthModule,
    AnalyticsClientModule,
    AdminModule,
    StripeModule,
    TelegramStarsModule,
    YookassaModule,
    AutopaymentModule,
    BotNotificationModule,
    PromoModule,
  ],
})
export class AppModule {}
