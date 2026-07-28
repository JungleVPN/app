import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  DeleteUserHwidDeviceCommand,
  GetUserHwidDevicesCommand,
  GetUserByUuidResponseDto,
  GetUserMetadataResponseDto,
  UpdateUserResponseDto,
} from '@workspace/types';
import type { AuthenticatedRequest } from '../auth/client-user.guard';
import { AuthenticatedUserId } from '../auth/authenticated-user.decorator';
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
 */
@Controller('users/me')
@UseGuards(ClientUserGuard)
export class MeController {
  constructor(
    private readonly userService: UserService,
    private readonly hwidService: HwidService,
  ) {}

  @Get()
  async getMe(
    @AuthenticatedUserId() userId: string,
  ): Promise<GetUserByUuidResponseDto | null> {
    return this.userService.getUserByUuid(userId);
  }

  @Patch()
  async updateMe(
    @AuthenticatedUserId() userId: string,
    @Body() body: Record<string, unknown>,
  ): Promise<UpdateUserResponseDto | null> {
    return this.userService.updateUser({ ...body, uuid: userId });
  }

  @Get('metadata')
  async getMetadata(
    @AuthenticatedUserId() userId: string,
  ): Promise<GetUserMetadataResponseDto | null> {
    return this.userService.getUserMetadata(userId);
  }

  @Put('metadata')
  @HttpCode(HttpStatus.OK)
  async upsertMetadata(
    @AuthenticatedUserId() userId: string,
    @Body() body: { metadata: Record<string, unknown> },
  ): Promise<void> {
    return this.userService.upsertUserMetadata(userId, body.metadata);
  }

  @Get('telegram-photo')
  async getTelegramPhoto(
    @AuthenticatedUserId() userId: string,
  ): Promise<{ photoUrl: string | null }> {
    const user = await this.userService.getUserByUuid(userId);
    const telegramId = (user as unknown as { telegramId?: string | number } | null)?.telegramId;
    if (!telegramId) return { photoUrl: null };
    return this.userService.getTelegramPhotoUrl(String(telegramId));
  }

  @Get('devices')
  async getDevices(
    @AuthenticatedUserId() userId: string,
  ): Promise<GetUserHwidDevicesCommand.Response['response'] | null> {
    return this.hwidService.getUserDevices(userId);
  }

  @Delete('devices/:hwid')
  @HttpCode(HttpStatus.OK)
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
   * account. One call replaces the old client-side
   * getUserByEmail → updateUser(existingUuid) dance.
   */
  @Post('link-email')
  @HttpCode(HttpStatus.OK)
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
