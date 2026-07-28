import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseSupabaseJwt } from './supabase-jwt';
import { parseTelegramInitData } from './telegram-init-data';

export interface AnyCredentialRequest {
  authenticatedTelegramId?: number;
  authenticatedEmail?: string;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Validates either Telegram initData or a Supabase JWT without requiring the
 * user to already exist in remnawave. Use for registration/init endpoints.
 *
 *   TMA  → injects req.authenticatedTelegramId
 *   Web  → injects req.authenticatedEmail
 */
@Injectable()
export class AnyCredentialGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AnyCredentialRequest>();

    const initDataRaw = this.header(req, 'x-telegram-init-data');
    if (initDataRaw) {
      const botToken = this.config.getOrThrow<string>('PUBLIC_TELEGRAM_BOT_TOKEN');
      const maxAge = parseInt(
        this.config.get<string>('TELEGRAM_INIT_DATA_MAX_AGE_SECONDS', '3600'),
        10,
      );
      const { telegramId } = parseTelegramInitData(initDataRaw, botToken, maxAge);
      req.authenticatedTelegramId = telegramId;
      return true;
    }

    const authHeader = this.header(req, 'authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const publicKeyJwk = this.config.getOrThrow<string>('SUPABASE_JWT_PUBLIC_KEY');
      const { email } = parseSupabaseJwt(authHeader.slice(7), publicKeyJwk);
      req.authenticatedEmail = email;
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }

  private header(req: AnyCredentialRequest, name: string): string | undefined {
    const val = req.headers[name];
    return Array.isArray(val) ? val[0] : val;
  }
}
