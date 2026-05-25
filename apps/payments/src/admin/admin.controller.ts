import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AdminPaymentDto } from '@workspace/types';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Search payments across all providers by paymentId, userId or telegramId.
   *
   * GET /admin/payments/search?q=<value>
   *
   * Protected by AdminGuard — caller must supply:
   *   X-Admin-Telegram-Id: <telegramId>
   */
  @Get('payments/search')
  searchPayments(@Query('q') q: string): Promise<AdminPaymentDto[]> {
    if (!q?.trim()) throw new BadRequestException('Query parameter "q" is required');
    return this.adminService.search(q.trim());
  }
}
