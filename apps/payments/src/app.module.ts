import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutopaymentModule } from '@payments/autopayment/autopayment.module';
import { BotNotificationModule } from '@payments/notifications/bot-notification.module';
import { StripeModule } from '@payments/providers/stripe/stripe.module';
import { TelegramStarsModule } from '@payments/providers/telegram-stars/telegram-stars.module';
import { YookassaModule } from '@payments/providers/yookassa/yookassa.module';
import { dataSourceOptions } from '@workspace/database';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.development', '../../.env'],
      expandVariables: true,
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot(dataSourceOptions),
    StripeModule,
    TelegramStarsModule,
    YookassaModule,
    AutopaymentModule,
    BotNotificationModule,
  ],
})
export class AppModule {}
