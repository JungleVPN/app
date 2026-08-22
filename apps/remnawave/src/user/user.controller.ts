import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import * as Remnawave from '@workspace/types';
import { UpdateUserResponseDto } from '@workspace/types';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { UserService } from './user.service';

@Controller('users')
@UseGuards(InterServiceGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAllUsers(): Promise<Remnawave.UserDto[]> {
    return this.userService.getAllUsers();
  }

  @Get('by-telegram-id/:telegramId')
  async getUserByTelegramId(
    @Param('telegramId') telegramId: Remnawave.CreateUserRequestDto['telegramId'],
  ): Promise<Remnawave.StreamedUserDto[] | null> {
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
      inviterId?: number;
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

  @Get(':userId')
  async getUserById(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<Remnawave.GetUserByIdResponseDto | null> {
    return this.userService.getUserById(userId);
  }

  @Patch(':userId/extra-device')
  async addExtraDevice(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<UpdateUserResponseDto> {
    return this.userService.addExtraDevice(userId);
  }

  @Patch(':userId/expiry')
  async updateExpiry(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: {
      months: number;
    },
  ): Promise<UpdateUserResponseDto> {
    return this.userService.updateExpiry(userId, body.months);
  }

  @Get(':userId/metadata')
  async getUserMetadata(@Param('userId', ParseIntPipe) userId: number) {
    return this.userService.getUserMetadata(userId);
  }

  @Put(':userId/metadata')
  async upsertUserMetadata(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { metadata: Record<string, unknown> },
  ): Promise<void> {
    return this.userService.upsertUserMetadata(userId, body.metadata);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('userId', ParseIntPipe) userId: number): Promise<void> {
    return this.userService.deleteUser(userId);
  }

  @Post(':userId/actions/revoke')
  async revokeSubscription(@Param('userId', ParseIntPipe) userId: number): Promise<string> {
    return this.userService.revokeSubscription(userId);
  }
}
