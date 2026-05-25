import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Protects admin endpoints by verifying that the caller's Telegram id is
 * listed in the ADMINS environment variable (comma-separated ids).
 *
 * The caller must send the header:
 *   X-Admin-Telegram-Id: <telegramId>
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  private readonly adminIds: Set<string> = (() => {
    const raw = process.env.ADMINS ?? '';
    const ids = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return new Set(ids);
  })();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const callerIdRaw = request.headers['x-admin-telegram-id'];
    const callerId = Array.isArray(callerIdRaw) ? callerIdRaw[0] : callerIdRaw;

    if (!callerId || !this.adminIds.has(callerId)) {
      this.logger.warn(`AdminGuard: rejected request from telegramId=${callerId ?? 'missing'}`);
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
