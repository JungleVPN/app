import { Controller, Get, Res } from '@nestjs/common';
import type { NodeStatDto } from '@workspace/types';
import type { Response } from 'express';
import { NodeStatsService } from './node-stats.service';

/**
 * Public on purpose: the landing page's Stats block renders it for anonymous
 * visitors. The service strips every node down to the fields that block shows.
 */
@Controller('nodes')
export class NodeStatsController {
  constructor(private readonly nodeStatsService: NodeStatsService) {}

  @Get('stats')
  async getStats(@Res({ passthrough: true }) response: Response): Promise<NodeStatDto[]> {
    response.set('Cache-Control', 'public, max-age=60');
    return this.nodeStatsService.list();
  }
}
