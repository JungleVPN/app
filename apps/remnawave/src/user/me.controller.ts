import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  DeleteUserHwidDeviceCommand,
  GetUserByUuidResponseDto,
  GetUserHwidDevicesCommand,
  GetUserMetadataResponseDto,
  UpdateUserResponseDto,
} from '@workspace/types';
import { AnyCredentialGuard, type AnyCredentialRequest } from '../auth/any-credential.guard';
import { AuthenticatedUserId } from '../auth/authenticated-user.decorator';
import type { AuthenticatedRequest } from '../auth/client-user.guard';
import { ClientUserGuard } from '../auth/client-user.guard';
import { HwidService } from '../hwid/hwid.service';
import { UserService } from './user.service';

/**
 * Client-facing routes for the authenticated user's own resources.
 * All handlers derive the user UUID from the validated credential —
 * no UUID is accepted from route params or request body.
 *
 * Must be registered BEFORE UserController so literal `/users/me` is
 * matched before the parameterised `/users/:uuid` route.
 *
 * Guard split:
 *   GET /users/me          → AnyCredentialGuard: credential-valid is enough; returns null
 *                            for new users so the frontend can redirect to onboarding.
 *   All other endpoints    → ClientUserGuard: user must already exist in the DB.
 */
@Controller('users/me')
export class MeController {
  constructor(
    private readonly userService: UserService,
    private readonly hwidService: HwidService,
  ) {}

  @Get()
  @UseGuards(AnyCredentialGuard)
  async getMe(@Req() req: AnyCredentialRequest): Promise<GetUserByUuidResponseDto | null> {
    if (req.authenticatedTelegramId != null) {
      const users = await this.userService.getUserByTgId(req.authenticatedTelegramId);
      const user = Array.isArray(users) ? users[0] : users;
      return user ?? null;
    }

    if (req.authenticatedEmail) {
      const users = await this.userService.getUserByEmail(req.authenticatedEmail);
      const user = Array.isArray(users) ? users[0] : users;
      return user ?? null;
    }

    return null;
  }

  @Patch()
  @UseGuards(ClientUserGuard)
  async updateMe(
    @AuthenticatedUserId() userId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<UpdateUserResponseDto | null> {
    return this.userService.updateUser({ ...body, uuid: userId });
  }

  @Get('metadata')
  @UseGuards(ClientUserGuard)
  async getMetadata(
    @AuthenticatedUserId() userId: string,
  ): Promise<GetUserMetadataResponseDto | null> {
    return this.userService.getUserMetadata(userId);
  }

  @Put('metadata')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClientUserGuard)
  async upsertMetadata(
    @AuthenticatedUserId() userId: string,
    @Body() body: { metadata: Record<string, unknown> },
  ): Promise<void> {
    return this.userService.upsertUserMetadata(userId, body.metadata);
  }

  @Get('telegram-photo')
  @UseGuards(ClientUserGuard)
  async getTelegramPhoto(
    @AuthenticatedUserId() userId: string,
  ): Promise<{ photoUrl: string | null }> {
    const user = await this.userService.getUserByUuid(userId);
    const telegramId = (user as unknown as { telegramId?: string | number } | null)?.telegramId;
    if (!telegramId) return { photoUrl: null };
    return this.userService.getTelegramPhotoUrl(String(telegramId));
  }

  @Get('devices')
  @UseGuards(ClientUserGuard)
  async getDevices(
    @AuthenticatedUserId() userId: string,
  ): Promise<GetUserHwidDevicesCommand.Response['response'] | null> {
    return this.hwidService.getUserDevices(userId);
  }

  @Delete('devices/:hwid')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClientUserGuard)
  async deleteDevice(
    @AuthenticatedUserId() userId: string,
    @Param('hwid') hwid: string,
  ): Promise<DeleteUserHwidDeviceCommand.Response['response'] | null> {
    return this.hwidService.deleteUserDevice(userId, hwid);
  }

  /**
   * Link an email address to the authenticated user.
   *
   * If a different account already owns the provided email, this endpoint
   * links the authenticated Telegram identity to that account and returns it
   * (the active account changes). Otherwise the email is saved on the current
   * account.
   */
  @Post('link-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClientUserGuard)
  async linkEmail(
    @AuthenticatedUserId() userId: string,
    @Body() body: { email: string },
    @Req() req: AuthenticatedRequest,
  ): Promise<UpdateUserResponseDto | null> {
    const telegramId = req.authenticatedTelegramId;

    const emailUsers = await this.userService.getUserByEmail(body.email);
    const emailUser = Array.isArray(emailUsers)
      ? emailUsers[0]
      : (emailUsers as { uuid?: string } | null);

    if (emailUser?.uuid && emailUser.uuid !== userId && telegramId) {
      return this.userService.updateUser({ uuid: emailUser.uuid, telegramId });
    }

    return this.userService.updateUser({ uuid: userId, email: body.email });
  }
}
