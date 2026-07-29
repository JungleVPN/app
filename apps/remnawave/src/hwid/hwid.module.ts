import { Module } from '@nestjs/common';
import { RemnaPanelClient } from '../common/remna-panel.client';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { HwidController } from './hwid.controller';
import { HwidService } from './hwid.service';

@Module({
  controllers: [HwidController],
  providers: [RemnaPanelClient, HwidService, InterServiceGuard],
  exports: [HwidService],
})
export class HwidModule {}
