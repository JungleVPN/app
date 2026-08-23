import { Injectable } from '@nestjs/common';
import {
  GetSubpageConfigByShortUuidCommand,
  GetSubscriptionInfoByShortUuidCommand,
  GetSubpageConfigCommand,
} from '@workspace/types';
import { RemnaPanelClient } from '../common/remna-panel.client';

@Injectable()
export class SubscriptionService {
  constructor(private readonly panelClient: RemnaPanelClient) {}

  async getSubpageConfigByShortUuid(
    shortUuid: string,
  ): Promise<GetSubpageConfigByShortUuidCommand.Response['response']> {
    return this.panelClient.request<GetSubpageConfigByShortUuidCommand.Response['response']>({
      method: GetSubpageConfigByShortUuidCommand.endpointDetails.REQUEST_METHOD,
      url: GetSubpageConfigByShortUuidCommand.url(shortUuid),
      body: {
        requestHeaders: {
          additionalProperty: '',
        },
      },
    });
  }

  async getSubscriptionInfoByShortUuid(
    shortUuid: string,
  ): Promise<GetSubscriptionInfoByShortUuidCommand.Response['response']> {
    return this.panelClient.request<GetSubscriptionInfoByShortUuidCommand.Response['response']>({
      method: GetSubscriptionInfoByShortUuidCommand.endpointDetails.REQUEST_METHOD,
      url: GetSubscriptionInfoByShortUuidCommand.url(shortUuid),
    });
  }

  async getSubscriptionPageConfig(
    uuid: string,
  ): Promise<GetSubpageConfigCommand.Response['response']> {
    return this.panelClient.request<GetSubpageConfigCommand.Response['response']>({
      method: GetSubpageConfigCommand.endpointDetails.REQUEST_METHOD,
      url: GetSubpageConfigCommand.url(uuid),
    });
  }
}
