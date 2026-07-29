import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './client-user.guard';

/**
 * Extracts the Remnawave user UUID injected by ClientUserGuard.
 * Only valid on routes protected by @UseGuards(ClientUserGuard).
 */
export const AuthenticatedUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().authenticatedUserId;
  },
);
