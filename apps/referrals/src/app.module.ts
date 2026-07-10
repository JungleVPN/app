import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions, Referral } from '@workspace/database';
import { InterServiceGuard } from './guards/inter-service.guard';
import { PaymentsClient } from './main/payments.client';
import { ReferralController } from './main/referral.controller';
import { ReferralService } from './main/referral.service';
import { RemnaClient } from './main/remna.client';
import { ReferralsNotificationModule } from './notifications/referrals-notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.development', '../../.env'],
      expandVariables: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([Referral]),
    EventEmitterModule.forRoot(),
    ReferralsNotificationModule,
  ],
  controllers: [ReferralController],
  providers: [ReferralService, RemnaClient, PaymentsClient, InterServiceGuard],
})
export class AppModule {}
