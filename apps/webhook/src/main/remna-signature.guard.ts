import * as crypto from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Validates the HMAC-SHA256 signature on every inbound Remnawave webhook.
 *
 * Remnawave signs the JSON-serialised request body with the shared secret and
 * includes the hex digest in the `x-remnawave-signature` header.  This guard
 * rejects requests whose signature does not match — in every environment.
 *
 * Configuration:
 *   REMNAWAVE_WEBHOOK_SECRET — required; the shared secret configured in the
 *                              Remnawave panel under Webhook settings.
 */
@Injectable()
export class RemnaSignatureGuard implements CanActivate {
  private readonly logger = new Logger(RemnaSignatureGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      body: unknown;
    }>();

    const signature = request.headers['x-remnawave-signature'] ?? '';
    const secret = this.configService.get<string>('REMNAWAVE_WEBHOOK_SECRET', '');

    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(request.body))
      .digest('hex');

    if (expected !== signature) {
      this.logger.warn('Remnawave webhook rejected: invalid HMAC signature');
      throw new UnauthorizedException('Invalid Remnawave webhook signature');
    }

    return true;
  }
}
