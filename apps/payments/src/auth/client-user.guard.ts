import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RemnaUserResolverService } from './remna-user-resolver.service';
import { parseSupabaseJwt } from './supabase-jwt';
import { parseTelegramInitData } from './telegram-init-data';

export interface AuthenticatedRequest {
  authenticatedUserId: string;
  authenticatedEmail: string;
  authenticatedTelegramId?: number;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Guards browser-facing endpoints. Validates one of two platform credentials:
 *
 *   1. X-Telegram-Init-Data — HMAC-SHA256-signed by Telegram with the bot
 *      token. The token never leaves the server; clients can't forge initData.
 *
 *   2. Authorization: Bearer <jwt> — HS256 JWT issued by Supabase, validated
 *      with SUPABASE_JWT_PUBLIC_KEY. The secret never leaves the server.
 *
 * After validation the guard resolves the Remnawave user UUID via an
 * inter-service call and injects it as `req.authenticatedUserId`. Handlers
 * read the user ID from there — never from client-supplied route params.
 */
@Injectable()
export class ClientUserGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly resolver: RemnaUserResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const initDataRaw = this.header(req, 'x-telegram-init-data');
    if (initDataRaw) return this.viaInitData(req, initDataRaw);

    const authHeader = this.header(req, 'authorization');
    if (authHeader?.startsWith('Bearer ')) return this.viaSupabaseJwt(req, authHeader.slice(7));

    throw new UnauthorizedException('Authentication required');
  }

  private async viaInitData(req: AuthenticatedRequest, raw: string): Promise<boolean> {
    const botToken = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    const maxAge = parseInt(
      this.config.get<string>('TELEGRAM_INIT_DATA_MAX_AGE_SECONDS', '3600'),
      10,
    );

    const { telegramId } = parseTelegramInitData(raw, botToken, maxAge);
    req.authenticatedUserId = await this.resolver.resolveByTelegramId(telegramId);
    req.authenticatedTelegramId = telegramId;
    return true;
  }

  private async viaSupabaseJwt(req: AuthenticatedRequest, token: string): Promise<boolean> {
    const publicKeyJwk = this.config.getOrThrow<string>('SUPABASE_JWT_PUBLIC_KEY');

    const { email } = parseSupabaseJwt(token, publicKeyJwk);
    req.authenticatedUserId = await this.resolver.resolveByEmail(email);
    req.authenticatedEmail = email;
    return true;
  }

  private header(req: AuthenticatedRequest, name: string): string | undefined {
    const val = req.headers[name];
    return Array.isArray(val) ? val[0] : val;
  }
}
