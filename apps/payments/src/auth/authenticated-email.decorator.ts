import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './client-user.guard';

/**
 * Extracts the email established by ClientUserGuard, when the credential
 * carried one — Supabase JWTs do, Telegram initData does not.
 *
 * Undefined is therefore an ordinary outcome, not an error: Telegram-only users
 * legitimately have no email. Only valid on routes protected by
 * @UseGuards(ClientUserGuard).
 */
export const AuthenticatedEmail = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().authenticatedEmail;
  },
);
