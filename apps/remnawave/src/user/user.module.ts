import { Module } from '@nestjs/common';
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
  // MeController and ConnectController listed first so their literal paths
  // (/users/me/*, /users/connect/*) match before UserController's /:uuid routes.
  controllers: [MeController, ConnectController, UserController],
  providers: [RemnaPanelClient, UserService, InterServiceGuard, ClientUserGuard, TelegramCredentialGuard, AnyCredentialGuard],
  exports: [UserService],
})
export class UserModule {}
