import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guards internal service-to-service routes on the payments app.
 *
 * Every caller (bot, webhook forwarder) must include the shared secret in the
 * `x-service-secret` request header. Requests without a valid secret are
 * rejected with 401 before any handler logic executes.
 *
 * Only for endpoints with no legitimate browser caller — the Stripe/YooKassa
 * create-session and saved-methods routes are called directly by the web/TMA
 * frontends and must stay unguarded by this secret.
 *
 * Configuration:
 *   INTER_SERVICE_SECRET — required; shared secret known only to internal
 *                          services.
 */
@Injectable()
export class InterServiceGuard implements CanActivate {
  private readonly logger = new Logger(InterServiceGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
    }>();

    const secret = request.headers['x-service-secret'] ?? '';
    const expected = this.configService.get<string>('INTER_SERVICE_SECRET', '');

    if (!expected) {
      this.logger.error('INTER_SERVICE_SECRET is not configured — rejecting all requests');
      throw new UnauthorizedException('INTER_SERVICE_SECRET is not configured');
    }

    if (secret !== expected) {
      this.logger.warn('Inter-service request rejected: invalid x-service-secret header');
      throw new UnauthorizedException('Invalid service secret');
    }

    return true;
  }
}
