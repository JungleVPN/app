import { Controller, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { InterServiceGuard } from '@payments/guards/inter-service.guard';
import {
  type ExpiredSavedMethodsReport,
  ExpiredSavedMethodsService,
} from './expired-saved-methods.service';

@Controller()
export class ExpiredSavedMethodsController {
  constructor(private readonly expiredSavedMethodsService: ExpiredSavedMethodsService) {}

  /**
   * Inter-service only: terminates saved YooKassa methods of users whose access
   * has ended. A dry run unless `dryRun=false`, so a bare call only reports.
   */
  @Post('internal/saved-methods/terminate-expired')
  @HttpCode(200)
  @UseGuards(InterServiceGuard)
  terminateExpired(@Query('dryRun') dryRun?: string): Promise<ExpiredSavedMethodsReport> {
    return this.expiredSavedMethodsService.terminateExpired({
      dryRun: dryRun !== 'false',
      now: new Date(),
    });
  }
}
