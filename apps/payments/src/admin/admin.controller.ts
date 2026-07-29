import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AdminPaymentDto } from '@workspace/types';
import { AuthenticatedUserId } from '../auth/authenticated-user.decorator';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { ClientUserGuard } from '../auth/client-user.guard';
import { AdminService } from './admin.service';

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Returns the authenticated user's own payment history across all providers.
   * userId is derived from the validated credential — never from client input.
   */
  @Get('my-transactions')
  @UseGuards(ClientUserGuard)
  getMyTransactions(@AuthenticatedUserId() userId: string): Promise<AdminPaymentDto[]> {
    return this.adminService.search(userId);
  }

  /**
   * Cross-user payment search — admin only.
   * Identity is validated via credential; the caller must be in PUBLIC_ADMINS.
   * Replaces the old X-Admin-Id header approach which was trivially forgeable.
   */
  @Get('search')
  @UseGuards(ClientUserGuard, AdminRoleGuard)
  searchPayments(@Query('q') q: string): Promise<AdminPaymentDto[]> {
    if (!q?.trim()) throw new BadRequestException('Query parameter "q" is required');
    return this.adminService.search(q.trim());
  }
}
