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
} from '@nestjs/common';
import * as Remnawave from '@workspace/types';
import { AttributionPayload, UpdateUserResponseDto } from '@workspace/types';
import { UserService } from './user.service';

@Controller('users')
// @UseGuards(InterServiceGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAllUsers(): Promise<Remnawave.UserDto[]> {
    return this.userService.getAllUsers();
  }

  @Get('by-telegram-id/:telegramId')
  async getUserByTelegramId(
    @Param('telegramId') telegramId: Remnawave.CreateUserRequestDto['telegramId'],
  ): Promise<Remnawave.GetUserByTelegramIdResponseDto | null> {
    return this.userService.getUserByTgId(telegramId);
  }

  @Get('by-email/:email')
  async getUserByEmail(@Param('email') email: string) {
    return this.userService.getUserByEmail(email);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() body: Pick<Remnawave.CreateUserRequestDto, 'telegramId' | 'email' | 'description'> & {
      attribution?: AttributionPayload;
    },
  ): Promise<Remnawave.CreateUserResponseDto> {
    return this.userService.createUser(body);
  }

  @Patch()
  async updateUser(
    @Body() body: Remnawave.UpdateUserRequestDto,
  ): Promise<Remnawave.UpdateUserResponseDto> {
    return this.userService.updateUser(body);
  }

  @Get('telegram-photo/:telegramId')
  async getTelegramPhotoUrl(
    @Param('telegramId') telegramId: string,
  ): Promise<{ photoUrl: string | null }> {
    return this.userService.getTelegramPhotoUrl(telegramId);
  }

  @Get(':uuid')
  async getUserByUuid(
    @Param('uuid') uuid: string,
  ): Promise<Remnawave.GetUserByUuidResponseDto | null> {
    return this.userService.getUserByUuid(uuid);
  }

  @Patch(':uuid/extra-device')
  async addExtraDevice(@Param('uuid') uuid: string): Promise<UpdateUserResponseDto> {
    return this.userService.addExtraDevice(uuid);
  }

  @Patch(':uuid/expiry')
  async updateExpiry(
    @Param('uuid') uuid: string,
    @Body() body: {
      months: number;
    },
  ): Promise<UpdateUserResponseDto> {
    return this.userService.updateExpiry(uuid, body.months);
  }

  @Delete(':uuid')
  async deleteUser(@Param('uuid') uuid: string): Promise<Remnawave.DeleteUserResponseDto> {
    return this.userService.deleteUser(uuid);
  }

  @Post(':uuid/actions/revoke')
  async revokeSubscription(@Param('uuid') uuid: string): Promise<string> {
    return this.userService.revokeSubscription(uuid);
  }
}
