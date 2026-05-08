import { Module } from '@nestjs/common';
import { RemnaPanelClient } from '../common/remna-panel.client';
import { HwidController } from './hwid.controller';
import { HwidService } from './hwid.service';

@Module({
  controllers: [HwidController],
  providers: [RemnaPanelClient, HwidService],
  exports: [HwidService],
})
export class HwidModule {}
