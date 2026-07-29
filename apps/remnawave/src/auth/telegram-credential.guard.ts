import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseTelegramInitData } from './telegram-init-data';

export interface TelegramCredentialRequest {
  authenticatedTelegramId: number;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Validates a Telegram initData signature and injects `authenticatedTelegramId`.
 * Unlike ClientUserGuard this does NOT require the user to exist in remnawave —
 * use it for registration/linking endpoints where the user may be new.
 */
@Injectable()
export class TelegramCredentialGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<TelegramCredentialRequest>();
    const raw = this.header(req, 'x-telegram-init-data');
    if (!raw) throw new UnauthorizedException('Telegram initData required');

    const botToken = this.config.getOrThrow<string>('PUBLIC_TELEGRAM_BOT_TOKEN');
    const maxAge = parseInt(
      this.config.get<string>('TELEGRAM_INIT_DATA_MAX_AGE_SECONDS', '3600'),
      10,
    );

    const { telegramId } = parseTelegramInitData(raw, botToken, maxAge);
    req.authenticatedTelegramId = telegramId;
    return true;
  }

  private header(req: TelegramCredentialRequest, name: string): string | undefined {
    const val = req.headers[name];
    return Array.isArray(val) ? val[0] : val;
  }
}
