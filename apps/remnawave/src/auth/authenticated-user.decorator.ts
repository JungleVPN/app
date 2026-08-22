import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './client-user.guard';

export const AuthenticatedUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): number =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().authenticatedUserId,
);
