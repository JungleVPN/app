import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from '@workspace/database';
import { RemnawaveHealthController } from './health/health.controller';
import { HwidModule } from './hwid/hwid.module';
import { IpStatusModule } from './ip-status/ip-status.module';
import { NodeStatsModule } from './node-stats/node-stats.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '../../.env.public', '../../.env.payments', '../../.env.secrets'],
      expandVariables: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    UserModule,
    SubscriptionModule,
    HwidModule,
    IpStatusModule,
    NodeStatsModule,
  ],
  controllers: [RemnawaveHealthController],
})
export class AppModule {}
