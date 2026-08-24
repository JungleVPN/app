import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  DeleteAllUserHwidDevicesCommand,
  DeleteUserHwidDeviceCommand,
  GetUserHwidDevicesCommand,
} from '@workspace/types';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { HwidService } from './hwid.service';

@Controller('users/:userId/devices')
@UseGuards(InterServiceGuard)
export class HwidController {
  constructor(private readonly hwidService: HwidService) {}

  @Get()
  async getUserDevices(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<GetUserHwidDevicesCommand.Response['response']> {
    return this.hwidService.getUserDevices(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteAllUserDevices(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<DeleteAllUserHwidDevicesCommand.Response['response']> {
    return this.hwidService.deleteAllUserDevices(userId);
  }

  @Delete(':hwid')
  @HttpCode(HttpStatus.OK)
  async deleteUserDevice(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('hwid') hwid: string,
  ): Promise<DeleteUserHwidDeviceCommand.Response['response']> {
    return this.hwidService.deleteUserDevice(userId, hwid);
  }
}
