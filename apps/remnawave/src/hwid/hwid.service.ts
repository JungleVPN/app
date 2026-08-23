import { Injectable } from '@nestjs/common';
import {
  DeleteAllUserHwidDevicesCommand,
  DeleteUserHwidDeviceCommand,
  GetUserHwidDevicesCommand,
} from '@workspace/types';
import { RemnaPanelClient } from '../common/remna-panel.client';

@Injectable()
export class HwidService {
  constructor(private readonly panelClient: RemnaPanelClient) {}

  async getUserDevices(userId: number): Promise<GetUserHwidDevicesCommand.Response['response']> {
    return this.panelClient.request<GetUserHwidDevicesCommand.Response['response']>({
      method: GetUserHwidDevicesCommand.endpointDetails.REQUEST_METHOD,
      url: GetUserHwidDevicesCommand.url(String(userId)),
    });
  }

  async deleteUserDevice(
    userId: number,
    hwid: string,
  ): Promise<DeleteUserHwidDeviceCommand.Response['response']> {
    return this.panelClient.request<DeleteUserHwidDeviceCommand.Response['response']>({
      method: DeleteUserHwidDeviceCommand.endpointDetails.REQUEST_METHOD,
      url: DeleteUserHwidDeviceCommand.url,
      body: { userId, hwid } satisfies DeleteUserHwidDeviceCommand.RequestBody,
    });
  }

  async deleteAllUserDevices(
    userId: number,
  ): Promise<DeleteAllUserHwidDevicesCommand.Response['response']> {
    return this.panelClient.request<DeleteAllUserHwidDevicesCommand.Response['response']>({
      method: DeleteAllUserHwidDevicesCommand.endpointDetails.REQUEST_METHOD,
      url: DeleteAllUserHwidDevicesCommand.url,
      body: { userId } satisfies DeleteAllUserHwidDevicesCommand.RequestBody,
    });
  }
}
