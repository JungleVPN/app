import { Module } from '@nestjs/common';
import { RemnaPanelClient } from '../common/remna-panel.client';
import { NodeStatsController } from './node-stats.controller';
import { NodeStatsService } from './node-stats.service';

@Module({
  controllers: [NodeStatsController],
  providers: [RemnaPanelClient, NodeStatsService],
})
export class NodeStatsModule {}
