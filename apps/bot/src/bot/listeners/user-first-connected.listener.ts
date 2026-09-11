import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebHookEvent } from '@remna/remna.model';
import { UserDto } from '@workspace/types';
import { AnalyticsClientService } from '../../analytics/analytics-client.service';

type UserFirstConnectedPayload = {
  event: WebHookEvent;
  data: UserDto;
  timestamp: string;
};

@Injectable()
export class UserFirstConnectedListener {
  constructor(private readonly analyticsClient: AnalyticsClientService) {}

  @OnEvent('user.first_connected')
  async listenToUserFirstConnectedEvent(payload: UserFirstConnectedPayload) {
    if (payload.data.id == null) return;

    await this.analyticsClient.track({
      event: 'user_first_connected',
      userId: payload.data.id,
    });
  }
}
