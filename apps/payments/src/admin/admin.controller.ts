import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import type { AdminPaymentDto } from '@workspace/types';
import { AdminService } from './admin.service';

/**
 * Unified payment search — no admin guard required.
 * Accessible via GET /search?q=<value>
 * (global prefix "payments" → full path: /payments/search)
 *
 * Works for both regular users (query by own userId) and admins
 * (query by paymentId, userId, or telegramId).
 */
@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('search')
  searchPayments(@Query('q') q: string): Promise<AdminPaymentDto[]> {
    if (!q?.trim()) throw new BadRequestException('Query parameter "q" is required');
    return this.adminService.search(q.trim());
  }
}
