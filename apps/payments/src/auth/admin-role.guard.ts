import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './client-user.guard';

/**
 * Must be composed after ClientUserGuard, which populates
 * `req.authenticatedEmail` and `req.authenticatedTelegramId`.
 *
 * Checks that the resolved identity appears in the PUBLIC_ADMINS env var
 * (comma-separated telegramIds and/or email addresses).
 *
 * Replaces the old AdminGuard which accepted a client-controlled X-Admin-Id
 * header — that header could be forged by anyone who knew an admin's ID.
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  private readonly adminIds: Set<string>;

  constructor() {
    const raw = process.env.PUBLIC_ADMINS ?? '';
    this.adminIds = new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const identities = [
      req.authenticatedEmail,
      req.authenticatedTelegramId != null ? String(req.authenticatedTelegramId) : undefined,
    ].filter((id): id is string => id != null);

    if (!identities.some((id) => this.adminIds.has(id))) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
