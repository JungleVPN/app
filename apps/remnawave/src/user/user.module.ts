import { Module } from '@nestjs/common';
import { AnalyticsClientService } from '../analytics/analytics-client.service';
import { RemnaPanelClient } from '../common/remna-panel.client';
import { AnyCredentialGuard } from '../auth/any-credential.guard';
import { ClientUserGuard } from '../auth/client-user.guard';
import { TelegramCredentialGuard } from '../auth/telegram-credential.guard';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { HwidModule } from '../hwid/hwid.module';
import { ConnectController } from './connect.controller';
import { MeController } from './me.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [HwidModule],
  controllers: [MeController, ConnectController, UserController],
  providers: [RemnaPanelClient, UserService, InterServiceGuard, AnalyticsClientService, ClientUserGuard, TelegramCredentialGuard, AnyCredentialGuard],
  exports: [UserService],
})
export class UserModule {}
