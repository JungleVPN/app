import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Protects admin endpoints by verifying that the caller's identity is
 * listed in the ADMINS environment variable (comma-separated values —
 * Telegram ids for TMA users, emails for web users).
 *
 * The caller must send the header:
 *   X-Admin-Id: <telegramId | email>
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  private readonly adminIds: Set<string> = (() => {
    const raw = process.env.PUBLIC_ADMINS ?? '';
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return new Set(ids);
  })();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const callerIdRaw = request.headers['x-admin-id'];
    const callerId = Array.isArray(callerIdRaw) ? callerIdRaw[0] : callerIdRaw;

    if (!callerId || !this.adminIds.has(callerId)) {
      this.logger.warn(`AdminGuard: rejected request from id=${callerId ?? 'missing'}`);
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
