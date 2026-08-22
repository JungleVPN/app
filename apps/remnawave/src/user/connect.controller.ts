import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { CreateUserResponseDto, UpdateUserResponseDto } from '@workspace/types';
import { AnyCredentialGuard, type AnyCredentialRequest } from '../auth/any-credential.guard';
import { UserService } from './user.service';

/**
 * Handles the initial user registration/linking flow for both TMA and web clients.
 * Uses AnyCredentialGuard (validates signature without requiring user existence)
 * so new users can create their remnawave account on first access.
 */
@Controller('users/connect')
export class ConnectController {
  constructor(private readonly userService: UserService) {}

  /**
   * Find-or-create the remnawave user for an authenticated client.
   *
   * TMA (X-Telegram-Init-Data):
   *   1. Find by body.email — if found, link telegramId to it and return it.
   *   2. Find by telegramId — if found, save email on it and return it.
   *   3. Neither found — create a new account with both identifiers.
   *
   * Web (Authorization: Bearer <jwt>):
   *   Email comes from the verified JWT (client-supplied email is ignored).
   *   1. Find by JWT email — return if found.
   *   2. Not found — create a new account with the JWT email.
   */
  @Post('email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AnyCredentialGuard)
  async connectEmail(
    @Req() req: AnyCredentialRequest,
    @Body() body: { email?: string; inviterId?: number },
  ): Promise<CreateUserResponseDto | UpdateUserResponseDto | null> {
    const { authenticatedTelegramId: telegramId, authenticatedEmail: jwtEmail } = req;

    if (jwtEmail) {
      return this.handleWebConnect(jwtEmail, body.inviterId);
    }

    if (telegramId) {
      const email = body.email ?? '';
      return this.handleTelegramConnect(telegramId, email, body.inviterId);
    }

    return null;
  }

  private async handleWebConnect(
    email: string,
    inviterId?: number,
  ): Promise<CreateUserResponseDto | UpdateUserResponseDto | null> {
    const emailUsers = await this.userService.getUserByEmail(email);
    const user = this.first(emailUsers);
    if (user) return user;

    return this.userService.createUser({ email, inviterId });
  }

  private async handleTelegramConnect(
    telegramId: number,
    email: string,
    inviterId?: number,
  ): Promise<CreateUserResponseDto | UpdateUserResponseDto | null> {
    if (email) {
      const emailUsers = await this.userService.getUserByEmail(email);
      const emailUser = this.first(emailUsers);
      if (emailUser) {
        return this.userService.updateUser({ id: emailUser.id, telegramId, email });
      }
    }

    const tgUsers = await this.userService.getUserByTgId(telegramId);
    const tgUser = this.first(tgUsers);
    if (tgUser) {
      return email ? this.userService.updateUser({ id: tgUser.id, email }) : tgUser;
    }

    return this.userService.createUser({ email: email || undefined, telegramId, inviterId });
  }

  private first<T>(result: T | T[] | null): T | null {
    if (!result) return null;
    return Array.isArray(result) ? (result[0] ?? null) : result;
  }
}
