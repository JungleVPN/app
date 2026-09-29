import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebhookModule } from './main/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '../../.env.public', '../../.env.payments', '../../.env.secrets'],
      expandVariables: true,
    }),
    EventEmitterModule.forRoot(),
    WebhookModule,
  ],
})
export class AppModule {}
