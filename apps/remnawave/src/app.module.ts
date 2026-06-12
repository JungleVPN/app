import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from '@workspace/database';
import { RemnawaveHealthController } from './health/health.controller';
import { HwidModule } from './hwid/hwid.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.development', '../../.env'],
      expandVariables: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    UserModule,
    SubscriptionModule,
    HwidModule,
  ],
  controllers: [RemnawaveHealthController],
})
export class AppModule {}
