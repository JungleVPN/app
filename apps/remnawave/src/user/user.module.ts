import { Module } from '@nestjs/common';
import { RemnaPanelClient } from '../common/remna-panel.client';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [RemnaPanelClient, UserService, InterServiceGuard],
  exports: [UserService],
})
export class UserModule {}
