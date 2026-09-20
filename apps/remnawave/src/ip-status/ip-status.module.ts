import { Module } from '@nestjs/common';
import { RemnaPanelClient } from '../common/remna-panel.client';
import { GeoLookup } from './geo-lookup';
import { IpStatusController } from './ip-status.controller';
import { IpStatusService } from './ip-status.service';

@Module({
  controllers: [IpStatusController],
  providers: [RemnaPanelClient, GeoLookup, IpStatusService],
})
export class IpStatusModule {}
