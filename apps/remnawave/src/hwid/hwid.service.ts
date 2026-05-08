import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteAllUserHwidDevicesCommand,
  DeleteUserHwidDeviceCommand,
  GetUserHwidDevicesCommand,
} from '@workspace/types';
import { RemnaPanelClient } from '../common/remna-panel.client';

@Injectable()
export class HwidService {
  private readonly logger = new Logger(HwidService.name);

  constructor(private readonly panelClient: RemnaPanelClient) {}

  async getUserDevices(
    userUuid: string,
  ): Promise<GetUserHwidDevicesCommand.Response['response']> {
    return this.panelClient.request<GetUserHwidDevicesCommand.Response['response']>({
      method: GetUserHwidDevicesCommand.endpointDetails.REQUEST_METHOD,
      url: GetUserHwidDevicesCommand.url(userUuid),
    });
  }

  async deleteUserDevice(
    userUuid: string,
    hwid: string,
  ): Promise<DeleteUserHwidDeviceCommand.Response['response']> {
    return this.panelClient.request<DeleteUserHwidDeviceCommand.Response['response']>({
      method: DeleteUserHwidDeviceCommand.endpointDetails.REQUEST_METHOD,
      url: DeleteUserHwidDeviceCommand.url,
      body: { userUuid, hwid } satisfies DeleteUserHwidDeviceCommand.Request,
    });
  }

  async deleteAllUserDevices(
    userUuid: string,
  ): Promise<DeleteAllUserHwidDevicesCommand.Response['response']> {
    return this.panelClient.request<DeleteAllUserHwidDevicesCommand.Response['response']>({
      method: DeleteAllUserHwidDevicesCommand.endpointDetails.REQUEST_METHOD,
      url: DeleteAllUserHwidDevicesCommand.url,
      body: { userUuid } satisfies DeleteAllUserHwidDevicesCommand.Request,
    });
  }
}
