import { Controller, Delete, Get, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import {
  DeleteAllUserHwidDevicesCommand,
  DeleteUserHwidDeviceCommand,
  GetUserHwidDevicesCommand,
} from '@workspace/types';
import { InterServiceGuard } from '../guards/inter-service.guard';
import { HwidService } from './hwid.service';

@Controller('users/:userUuid/devices')
@UseGuards(InterServiceGuard)
export class HwidController {
  constructor(private readonly hwidService: HwidService) {}

  @Get()
  async getUserDevices(
    @Param('userUuid') userUuid: string,
  ): Promise<GetUserHwidDevicesCommand.Response['response']> {
    return this.hwidService.getUserDevices(userUuid);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteAllUserDevices(
    @Param('userUuid') userUuid: string,
  ): Promise<DeleteAllUserHwidDevicesCommand.Response['response']> {
    return this.hwidService.deleteAllUserDevices(userUuid);
  }

  @Delete(':hwid')
  @HttpCode(HttpStatus.OK)
  async deleteUserDevice(
    @Param('userUuid') userUuid: string,
    @Param('hwid') hwid: string,
  ): Promise<DeleteUserHwidDeviceCommand.Response['response']> {
    return this.hwidService.deleteUserDevice(userUuid, hwid);
  }
}
