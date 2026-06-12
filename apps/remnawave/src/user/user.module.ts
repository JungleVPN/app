import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAttribution } from '@workspace/database';
import { RemnaPanelClient } from '../common/remna-panel.client';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserAttribution])],
  controllers: [UserController],
  providers: [RemnaPanelClient, UserService, InterServiceGuard],
  exports: [UserService],
})
export class UserModule {}
