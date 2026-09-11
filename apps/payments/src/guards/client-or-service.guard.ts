import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ClientUserGuard } from '../auth/client-user.guard';
import { InterServiceGuard } from './inter-service.guard';

/**
 * Guards endpoints with two legitimate kinds of caller: the web/TMA frontends
 * and our own services.
 *
 * An `x-service-secret` header means an internal caller (the bot), validated
 * against the shared secret; anything else must present a platform credential
 * and is validated by ClientUserGuard, which injects `req.authenticatedUserId`.
 * Either way the request is authenticated before the handler runs — the two
 * paths differ only in whether an end-user identity comes with it, so handlers
 * must treat a body-supplied user id as trusted only when there is none.
 */
@Injectable()
export class ClientOrServiceGuard implements CanActivate {
  constructor(
    private readonly interServiceGuard: InterServiceGuard,
    private readonly clientUserGuard: ClientUserGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    if (req.headers['x-service-secret']) {
      return this.interServiceGuard.canActivate(context);
    }

    return this.clientUserGuard.canActivate(context);
  }
}
