import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { parseSupabaseJwt } from './supabase-jwt';
import { parseTelegramInitData } from './telegram-init-data';

export interface AuthenticatedRequest {
  authenticatedUserId: number;
  authenticatedEmail?: string;
  authenticatedTelegramId?: number;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Guards browser-facing endpoints on the remnawave service.
 *
 * Accepts the same two credentials as the payments service:
 *   1. X-Telegram-Init-Data — validated via HMAC-SHA256 with bot token
 *   2. Authorization: Bearer <jwt> — ES256 JWT validated with Supabase public key
 *
 * Unlike the payments service, resolution is a direct DB lookup via UserService
 * (no inter-service HTTP hop — we are the remnawave service).
 */
@Injectable()
export class ClientUserGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
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

    const users = await this.userService.getUserByTgId(telegramId);
    const userId = users?.[0]?.id;
    if (userId == null) throw new UnauthorizedException('User not found');

    req.authenticatedUserId = userId;
    req.authenticatedTelegramId = telegramId;
    return true;
  }

  private async viaSupabaseJwt(req: AuthenticatedRequest, token: string): Promise<boolean> {
    const publicKeyJwk = this.config.getOrThrow<string>('SUPABASE_JWT_PUBLIC_KEY');

    const { email } = parseSupabaseJwt(token, publicKeyJwk);

    const users = await this.userService.getUserByEmail(email);
    const userId = users?.[0]?.id;
    if (userId == null) throw new UnauthorizedException('User not found');

    req.authenticatedUserId = userId;
    req.authenticatedEmail = email;
    return true;
  }

  private header(req: AuthenticatedRequest, name: string): string | undefined {
    const val = req.headers[name];
    return Array.isArray(val) ? val[0] : val;
  }
}
